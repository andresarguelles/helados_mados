-- 0038 — Se publican el aviso de privacidad 3.0.0 y los terminos 2.4.0: ya no se guarda la IP.
--
-- 0035/0036 quitaron el tope de 3 canjes por red y borraron la tabla de hashes de IP; 0037 hizo
-- que las sesiones de Supabase Auth dejen de guardar la IP. El texto se pone al dia:
--
--   Aviso de privacidad (MAYOR, porque cambia el tratamiento de datos):
--   - Sale el "valor derivado de su direccion IP" de la lista de datos, la seccion "Su direccion
--     IP", los "registros tecnicos antiabuso" que sobrevivian al borrar la cuenta y la vinieta de
--     seguridad que la mencionaba. La finalidad antiabuso pierde el tope por red.
--   - Entra, en su lugar, "No guardamos su direccion IP: ni en claro ni transformada".
--   - Supabase se declara igual que Vercel: sus registros tecnicos ven la IP de cada peticion.
--     Ya era cierto antes y el aviso no lo decia.
--   Terminos (MENOR): sale la regla de tres canjes por red, y los registros antiabuso de lo que
--   sobrevive a la baja.
--
-- Las versiones anteriores NO se borran: ya se publicaron y tienen aceptaciones.
--
-- Sembrar estas filas es un prerequisito, no el ultimo paso: complete_signup rechaza cualquier
-- version que no encuentre aqui, asi que se aplica ANTES del deploy que las muestra, y justo
-- antes: aplicarla hace que my_legal_status pida re-aceptacion a todos los usuarios (compara
-- version exacta), y un APK que todavia trae la 2.2.3 muestra "actualiza la app" hasta que se
-- instale uno regenerado. Y solo DESPUES de 0036: el texto afirma que no hay IP guardada.

insert into public.legal_versions (doc_id, version, ast_hash) values
  ('privacidad', '3.0.0', '523d3bffc30ef495d8644cc0d5a26699f74fb4e8e0e38b65f551593b1f66cbcd'),
  ('terminos', '2.4.0', 'a5ae366b55614362e3bdfef7bd363d5ec03d934858bac4c396474aff02d13581')
on conflict (doc_id, version) do nothing;
