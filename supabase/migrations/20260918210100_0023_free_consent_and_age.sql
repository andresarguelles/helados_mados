-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  NO APLICAR TODAVIA. Esta migracion ROMPE a los clientes desplegados.     │
-- │                                                                          │
-- │  Se aplica en el mismo momento en que se despliegan la web y el APK que   │
-- │  ya llaman a la firma nueva. Aplicarla antes deja las altas caidas.       │
-- └──────────────────────────────────────────────────────────────────────────┘

-- 0023 — El consentimiento vuelve a ser libre, y el alta declara mayoria de edad.
--
-- DOS CAMBIOS, y el primero revierte a proposito una decision de la 0019.
--
-- 1. La 0019 hizo obligatoria la casilla de mensajes de WhatsApp para poder crear la
--    cuenta. La razon de negocio era buena: WhatsApp es el canal para avisar de las
--    dinamicas. Pero la LFPDPPP define el consentimiento como manifestacion de la
--    voluntad LIBRE (art. 2), y condicionar el alta a aceptar publicidad es exactamente
--    lo que esa palabra excluye. Un consentimiento forzado no es que valga menos: es que
--    no es consentimiento, y arrastra a todo el aviso.
--
--    El TELEFONO sigue siendo obligatorio, y eso si se sostiene: su finalidad es
--    antifraude (un numero, una cuenta, para que nadie acumule puntos de un mismo Live
--    con varias cuentas de Gmail). Esa finalidad es necesaria para prestar el servicio y
--    no depende de una casilla. Lo que deja de ser obligatorio es MANDARLE PUBLICIDAD.
--
--    Coste real medido antes de hacerlo: solo 3 de 178 perfiles han pasado por este flujo,
--    asi que cambiarlo nunca va a ser mas barato que hoy.
--
-- 2. La app se anuncia en TikTok Live y no tenia ninguna barrera de edad, aunque pide
--    nombre, telefono y fecha de nacimiento. A partir de aqui el alta exige declarar 18
--    anios cumplidos, y una fecha de nacimiento de menor se rechaza en el servidor: sin
--    eso, la declaracion y el dato guardado podrian contradecirse y la casilla seria
--    decorativa.
--
-- Ademas, el alta registra la aceptacion del texto legal en la MISMA transaccion: una
-- cuenta no puede existir sin constancia de que su dueno acepto los documentos.

-- ─── 1. Sello de la declaracion de edad ──────────────────────────────────────
alter table public.profiles
  add column if not exists age_confirmed_at timestamptz;

comment on column public.profiles.age_confirmed_at is
  'Cuando el usuario declaro tener 18 anios cumplidos. Null en las cuentas anteriores a la 0023.';

-- ─── 2. La edad minima, en un solo lugar ─────────────────────────────────────
create or replace function public.is_adult(p_birthdate date)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_birthdate is null or p_birthdate <= (current_date - interval '18 years')
$$;

comment on function public.is_adult(date) is
  'Unica definicion de mayoria de edad del backend. Null cuenta como valido: la fecha de nacimiento es opcional.';

revoke all on function public.is_adult(date) from public, anon;
grant execute on function public.is_adult(date) to authenticated;

-- ─── 3. complete_signup() ────────────────────────────────────────────────────
-- Se ELIMINA la firma vieja en vez de dejarla como sobrecarga. Si se quedara, seguiria
-- siendo llamable y permitiria crear cuentas saltandose la edad y la aceptacion legal:
-- una puerta trasera abierta por descuido.
drop function if exists public.complete_signup(text, text, boolean);

