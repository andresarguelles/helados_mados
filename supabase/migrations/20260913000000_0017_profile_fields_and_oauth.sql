-- 0017: Google SSO como único registro + campos de perfil.
--
-- Contexto:
--   * El alta con apodo+contraseña queda deshabilitada (el candado real es "Allow new users to sign up"
--     apagado en el proveedor Email del dashboard). El login con contraseña sigue vivo para los legacy.
--   * handle_new_user() insertaba raw_user_meta_data->>'username' en una columna NOT NULL. Un signup de
--     Google no trae esa llave, así que el INSERT en auth.users se revertía y GoTrue respondía
--     "Database error saving new user". Por eso username pasa a ser nullable y se pide en /bienvenida.
--   * profiles.email SOLO se llena desde una identidad de Google (trigger sobre auth.identities).
--     Ningún camino del cliente puede escribirlo.

-- ─── 1. username nullable ────────────────────────────────────────────────────
-- Las cuentas nacidas por OAuth no tienen apodo hasta que el usuario lo elige.
-- El índice único tolera múltiples NULL, así que no hay conflicto.
alter table public.profiles alter column username drop not null;

-- ─── 2. Columnas de perfil ───────────────────────────────────────────────────
alter table public.profiles
  add column first_name            text,
  add column last_name             text,
  add column birthdate             date,
  add column phone                 text,
  add column email                 text,
  add column avatar_url            text,
  add column whatsapp_opt_in       boolean not null default false,
  add column whatsapp_opt_in_at    timestamptz,
  add column profile_bonus_awarded boolean not null default false,
  add column google_bonus_awarded  boolean not null default false;

comment on column public.profiles.email is
  'Correo verificado por Google. INVARIANTE: solo lo escribe handle_identity_linked(); no existe ningun camino desde el cliente, por eso todo correo aqui esta verificado. Se conserva si el usuario desvincula Google, para no dejarlo sin recuperacion de contrasena.';
comment on column public.profiles.whatsapp_opt_in_at is
  'Momento en que se otorgo el consentimiento de WhatsApp. Requerido por el aviso de privacidad para poder demostrarlo.';

alter table public.profiles
  add constraint profiles_phone_e164
    check (phone is null or phone ~ '^\+[1-9]\d{7,14}$'),
  add constraint profiles_birthdate_sane
    check (birthdate is null or (birthdate > date '1900-01-01' and birthdate < current_date));

-- Promos de cumpleaños: buscar por (mes, día) ignorando el año.
create index profiles_birthday_idx
  on public.profiles ((extract(month from birthdate)), (extract(day from birthdate)))
  where birthdate is not null;

-- ─── 3. handle_new_user(): solo crea la fila ─────────────────────────────────
-- Correo, nombre y avatar los pone handle_identity_linked() para no tener dos fuentes de verdad.
-- La rama de username queda por si se crean cuentas a mano desde el dashboard.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, username)
  values (new.id, nullif(trim(v_meta->>'username'), '')::citext);
  return new;
end;
$$;

-- ─── 4. handle_identity_linked(): única puerta de entrada del correo ─────────
-- on_auth_user_created es AFTER INSERT ON auth.users, así que NO se dispara al vincular una identidad
-- a una cuenta existente (eso inserta en auth.identities). Este trigger cubre los dos casos: el alta
-- con Google (la identidad nace junto al usuario) y la vinculación posterior de un legacy.
create or replace function public.handle_identity_linked()
returns trigger
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_data jsonb := coalesce(new.identity_data, '{}'::jsonb);
begin
  if new.provider <> 'google' then
    return new;
  end if;

  update public.profiles set
    -- Google es la fuente de verdad del correo: se refresca siempre.
    email      = coalesce(nullif(v_data->>'email', ''), email),
    -- Estos no pisan lo que el usuario ya escribió a mano.
    first_name = coalesce(first_name, nullif(trim(v_data->>'given_name'), '')),
    last_name  = coalesce(last_name,  nullif(trim(v_data->>'family_name'), '')),
    avatar_url = coalesce(nullif(v_data->>'avatar_url', ''), nullif(v_data->>'picture', ''), avatar_url)
  where id = new.user_id;

  return new;
