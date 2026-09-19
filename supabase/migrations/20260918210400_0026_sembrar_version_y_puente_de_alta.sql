-- 0026 — Sembrar la version vigente, y un puente para que las altas no esten caidas.
--
-- DOS ARREGLOS A UN ERROR DE SECUENCIA.
--
-- 1. La 0023 elimino la firma de tres parametros de complete_signup, pero el cliente web
--    desplegado seguia llamandola. Desde que se aplico, toda alta nueva fallaba con 404.
--    La ventana no era "hasta el despliegue" entendido como un instante: era hasta que
--    alguien desplegara, que puede ser manana.
--
--    La firma vieja vuelve como PUENTE. No registra aceptacion legal ni edad, porque el
--    cliente viejo no las manda: eso es el estado que habia ayer, no una regresion. A esas
--    cuentas las recoge la compuerta de re-aceptacion en su siguiente entrada.
--
--    SE ELIMINA en cuanto la web nueva este desplegada:
--      drop function public.complete_signup(text, text, boolean);
--    Mientras exista, hay un camino de alta que no deja constancia. Es un puente, no un
--    diseno.
--
-- 2. legal_versions estaba vacia, y complete_signup exige que cada terna de p_legal exista
--    ahi. Asi que el cliente NUEVO tambien habria fallado, con 'unknown_version', diciendole
--    "actualiza la app" a alguien que acababa de instalarla. Sembrar la version no era el
--    ultimo paso del proyecto: es requisito para que el alta funcione.
--
-- OJO: el texto todavia tiene marcadores «PENDIENTE» con los datos del responsable. Esta
-- 2.0.0 es utilizable pero NO es publicable. Al llenarlos cambia el hash y hay que sembrar
-- la siguiente version. Como nadie ha aceptado la 2.0.0 todavia, sus filas se pueden
-- borrar en ese momento en vez de quedar como historia muerta.

insert into public.legal_versions (doc_id, version, ast_hash) values
  ('privacidad', '2.0.0', 'a4be758d25e500e314f04b584f173993195b27b7abc690b804107b26ad8269c8'),
  ('terminos',   '2.0.0', '4283c8272a8553f057cc93847240e35935038b9a48bd7856a7871ed6c009b982')
on conflict (doc_id, version) do nothing;

-- TEMPORAL. PostgREST resuelve por nombre de argumento, asi que las dos firmas conviven sin
-- ambiguedad: el cliente viejo manda tres y cae aqui, el nuevo manda seis y cae en la buena.
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

  if v_phone is null or not public.phone_is_valid(v_phone) then
    return jsonb_build_object('success', false, 'reason', 'invalid_phone');
  end if;

  select username, true into v_existing, v_found from public.profiles where id = v_user_id;
  if not coalesce(v_found, false) then
    return jsonb_build_object('success', false, 'reason', 'error');
  end if;
  if v_existing is not null then
    return jsonb_build_object('success', false, 'reason', 'already_set');
  end if;

  update public.profiles set
    username           = v_username::citext,
    phone              = v_phone,
    whatsapp_opt_in    = coalesce(p_whatsapp_opt_in, false),
    whatsapp_opt_in_at = case when coalesce(p_whatsapp_opt_in, false) then now() else null end
  where id = v_user_id;

  return jsonb_build_object('success', true);

exception when unique_violation then
  get stacked diagnostics v_constraint = constraint_name;
  return jsonb_build_object(
    'success', false,
    'reason', case when v_constraint = 'profiles_phone_key' then 'phone_taken' else 'username_taken' end
  );
end;
$$;

comment on function public.complete_signup(text, text, boolean) is
  'PUENTE TEMPORAL para el cliente web anterior a la 0023. No registra aceptacion legal ni edad. Eliminar en cuanto la web nueva este desplegada.';

revoke all on function public.complete_signup(text, text, boolean) from public, anon;
grant execute on function public.complete_signup(text, text, boolean) to authenticated;
