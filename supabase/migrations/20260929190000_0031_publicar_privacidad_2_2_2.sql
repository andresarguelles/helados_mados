-- 0031 — Se publica la version 2.2.2 del aviso de privacidad.
--
-- El aviso simplificado (la seccion "En corto", la que /bienvenida muestra justo donde se
-- recaban los datos) abria con el nombre completo y el domicilio del responsable, que es
-- una persona fisica. Ahora empieza por lo que hacemos con los datos y cierra con una sola
-- linea que dice quien es el responsable y donde esta. Esa linea no se puede quitar: el
-- articulo 16, fraccion II, de la LFPDPPP exige que el aviso simplificado incluya la
-- identidad y el domicilio del responsable (fracciones I a IV del articulo 15). La seccion
-- "Quien es el responsable" del aviso integral no cambia.
--
-- Es PARCHE (redaccion): no cambia ningun dato, finalidad ni transferencia. `terminos.md`
-- no cambio; su fila viene solo porque asi la imprime el generador, y el
-- `on conflict do nothing` la vuelve un no-op, como en la 0030.
--
-- La 2.2.1 NO se borra: ya se publico y tiene aceptaciones.
--
-- Sembrar esta fila es un prerequisito, no el ultimo paso: `complete_signup` rechaza
-- cualquier version que no encuentre aqui, asi que se aplica ANTES del deploy que muestra
-- la 2.2.2. Aplicarla hace que `my_legal_status` pida re-aceptacion a todos los usuarios
-- (compara version exacta), y un APK que todavia trae la 2.2.1 muestra "actualiza la app"
-- hasta que se instale uno regenerado.

insert into public.legal_versions (doc_id, version, ast_hash) values
  ('privacidad', '2.2.2', 'f2c700ccd0a1351245d4feed046c23d87e1a4c6c2c6ee3fda7c4ab3840ff3cdb'),
  ('terminos', '2.2.0', '9aa39da1218e502be4a6d5f5a50996fcb54fe20db14027aae279cfe76f4aa99a')
on conflict (doc_id, version) do nothing;