end;
$$;

create trigger on_auth_identity_created
  after insert on auth.identities
  for each row execute function public.handle_identity_linked();

revoke execute on function public.handle_identity_linked() from public, anon, authenticated;

-- Backfill de las identidades de Google que se vincularon ANTES de que existiera el trigger.
-- El trigger solo corre en INSERT, asi que sin esto esas cuentas se quedarian sin correo para siempre.
-- Es idempotente: repetirlo no cambia nada.
update public.profiles p set
  email      = coalesce(nullif(i.identity_data->>'email', ''), p.email),
  first_name = coalesce(p.first_name, nullif(trim(i.identity_data->>'given_name'), '')),
  last_name  = coalesce(p.last_name,  nullif(trim(i.identity_data->>'family_name'), '')),
  avatar_url = coalesce(
    nullif(i.identity_data->>'avatar_url', ''),
    nullif(i.identity_data->>'picture', ''),
    p.avatar_url
  )
from auth.identities i
where i.user_id = p.id and i.provider = 'google';

-- ─── 5. claim_username(): el apodo se elige una sola vez ─────────────────────
create or replace function public.claim_username(p_username text)
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_user_id  uuid := auth.uid();
  v_trimmed  text := trim(coalesce(p_username, ''));
  v_existing citext;
  v_found    boolean;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  if length(v_trimmed) < 3 then
    return jsonb_build_object('success', false, 'reason', 'too_short');
  end if;

  select username, true into v_existing, v_found from public.profiles where id = v_user_id;
  if not coalesce(v_found, false) then
    return jsonb_build_object('success', false, 'reason', 'error');
  end if;

  -- Sin esto la RPC sería un renombrador encubierto; el apodo es la identidad pública del ranking.
  if v_existing is not null then
    return jsonb_build_object('success', false, 'reason', 'already_set');
  end if;

  update public.profiles set username = v_trimmed::citext where id = v_user_id;
  return jsonb_build_object('success', true);
exception when unique_violation then
  return jsonb_build_object('success', false, 'reason', 'username_taken');
end;
$$;

revoke all on function public.claim_username(text) from public, anon;
grant execute on function public.claim_username(text) to authenticated;

-- ─── 6. update_my_profile(): datos que el usuario sí puede escribir ──────────
-- No recibe correo a propósito: ese solo puede venir de Google.
-- Tampoco toca total_points, is_admin, username ni id. Una policy `for update` no serviría: RLS evalúa
-- filas completas, no columnas, así que dejaría a cualquiera ponerse is_admin = true.
create or replace function public.update_my_profile(
  p_first_name       text,
  p_last_name        text,
  p_birthdate        date,
  p_phone            text,
  p_whatsapp_opt_in  boolean
)
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_first   text := nullif(trim(coalesce(p_first_name, '')), '');
  v_last    text := nullif(trim(coalesce(p_last_name, '')), '');
  v_phone   text := nullif(trim(coalesce(p_phone, '')), '');
  v_optin   boolean := coalesce(p_whatsapp_opt_in, false);
  v_profile public.profiles;
  v_awarded int := 0;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  if v_phone is not null and v_phone !~ '^\+[1-9]\d{7,14}$' then
    return jsonb_build_object('success', false, 'reason', 'invalid_phone');
  end if;

  if p_birthdate is not null and (p_birthdate <= date '1900-01-01' or p_birthdate >= current_date) then
    return jsonb_build_object('success', false, 'reason', 'invalid_birthdate');
  end if;

  -- Sin teléfono no hay a dónde mandar promociones.
  if v_optin and v_phone is null then
    return jsonb_build_object('success', false, 'reason', 'optin_without_phone');
  end if;

  update public.profiles p set
    first_name = v_first,
    last_name  = v_last,
    birthdate  = p_birthdate,
    phone      = v_phone,
    whatsapp_opt_in = v_optin,
    -- Se sella cuándo se dio el consentimiento; al revocarlo se limpia.
    whatsapp_opt_in_at = case
      when v_optin and not p.whatsapp_opt_in then now()
      when v_optin then p.whatsapp_opt_in_at
      else null
    end
  where p.id = v_user_id
  returning p.* into v_profile;

  if v_profile.id is null then
    return jsonb_build_object('success', false, 'reason', 'error');
  end if;

  -- Bono único por perfil completo. El correo no cuenta aquí: tiene su propio bono al vincular Google.
  if not v_profile.profile_bonus_awarded
     and v_profile.first_name is not null
     and v_profile.last_name  is not null
     and v_profile.birthdate  is not null
     and v_profile.phone      is not null
  then
    update public.profiles
      set total_points = total_points + 5, profile_bonus_awarded = true
      where id = v_user_id;
    v_awarded := 5;
  end if;

  return jsonb_build_object('success', true, 'points_awarded', v_awarded);
