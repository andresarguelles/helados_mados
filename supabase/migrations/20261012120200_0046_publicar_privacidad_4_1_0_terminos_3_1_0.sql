-- 0046 — Se publican el aviso de privacidad 4.1.0 y los terminos 3.1.0, juntos, para que la
-- gente acepte una sola vez.
--
-- Aviso 4.1.0 (MENOR): dos finalidades nuevas, por el panel de Metricas del superadmin (0045).
--   - Necesaria: estadisticas internas de la promocion (cifras de conjunto).
--   - Voluntaria: ofrecer promociones segun la participacion (listas de clientes). Se niega
--     pidiendolo por correo; el superadmin marca `excluir_de_listas` y la cuenta sale de ellas.
--   Ademas, la seguridad explica los niveles de acceso (staff, admin, superadmin; 0044).
--
-- Terminos 3.1.0 (redaccion): vocabulario nuevo. Con la palabra secreta se GENERA el cupon; en
-- la tienda se CANJEA. Hasta la 3.0.0 "canjear" nombraba las dos cosas.
--
-- Las versiones anteriores NO se borran: ya se publicaron y tienen aceptaciones.
--
-- Se aplica justo cuando la web que muestra este texto ya esta servida: complete_signup
-- rechaza cualquier version que no encuentre aqui, y en cuanto existe, my_legal_status pide
-- re-aceptar a todos (compara version exacta). Un APK que trae la 4.0.0 / 3.0.0 muestra
-- "actualiza la app" hasta que se instale uno regenerado.

insert into public.legal_versions (doc_id, version, ast_hash) values
  ('privacidad', '4.1.0', 'd972e4595bb26b6f55d795f14a90c6c245a5622c765a0061dc519be6a4dc89c5'),
  ('terminos', '3.1.0', '7a78b9e785f96d037a759b81e72ea4a6f7bad35afd800c5cfb6f7b0ad7760893')
on conflict (doc_id, version) do nothing;
