-- 0040 — WhatsApp opcional y editable, cumpleanios sin anio, y sin puntos por darse de alta.
--
-- Tres decisiones del duenio (2026-10-01), que van juntas porque las tres cambian lo que el
-- aviso de privacidad 4.0.0 y los terminos 3.0.0 dicen de la cuenta:
--
-- 1. EL NUMERO DE WHATSAPP DEJA DE SER OBLIGATORIO Y SE PUEDE CAMBIAR. Desde la 0019 era
--    requisito del alta y, una vez dado, fijo (`phone_immutable`): la idea era "un numero,
--    una cuenta" contra quien abre varias cuentas de Gmail. Ahora el alta no lo pide y el
--    usuario lo agrega, lo cambia o lo borra desde su perfil.
--
--    El indice unico `profiles_phone_key` SE QUEDA: un mismo numero no puede estar en dos
--    cuentas. Siendo opcional ya no frena a quien abre varias cuentas sin dar numero; eso se
--    acepto a sabiendas.
--
-- 2. CUMPLEANIOS, NO FECHA DE NACIMIENTO. Solo interesa el dia y el mes, para felicitar.
--    El anio no se pide, y el de las fechas ya guardadas se borra en la 0042. Sin anio ya no
--    hay edad que calcular, asi que `is_adult` se va (tambien en la 0042): la mayoria de edad
--    queda en la casilla del alta, que es una declaracion y siempre lo fue.
--
-- 3. SIN BONOS DE ALTA. Se acaban el +5 por completar el perfil y el +5 por el primer
--    acceso con Google: toda cuenta nueva empieza en cero. Los puntos ya entregados se
--    quedan, y las columnas `profile_bonus_awarded` / `google_bonus_awarded` tambien, como
--    historial de a quien se le dieron.
--
-- ESTA MIGRACION SOLO AGREGA. Todo lo que se borra va en la 0042, que se aplica despues del
-- despliegue de la web, por dos razones. Una: mientras sale la web nueva, la vieja sigue
-- llamando a `update_my_profile(..., p_birthdate date, ...)`, a `claim_google_bonus` y leyendo
-- `birthdate`; dejarlos vivos hace que la transicion no rompa nada. Dos: los terminos 2.4.0,
-- vigentes hasta que se publica la 3.0.0 junto con la web, todavia prometen los bonos.
-- (Ademas, el MCP de Supabase rechaza el DDL destructivo desde la extension de VS Code: la
-- 0042 se corre a mano en el SQL Editor.)

-- ─── 1. Cumpleanios: mes y dia ───────────────────────────────────────────────
alter table public.profiles
  add column if not exists birthday_month smallint,
  add column if not exists birthday_day   smallint;

-- Los dos o ninguno, y un dia que exista en ese mes. El 29 de febrero vale: sin anio, no
-- hay forma de saber si es bisiesto, y quien nacio ese dia existe.
alter table public.profiles
  add constraint profiles_birthday_valid check (
    (birthday_month is null and birthday_day is null)
    or (
      birthday_month between 1 and 12
      and birthday_day between 1 and case
        when birthday_month = 2 then 29
        when birthday_month in (4, 6, 9, 11) then 30
        else 31
      end
    )
  );

update public.profiles
  set birthday_month = extract(month from birthdate)::smallint,
      birthday_day   = extract(day from birthdate)::smallint
  where birthdate is not null;

create index if not exists profiles_birthday_md_idx
  on public.profiles (birthday_month, birthday_day)
  where birthday_month is not null;

comment on column public.profiles.birthday_month is
  'Mes del cumpleanios (1-12). Sin anio a proposito: solo se usa para felicitar. Va junto con birthday_day.';
comment on column public.profiles.birthday_day is
  'Dia del cumpleanios (1-31, validado contra el mes). Va junto con birthday_month.';
comment on column public.profiles.phone is
  'WhatsApp en E.164. Opcional desde la 0040, y el usuario lo cambia o lo borra desde su perfil. Unico (profiles_phone_key).';

-- ─── 2. update_my_profile(): sin anio, telefono editable, sin bono ───────────
-- Firma nueva, junto a la vieja `(text, text, date, text, boolean)`: PostgREST distingue la
-- sobrecarga por el nombre de los parametros (`p_birthdate` contra `p_birthday_month`). La
-- vieja se borra en la 0042; quedarse para siempre la dejaria escribiendo anios y dando bonos.
create or replace function public.update_my_profile(
  p_first_name       text,
  p_last_name        text,
  p_birthday_month   int,
  p_birthday_day     int,
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
  v_found   boolean;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  if v_phone is not null and not public.phone_is_valid(v_phone) then
    return jsonb_build_object('success', false, 'reason', 'invalid_phone');
  end if;

  -- El CHECK `profiles_birthday_valid` lo rechazaria igual, pero con un error generico; aqui
  -- se devuelve un motivo que el cliente sabe nombrar.
  if (p_birthday_month is null) <> (p_birthday_day is null)
     or (p_birthday_month is not null and not (
       p_birthday_month between 1 and 12
       and p_birthday_day between 1 and case
         when p_birthday_month = 2 then 29
         when p_birthday_month in (4, 6, 9, 11) then 30
         else 31
       end
     ))
  then
    return jsonb_build_object('success', false, 'reason', 'invalid_birthday');
  end if;

  -- Sin telefono no hay a donde mandar los mensajes. Borrar el numero exige desmarcar el
  -- permiso en el mismo envio; el cliente lo hace solo.
  if v_optin and v_phone is null then
    return jsonb_build_object('success', false, 'reason', 'optin_without_phone');
  end if;

  update public.profiles p set
    first_name     = v_first,
    last_name      = v_last,
    birthday_month = p_birthday_month,
    birthday_day   = p_birthday_day,
    phone          = v_phone,
    whatsapp_opt_in = v_optin,
    whatsapp_opt_in_at = case
      when v_optin and not p.whatsapp_opt_in then now()
      when v_optin then p.whatsapp_opt_in_at
      else null
    end
  where p.id = v_user_id
  returning true into v_found;

  if not coalesce(v_found, false) then
    return jsonb_build_object('success', false, 'reason', 'error');
  end if;

  return jsonb_build_object('success', true);

-- El unico indice unico que esta funcion puede pisar es el del telefono.
exception when unique_violation then
  return jsonb_build_object('success', false, 'reason', 'phone_taken');
end;
$$;

comment on function public.update_my_profile(text, text, int, int, text, boolean) is
  'La unica forma en que un usuario escribe su perfil. No toca email, total_points, is_admin ni username, y desde la 0040 no da puntos.';

revoke all on function public.update_my_profile(text, text, int, int, text, boolean) from public, anon;
grant execute on function public.update_my_profile(text, text, int, int, text, boolean) to authenticated;

-- ─── 3. complete_signup(): el telefono pasa a ser opcional ───────────────────
-- Misma firma que la 0023, para que ningun cliente tenga que cambiar como la llama.
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

  -- Opcional desde la 0040; si viene, tiene que ser valido.
  if v_phone is not null and not public.phone_is_valid(v_phone) then
    return jsonb_build_object('success', false, 'reason', 'invalid_phone');
  end if;

  if v_optin and v_phone is null then
    return jsonb_build_object('success', false, 'reason', 'optin_without_phone');
  end if;

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
