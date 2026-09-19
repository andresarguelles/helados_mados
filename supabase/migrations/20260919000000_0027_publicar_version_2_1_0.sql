-- 0027 — Se publica la version 2.1.0, la primera publicable.
--
-- La 2.0.0 que sembro la 0026 traia los marcadores «PENDIENTE» donde van el nombre, el RFC
-- y el domicilio del responsable. Era utilizable para que el alta no estuviera caida, pero
-- un aviso que no identifica al responsable no cumple, asi que nunca debio publicarse.
--
-- La 2.1.0 ya los trae. Se borra la 2.0.0 en vez de dejarla: se comprobo que nadie la
-- acepto (legal_acceptances vacia), asi que no es historia, es ruido. Si alguien la hubiera
-- aceptado habria que conservarla, porque las filas de legal_acceptances apuntan a ella —
-- de ahi el `not exists`, que hace el borrado seguro aunque se corra mas tarde.
--
-- A partir de aqui, una version publicada NO se borra nunca.

delete from public.legal_versions
where version = '2.0.0'
  and not exists (
    select 1 from public.legal_acceptances a
    where a.doc_id = legal_versions.doc_id and a.version = legal_versions.version
  );

insert into public.legal_versions (doc_id, version, ast_hash) values
  ('privacidad', '2.1.0', '0be4e2fb711a2749b6086496101c087e51fd49e98cd8b036edd2a994c6363c9c'),
  ('terminos',   '2.1.0', '82c2f0abb31d52a2068415e8182a8e5ffa3619b495b97bf99aaef9d5691a3958')
on conflict (doc_id, version) do nothing;
