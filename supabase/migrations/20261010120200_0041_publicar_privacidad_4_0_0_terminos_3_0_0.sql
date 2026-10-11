-- 0041 — Se publican el aviso de privacidad 4.0.0 y los terminos 3.0.0.
--
-- Acompania a la 0040. El texto se pone al dia con tres cambios:
--
--   Aviso de privacidad (MAYOR, porque cambia el tratamiento de datos):
--   - El numero de WhatsApp pasa a ser opcional, y el usuario lo agrega, lo cambia o lo borra
--     desde su perfil. Sale el limite ARCO de "no se puede rectificar".
--   - "Fecha de nacimiento" pasa a "cumpleanios": solo dia y mes. Se declara que el anio de las
--     fechas ya guardadas se borra al publicar (eso lo hace la 0042) y sale el rechazo de fechas
--     de menor, que sin anio ya no existe.
--   - Salen los dos bonos de +5 (perfil completo y primer acceso con Google).
--   Terminos (MAYOR): el alta pide dos cosas obligatorias en vez de tres, el numero se puede
--   cambiar, y los puntos ya no incluyen bonos; los ya entregados se conservan.
--
-- Las versiones anteriores NO se borran: ya se publicaron y tienen aceptaciones.
--
-- Sembrar estas filas es un prerequisito, no el ultimo paso: complete_signup rechaza cualquier
-- version que no encuentre aqui, asi que se aplica ANTES del deploy que las muestra, y justo
-- antes: aplicarla hace que my_legal_status pida re-aceptacion a todos los usuarios (compara
-- version exacta), y un APK que todavia trae la 3.0.0 muestra "actualiza la app" hasta que se
-- instale uno regenerado. Y solo DESPUES de 0040: el texto afirma que el numero es opcional.

insert into public.legal_versions (doc_id, version, ast_hash) values
  ('privacidad', '4.0.0', 'c904d96697b56c4fec74d7d4a42d62e0e029190cebba6783a3a21269bea1749e'),
  ('terminos', '3.0.0', '36edde269300ed1cf7ae20e1bc4f7db7dbbe62964f6a342f2bb90f8ba55b77e6')
on conflict (doc_id, version) do nothing;
