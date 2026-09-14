-- 0020 — Solo Google puede crear cuentas nuevas.
--
-- El candado anterior era apagar el registro por correo desde el dashboard, y salio caro: se apago
-- el proveedor Email entero (external_email_enabled), asi que GoTrue empezo a rechazar
-- signInWithPassword con 422 email_provider_disabled y los 175 cadetes legacy quedaron fuera. El
-- proveedor Email TIENE que seguir encendido — es como entran ellos, y tambien quien nacio con
-- Google y luego se puso contrasena con setPassword().
--
-- Asi que el candado se muda aqui, donde puede distinguir "crear cuenta" de "iniciar sesion":
-- el hook before_user_created solo corre al crear un usuario nuevo. No lo tocan
-- signInWithPassword (el usuario ya existe), ni linkIdentity() (no crea usuario, solo vincula una
-- identidad a la fila existente), ni setPassword() (es un updateUser). Lo unico que bloquea es un
-- signUp() con correo, que es exactamente la puerta que se queria cerrar — y no se cierra quitando
-- el formulario del cliente, porque cualquiera puede llamar signUp() desde la consola.
--
-- No queda activo con solo aplicar esta migracion: hay que apuntarle el hook en
-- Authentication -> Hooks -> Before User Created. Desactivarlo ahi es tambien el rollback.

create or replace function public.hook_google_only_signup(event jsonb)
returns jsonb
-- No referencia ningun objeto, asi que el search_path vacio es gratis y cierra el vector de
-- secuestro por schema — este codigo corre como supabase_auth_admin.
language plpgsql security definer set search_path = ''
as $$
begin
  -- Forma del payload documentada en el Before User Created Hook de Supabase.
  if event->'user'->'app_metadata'->>'provider' = 'google' then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Las cuentas nuevas se crean solo con Google.'
    )
  );
end;
$$;

-- GoTrue ejecuta el hook como supabase_auth_admin; nadie mas necesita poder llamarlo. El revoke a
-- PUBLIC es el que de verdad cuenta (ver 0012: los grants a PUBLIC alcanzan a anon/authenticated
-- aunque se les revoque por separado).
grant execute on function public.hook_google_only_signup(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_google_only_signup(jsonb) from authenticated, anon, public;
