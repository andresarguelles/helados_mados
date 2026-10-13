-- 0046 — Se publica el aviso de privacidad 4.1.0 (los terminos siguen en 3.0.0).
--
-- MENOR: dos finalidades nuevas, por el panel de Metricas del superadmin (0045).
--   - Necesaria: estadisticas internas de la promocion (cifras de conjunto).
--   - Voluntaria: ofrecer promociones segun la participacion (listas de clientes). Se niega
--     pidiendolo por correo; el superadmin marca `excluir_de_listas` y la cuenta sale de ellas.
-- Ademas, la seguridad explica los niveles de acceso (staff, admin, superadmin; 0044).
--
-- Las versiones anteriores NO se borran: ya se publicaron y tienen aceptaciones.
--
-- Se aplica justo cuando la web que muestra este texto ya esta servida: complete_signup
-- rechaza cualquier version que no encuentre aqui, y en cuanto existe, my_legal_status pide
-- re-aceptar a todos (compara version exacta). Un APK que trae la 4.0.0 muestra "actualiza la
-- app" hasta que se instale uno regenerado.

insert into public.legal_versions (doc_id, version, ast_hash) values
  ('privacidad', '4.1.0', 'f9a9f035f91865198475dbb246b446b31cd8dfe117e01d06a310e68afcc39978')
on conflict (doc_id, version) do nothing;
