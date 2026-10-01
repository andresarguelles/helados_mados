-- 0032 — Se publican los terminos 2.3.0 y el aviso de privacidad 2.2.3: el acceso es solo
-- con Google.
--
-- El 2026-09-30 se retira el acceso con apodo y contrasena. Los terminos 2.2.0 decian por
-- escrito que las cuentas antiguas "pueden seguir entrando asi", asi que no se podia apagar
-- sin publicar otro texto. Los 2.3.0 dicen que solo se entra con Google y que las cuentas
-- antiguas que nunca vincularon Google se conservan con su apodo, sus puntos y sus cupones,
-- pero sin forma de iniciar sesion. El bono de Google se describe ya como "al entrar por
-- primera vez con Google", porque vincular dejo de existir.
--
-- Terminos: MENOR (cambia una condicion del servicio, no el tratamiento de datos).
-- Aviso: PARCHE (redaccion): ya no se puede desvincular Google, y las contrasenas antiguas
-- se conservan cifradas pero ya no sirven para entrar. Ningun dato, finalidad ni
-- transferencia cambia.
--
-- Las versiones anteriores NO se borran: ya se publicaron y tienen aceptaciones.
--
-- Sembrar estas filas es un prerequisito, no el ultimo paso: `complete_signup` rechaza
-- cualquier version que no encuentre aqui, asi que se aplica ANTES del deploy que las
-- muestra. Aplicarla hace que `my_legal_status` pida re-aceptacion a todos los usuarios
-- (compara version exacta), y un APK que todavia trae la 2.2.2 muestra "actualiza la app"
-- hasta que se instale uno regenerado.
--
-- Lo que apaga el acceso con contrasena NO esta aqui: es el interruptor "Enable Email
-- provider" del dashboard, y el cierre de las sesiones abiertas de las cuentas sin Google
-- se ejecuto aparte, una sola vez, el mismo dia. Ver CLAUDE.md.

insert into public.legal_versions (doc_id, version, ast_hash) values
  ('privacidad', '2.2.3', '98cbed9a0e0e089afa6dab1be2e705ce809e6de405942743e44e3d878c27a734'),
  ('terminos', '2.3.0', '6d6dcd515bd781ba537a8cd1c351ffff82e82957b9656becf0ab758498472205')
on conflict (doc_id, version) do nothing;
