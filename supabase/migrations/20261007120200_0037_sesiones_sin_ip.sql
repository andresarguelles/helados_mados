-- 0037 — Las sesiones dejan de guardar la IP.
--
-- Supabase Auth (GoTrue) escribe la IP en claro de quien inicia sesion en auth.sessions.ip, al
-- crear la sesion y al refrescarla. No lo hace nuestro codigo, pero queda en nuestra base, y la
-- decision de 0035/0036 es que no guardamos la IP de nadie de ninguna forma.
--
-- No hay una opcion de configuracion para apagarlo, asi que un trigger la reemplaza antes de
-- escribirse. Es el mismo tipo de enganche que ya hay en auth.users (0004) y auth.identities
-- (0017). GoTrue no usa esa columna para ninguna decision: solo la guarda para mostrarla.
--
-- Se escribe 0.0.0.0 y no null A PROPOSITO: hoy la columna admite null, pero si una version
-- futura de GoTrue la volviera NOT NULL, un null romperia la creacion de sesiones, o sea todos
-- los inicios de sesion. 0.0.0.0 es "ninguna direccion" y no choca con esa restriccion.
--
-- Si un inicio de sesion llegara a fallar por esto, se quita con:
--   drop trigger sesion_sin_ip on auth.sessions;

create function public.sesion_sin_ip()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.ip := '0.0.0.0'::inet;
  return new;
end;
$$;

revoke all on function public.sesion_sin_ip() from public, anon, authenticated;

create trigger sesion_sin_ip
  before insert or update of ip on auth.sessions
  for each row execute function public.sesion_sin_ip();

-- Las sesiones que ya existen.
update auth.sessions set ip = '0.0.0.0' where ip is distinct from '0.0.0.0'::inet;
