-- 0042 — Se borra el anio de nacimiento de todos los perfiles, y lo que la 0040 dejo vivo
-- solo para la transicion.
--
-- La 0040 solo agrego: copio dia y mes a `birthday_month` / `birthday_day` y dejo junto a la
-- nueva la firma vieja de `update_my_profile`, `is_adult`, `claim_google_bonus` y la columna
-- `birthdate`, para que la web anterior siguiera funcionando mientras salia la nueva. Ya
-- desplegada la web y publicados el aviso 4.0.0 y los terminos 3.0.0, todo eso sobra, y con
-- ello el anio de nacimiento de cada quien: el aviso dice que solo guardamos dia y mes, y
-- esta migracion es lo que lo hace verdad.
--
-- Se aplica DESPUES de verificar el despliegue de la web, a mano en el SQL Editor (el MCP de
-- Supabase rechaza el DDL destructivo desde la extension de VS Code). Es irreversible.

-- 1. Quien dio su cumpleanios por primera vez desde la web vieja entre la 0040 y el
--    despliegue lo guardo solo en `birthdate`. Se recupera antes de borrar la columna.
update public.profiles
  set birthday_month = extract(month from birthdate)::smallint,
      birthday_day   = extract(day from birthdate)::smallint
  where birthdate is not null and birthday_month is null;

-- 2. La firma vieja escribia `birthdate` con anio y daba el bono de perfil completo.
drop function if exists public.update_my_profile(text, text, date, text, boolean);

-- 3. Sin anio no hay edad que calcular: la mayoria de edad queda en la casilla del alta.
drop function if exists public.is_adult(date);

-- 4. Sin bono por entrar con Google. Las APK anteriores la llaman al crear la cuenta, pero
--    quedan detenidas en "actualiza la app" por la version legal nueva, y su llamada falla
--    en silencio (devuelven 0).
drop function if exists public.claim_google_bonus();

-- 5. El anio de nacimiento, con la columna que lo guardaba.
drop index if exists public.profiles_birthday_idx;

alter table public.profiles
  drop constraint if exists profiles_birthdate_sane;

alter table public.profiles
  drop column if exists birthdate;
