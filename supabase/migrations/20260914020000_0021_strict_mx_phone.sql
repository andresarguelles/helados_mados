-- 0021 — El telefono se valida por pais, no con un E.164 generico.
--
-- Hasta aqui las tres capas (el CHECK de la tabla, complete_signup y update_my_profile) compartian
-- el mismo regex '^\+[1-9]\d{7,14}$', que solo exige entre 8 y 15 digitos SIN mirar el pais. Un
-- +52 seguido de 9 digitos son 11 en total, asi que pasaba: se registro una cuenta real con
-- +52228197011, un numero al que WhatsApp nunca va a poder entregar nada. Como mandar promociones
-- por WhatsApp es el objetivo del proyecto, un numero que no existe es una cuenta perdida.
--
-- A partir de aqui la regla es por lada y vive en UN solo lugar, public.phone_is_valid().

-- ─── 1. La regla ─────────────────────────────────────────────────────────────
-- Lista blanca: lo que no este en el CASE no entra. Sumar un pais es sumar un WHEN, y por eso la
-- forma es un CASE y no un regex suelto.
create or replace function public.phone_is_valid(p_phone text)
returns boolean
language sql
-- No lee tablas ni usa now(): inmutable de verdad, que es lo que un CHECK exige.
immutable
set search_path = ''
as $fn$
  select case
    -- Mexico: NSN de exactamente 10 digitos. El primero es 2-9 porque ninguna lada mexicana
    -- empieza en 0 ni en 1; de paso eso rechaza el viejo prefijo movil +521 que WhatsApp todavia
    -- muestra al copiar un contacto (el cliente lo normaliza quitando ese 1 antes de enviarlo).
    when p_phone like '+52%' then p_phone ~ '^\+52[2-9]\d{9}$'
    else false
  end
$fn$;

comment on function public.phone_is_valid(text) is
  'Unica definicion de "telefono valido" del backend. Su espejo en el cliente es PHONE_COUNTRIES en src/lib/phone.ts; los dos cambian juntos.';

revoke all on function public.phone_is_valid(text) from public, anon;
grant execute on function public.phone_is_valid(text) to authenticated;

-- ─── 2. El CHECK de la tabla ─────────────────────────────────────────────────
-- ADD CONSTRAINT valida las filas existentes, asi que esto falla ruidosamente si quedara algun
-- numero viejo que no cumpla. Es deliberado: preferimos enterarnos aqui y no en silencio.
--
-- OJO para el futuro: un CHECK que llama a una funcion NO revalida las filas ya guardadas si la
-- funcion cambia despues. Sumar un pais es seguro porque solo amplia lo aceptado; endurecer la
-- regla obliga a revalidar la tabla a mano.
alter table public.profiles drop constraint if exists profiles_phone_e164;

alter table public.profiles
  add constraint profiles_phone_valid
  check (phone is null or public.phone_is_valid(phone));

-- ─── 3. complete_signup(): misma funcion, misma razon 'invalid_phone' ────────
-- Identica a la de 0019 salvo la linea de validacion del telefono. El contrato con el cliente no
-- cambia: sigue devolviendo 'invalid_phone'.
create or replace function public.complete_signup(
  p_username         text,
  p_phone            text,
  p_whatsapp_opt_in  boolean
)
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_user_id    uuid := auth.uid();
  v_username   text := trim(coalesce(p_username, ''));
  v_phone      text := nullif(trim(coalesce(p_phone, '')), '');
  v_existing   citext;
  v_found      boolean;
  v_constraint text;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  if length(v_username) < 3 then
    return jsonb_build_object('success', false, 'reason', 'too_short');
  end if;

  -- El consentimiento es requisito para existir, no una casilla opcional: es lo que respalda mandarle
  -- publicidad despues. Se guarda con fecha en whatsapp_opt_in_at.
  if not coalesce(p_whatsapp_opt_in, false) then
    return jsonb_build_object('success', false, 'reason', 'consent_required');
  end if;

  if v_phone is null or not public.phone_is_valid(v_phone) then
    return jsonb_build_object('success', false, 'reason', 'invalid_phone');
  end if;

  select username, true into v_existing, v_found from public.profiles where id = v_user_id;
  if not coalesce(v_found, false) then
    return jsonb_build_object('success', false, 'reason', 'error');
  end if;

  -- Sin esto la RPC seria un renombrador encubierto; el apodo es la identidad publica del ranking.
  if v_existing is not null then
    return jsonb_build_object('success', false, 'reason', 'already_set');
  end if;

  update public.profiles set
    username           = v_username::citext,
    phone              = v_phone,
    whatsapp_opt_in    = true,
    whatsapp_opt_in_at = now()
  where id = v_user_id;

  return jsonb_build_object('success', true);

-- Hay dos indices unicos en juego (apodo y telefono) y el mensaje al usuario debe decir cual choco,
-- no un "algo salio mal" generico. CONSTRAINT_NAME es la unica forma fiable de distinguirlos.
exception when unique_violation then
  get stacked diagnostics v_constraint = constraint_name;
  return jsonb_build_object(
    'success', false,
    'reason', case when v_constraint = 'profiles_phone_key' then 'phone_taken' else 'username_taken' end
  );
end;
$$;

revoke all on function public.complete_signup(text, text, boolean) from public, anon;
grant execute on function public.complete_signup(text, text, boolean) to authenticated;

-- ─── 4. update_my_profile(): idem ────────────────────────────────────────────
-- Es tambien la puerta por la que un cadete legacy da su numero por primera vez, asi que la regla
-- nueva aplica igual ahi.
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
  v_current text;
  v_profile public.profiles;
  v_awarded int := 0;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  if v_phone is not null and not public.phone_is_valid(v_phone) then
    return jsonb_build_object('success', false, 'reason', 'invalid_phone');
  end if;

  if p_birthdate is not null and (p_birthdate <= date '1900-01-01' or p_birthdate >= current_date) then
    return jsonb_build_object('success', false, 'reason', 'invalid_birthdate');
  end if;

  select phone into v_current from public.profiles where id = v_user_id;

  -- Una vez dado, el numero es fijo. `is distinct from` para que mandar null tambien cuente como
  -- intento de borrarlo y se rechace igual.
  if v_current is not null and v_phone is distinct from v_current then
    return jsonb_build_object('success', false, 'reason', 'phone_immutable');
  end if;

  -- Sin telefono no hay a donde mandar promociones.
  if v_optin and v_phone is null then
    return jsonb_build_object('success', false, 'reason', 'optin_without_phone');
  end if;

  update public.profiles p set
    first_name = v_first,
    last_name  = v_last,
    birthdate  = p_birthdate,
    phone      = v_phone,
    whatsapp_opt_in = v_optin,
    -- Se sella cuando se dio el consentimiento; al revocarlo se limpia.
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

  -- Bono unico por perfil completo. El correo no cuenta aqui: tiene su propio bono al vincular Google.
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
exception when unique_violation then
  -- Un legacy agregando un numero que ya registro otra cuenta.
  return jsonb_build_object('success', false, 'reason', 'phone_taken');
end;
$$;

revoke all on function public.update_my_profile(text, text, date, text, boolean) from public, anon;
grant execute on function public.update_my_profile(text, text, date, text, boolean) to authenticated;