create or replace function public.complete_signup(
  p_username         text,
  p_phone            text,
  p_whatsapp_opt_in  boolean,
  p_age_confirmed    boolean,
  p_legal            jsonb,
  p_platform         text
)
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_user_id    uuid := auth.uid();
  v_username   text := trim(coalesce(p_username, ''));
  v_phone      text := nullif(trim(coalesce(p_phone, '')), '');
  v_optin      boolean := coalesce(p_whatsapp_opt_in, false);
  v_platform   text := lower(coalesce(p_platform, ''));
  v_existing   citext;
  v_found      boolean;
  v_constraint text;
  v_doc        jsonb;
  v_faltan     int;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  if v_platform not in ('web', 'android') then
    return jsonb_build_object('success', false, 'reason', 'invalid_platform');
  end if;

  if length(v_username) < 3 then
    return jsonb_build_object('success', false, 'reason', 'too_short');
  end if;

  -- 18 anios cumplidos. Es una declaracion del usuario, no una verificacion — pero una
  -- declaracion expresa es la diferencia entre "no lo sabiamos" y "no preguntamos".
  if not coalesce(p_age_confirmed, false) then
    return jsonb_build_object('success', false, 'reason', 'age_required');
  end if;

  -- El telefono sigue siendo requisito: su finalidad es antifraude, no publicidad.
  if v_phone is null or not public.phone_is_valid(v_phone) then
    return jsonb_build_object('success', false, 'reason', 'invalid_phone');
  end if;

  -- Ya NO hay 'consent_required': ver la cabecera de esta migracion.

  if p_legal is null or jsonb_typeof(p_legal) <> 'array' then
    return jsonb_build_object('success', false, 'reason', 'legal_required');
  end if;

  -- Cada terna tiene que existir tal cual en legal_versions. El hash importa: sin el, un
  -- cliente viejo registraria "acepte la 2.0.0" mostrando un texto que ya no es la 2.0.0.
  for v_doc in select * from jsonb_array_elements(p_legal) loop
    if not exists (
      select 1 from public.legal_versions lv
      where lv.doc_id   = v_doc->>'doc_id'
        and lv.version  = v_doc->>'version'
        and lv.ast_hash = v_doc->>'ast_hash'
    ) then
      return jsonb_build_object('success', false, 'reason', 'unknown_version',
                                'doc_id', v_doc->>'doc_id');
    end if;
  end loop;

  -- Y tienen que estar TODOS los documentos vigentes, no solo los que el cliente decida.
  select count(*) into v_faltan
  from public.legal_current_versions() c
  where not exists (
    select 1 from jsonb_array_elements(p_legal) d
    where d->>'doc_id' = c.doc_id and d->>'version' = c.version
  );
  if v_faltan > 0 then
    return jsonb_build_object('success', false, 'reason', 'legal_incomplete');
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
    whatsapp_opt_in    = v_optin,
    whatsapp_opt_in_at = case when v_optin then now() else null end,
    age_confirmed_at   = now()
  where id = v_user_id;

  -- Misma transaccion que el alta: una cuenta no existe sin constancia de aceptacion.
  insert into public.legal_acceptances (user_id, doc_id, version, ast_hash, platform)
  select v_user_id, d->>'doc_id', d->>'version', d->>'ast_hash', v_platform
  from jsonb_array_elements(p_legal) d;

  return jsonb_build_object('success', true);

-- Hay dos indices unicos en juego (apodo y telefono) y el mensaje al usuario debe decir cual
-- choco, no un "algo salio mal" generico.
exception when unique_violation then
  get stacked diagnostics v_constraint = constraint_name;
  return jsonb_build_object(
    'success', false,
    'reason', case when v_constraint = 'profiles_phone_key' then 'phone_taken' else 'username_taken' end
  );
end;
$$;

revoke all on function public.complete_signup(text, text, boolean, boolean, jsonb, text) from public, anon;
grant execute on function public.complete_signup(text, text, boolean, boolean, jsonb, text) to authenticated;

-- ─── 4. update_my_profile(): la fecha de nacimiento no puede ser de un menor ─
-- Identica a la de 0021 salvo la validacion de edad. El resto del contrato no cambia.
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

  -- El servicio es para mayores de 18. Sin esto, la casilla del alta seria decorativa: se
  -- podria declarar mayoria de edad y guardar despues una fecha que dice lo contrario.
  if not public.is_adult(p_birthdate) then
    return jsonb_build_object('success', false, 'reason', 'underage');
  end if;

  select phone into v_current from public.profiles where id = v_user_id;

  -- Una vez dado, el numero es fijo. `is distinct from` para que mandar null tambien cuente
  -- como intento de borrarlo y se rechace igual.
  if v_current is not null and v_phone is distinct from v_current then
    return jsonb_build_object('success', false, 'reason', 'phone_immutable');
  end if;

  -- Sin telefono no hay a donde mandar los mensajes.
  if v_optin and v_phone is null then
    return jsonb_build_object('success', false, 'reason', 'optin_without_phone');
  end if;

  update public.profiles p set
    first_name = v_first,
    last_name  = v_last,
    birthdate  = p_birthdate,
    phone      = v_phone,
    whatsapp_opt_in = v_optin,
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
  return jsonb_build_object('success', false, 'reason', 'phone_taken');
end;
$$;

revoke all on function public.update_my_profile(text, text, date, text, boolean) from public, anon;
grant execute on function public.update_my_profile(text, text, date, text, boolean) to authenticated;
