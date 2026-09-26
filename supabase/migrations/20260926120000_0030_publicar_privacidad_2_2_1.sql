-- 0030 — Se publica la version 2.2.1 del aviso de privacidad.
--
-- El sitio dejo de descargar las tipografias de Google Fonts: ahora se sirven desde
-- nuestro propio servidor. El aviso 2.2.0 todavia decia que habia "dos servicios de
-- Google que se cargan siempre" (las tipografias y el mapa de la home); eso ya no es
-- cierto, y un aviso de privacidad que declara un dato que ya no se comparte es un
-- aviso que miente por accion, no por omision. Se corrige la seccion de cookies y
-- herramientas de medicion, y la lista de con quien compartimos datos: el unico
-- servicio de Google que sigue cargandose siempre es el mapa de la tienda.
--
-- Es PARCHE (redaccion) porque reduce lo que se comparte con Google, no anade ni
-- cambia ninguna finalidad de tratamiento. `terminos.md` no cambio: su hash es el
-- mismo que sembro la 0028 y el `insert` lo trae solo porque asi lo imprime el
-- generador; el `on conflict do nothing` lo vuelve un no-op.
--
-- La 2.2.0 NO se borra: ya se publico y puede tener aceptaciones (a diferencia de la
-- 2.0.0/2.1.0 que borraron las migraciones 0026/0027, esas nunca llegaron a produccion).
--
-- Sembrar esta fila es un prerequisito, no el ultimo paso: `complete_signup` rechaza
-- cualquier version que no encuentre aqui, asi que hasta que esta migracion se aplique
-- el cliente no debe mostrar la 2.2.1 en pantalla. Aplicar esta migracion hara que
-- `my_legal_status` pida re-aceptacion a todos los usuarios web (compara version
-- exacta) y que `complete_signup` exija 2.2.1 a las altas nuevas.

insert into public.legal_versions (doc_id, version, ast_hash) values
  ('privacidad', '2.2.1', '67bb968e551db7a7b2205f80c0aef2e87fbc2dcbf23524832d7d7561ca1e226e'),
  ('terminos', '2.2.0', '9aa39da1218e502be4a6d5f5a50996fcb54fe20db14027aae279cfe76f4aa99a')
on conflict (doc_id, version) do nothing;