end;
$$;

revoke all on function public.update_my_profile(text, text, date, text, boolean) from public, anon;
grant execute on function public.update_my_profile(text, text, date, text, boolean) to authenticated;

-- ─── 7. claim_google_bonus(): +5 una sola vez, verificado en el servidor ─────
create or replace function public.claim_google_bonus()
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_awarded int := 0;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  -- No se le cree al cliente que vinculó: se comprueba contra auth.identities.
  if not exists (
    select 1 from auth.identities
    where user_id = v_user_id and provider = 'google'
  ) then
    return jsonb_build_object('success', false, 'reason', 'not_linked');
  end if;

  update public.profiles
    set total_points = total_points + 5, google_bonus_awarded = true
    where id = v_user_id and google_bonus_awarded = false;

  if found then
    v_awarded := 5;
  end if;

  return jsonb_build_object('success', true, 'points_awarded', v_awarded);
end;
$$;

revoke all on function public.claim_google_bonus() from public, anon;
grant execute on function public.claim_google_bonus() to authenticated;

-- ─── 8. get_leaderboard(): ocultar a quien aún no eligió apodo ───────────────
-- Un registro de Google a medias tiene username NULL y aparecería como fila vacía en el ranking.
create or replace function public.get_leaderboard(p_period text default 'all')
returns table(user_id uuid, username citext, points integer)
language plpgsql stable security definer set search_path = public, extensions
as $$
declare
  v_tz constant text := 'America/Mexico_City';
  v_local_date date;
  v_start timestamptz;
  v_end timestamptz;
  v_dow int;
  v_days_since_saturday int;
begin
  if p_period = 'all' then
    return query
      select p.id, p.username, p.total_points
      from public.profiles p
      where p.is_admin = false and p.username is not null
      order by p.total_points desc;
  else
    v_local_date := (now() at time zone v_tz)::date;

    if p_period = 'day' then
      v_start := (v_local_date::timestamp) at time zone v_tz;
      v_end := v_start + interval '1 day';
    elsif p_period = 'week' then
      v_dow := extract(dow from v_local_date)::int; -- 0=sun .. 6=sat
      v_days_since_saturday := (v_dow + 1) % 7; -- sat=0, sun=1, ..., fri=6
      v_start := ((v_local_date - v_days_since_saturday)::timestamp) at time zone v_tz;
      v_end := v_start + interval '7 days';
    else
      v_start := (date_trunc('month', v_local_date)::timestamp) at time zone v_tz;
      v_end := v_start + interval '1 month';
    end if;

    return query
      select p.id, p.username,
        sum((case when c.digital_awarded then 1 else 0 end) + (case when c.physical_awarded then 10 else 0 end))::int
      from public.coupons c join public.profiles p on p.id = c.user_id
      where c.created_at >= v_start and c.created_at < v_end
        and p.is_admin = false and p.username is not null
      group by p.id, p.username
      having sum((case when c.digital_awarded then 1 else 0 end) + (case when c.physical_awarded then 10 else 0 end)) > 0
      order by 3 desc;
  end if;
end;
$$;

-- ─── 9. redeem_keyword(): no dejar canjear sin apodo ────────────────────────
-- /bienvenida es un gate de cliente. Alguien que abandone ahí y vuelva directo a /canjear podría
-- generar un cupón sin apodo, que luego el mostrador no sabría a nombre de quién mostrar.
create or replace function public.redeem_keyword(p_keyword text, p_ip_hash text)
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_dynamic public.dynamics;
  v_coupon  public.coupons;
  v_ip_count int;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  if not exists (select 1 from public.profiles where id = v_user_id and username is not null) then
    return jsonb_build_object('success', false, 'reason', 'no_username');
  end if;

  select * into v_dynamic from public.dynamics
    where keyword = p_keyword::citext and starts_at <= now() and ends_at > now()
    limit 1;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'invalid');
  end if;

  if exists (select 1 from public.coupons where user_id = v_user_id and dynamic_id = v_dynamic.id) then
    return jsonb_build_object('success', false, 'reason', 'already_redeemed');
  end if;

  insert into public.ip_redemption_logs (ip_hash, dynamic_id, count, first_seen, last_seen)
    values (p_ip_hash, v_dynamic.id, 1, now(), now())
  on conflict (ip_hash, dynamic_id) do update
    set count = public.ip_redemption_logs.count + 1, last_seen = now()
    where public.ip_redemption_logs.count < 3
  returning count into v_ip_count;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'ip_limit');
  end if;

  begin
    insert into public.coupons (user_id, dynamic_id, status, digital_awarded, physical_awarded)
      values (v_user_id, v_dynamic.id, 'active', true, false)
      returning * into v_coupon;
  exception when unique_violation then
    return jsonb_build_object('success', false, 'reason', 'already_redeemed');
  end;

  update public.profiles set total_points = total_points + 1 where id = v_user_id;

  return jsonb_build_object('success', true, 'coupon', to_jsonb(v_coupon));
end;
$$;

-- ─── 10. scan_coupon(): dejar de devolver la fila completa del perfil ────────
-- to_jsonb(v_profile) mandaba teléfono, cumpleaños y correo al dispositivo del mostrador en cada escaneo.
create or replace function public.scan_coupon(p_coupon_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_coupon  public.coupons;
  v_dynamic public.dynamics;
  v_profile public.profiles;
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'reason', 'forbidden');
  end if;

  select * into v_coupon from public.coupons where id = p_coupon_id for update;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;
  if v_coupon.status = 'redeemed' or v_coupon.physical_awarded then
    return jsonb_build_object('success', false, 'reason', 'already_used');
  end if;

  select * into v_dynamic from public.dynamics where id = v_coupon.dynamic_id for update;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;

  if v_dynamic.ends_at < now() then
    update public.coupons set status = 'expired' where id = p_coupon_id;
    return jsonb_build_object('success', false, 'reason', 'expired');
  end if;
  if v_dynamic.physical_redeemed >= v_dynamic.physical_stock then
    return jsonb_build_object('success', false, 'reason', 'stock_empty');
  end if;

  update public.coupons
    set status = 'redeemed', physical_awarded = true, redeemed_at = now()
    where id = p_coupon_id;
  update public.dynamics set physical_redeemed = physical_redeemed + 1
    where id = v_dynamic.id returning * into v_dynamic;
  update public.profiles set total_points = total_points + 10
    where id = v_coupon.user_id returning * into v_profile;

  return jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_profile.id,
      'username', v_profile.username,
      'total_points', v_profile.total_points
    ),
    'dynamic', to_jsonb(v_dynamic)
  );
end;
$$;
