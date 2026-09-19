-- 0028 — Constancia de las bajas que ejecuta el personal, y publicacion de la 2.2.0.
--
-- Hasta aqui la unica forma de darse de baja era que el titular lo hiciera el mismo. Cuando
-- alguien lo pide por correo —que es el canal que el aviso publica para los derechos ARCO—
-- no habia manera de ejecutarlo desde la plataforma, y hacerlo a mano en la base no dejaba
-- ningun rastro de quien lo hizo ni de que hubiera sido solicitado.
--
-- Un borrado sin constancia es indistinguible de un borrado que nunca ocurrio, incluso para
-- la persona que lo pidio. Esta tabla es lo que le permite reclamar, y de paso lo que
-- protege al personal de una acusacion de borrado arbitrario.

create table if not exists public.account_deletions (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null,
  -- El apodo, y nada mas del perfil. Sin el, la fila es un UUID que nadie puede leer y la
  -- pregunta real seis meses despues es "¿si borramos la cuenta de Fulano?". Es ademas el
  -- unico campo que era publico por diseno: get_leaderboard lo entrega a anon.
  username    text,
  -- El vocabulario nombra el FUNDAMENTO, no al actor. 'admin_a_peticion' y no 'admin' a
  -- secas porque los terminos ya reservan otro caso —cancelar por incumplimiento—, y el dia
  -- que exista 'admin_sancion' las filas viejas tienen que seguir siendo inequivocas.
  via         text        not null check (via in ('admin_a_peticion', 'admin_prueba')),
  executed_by uuid        not null,
  deleted_at  timestamptz not null default now()
);

comment on table public.account_deletions is
  'Constancia de las bajas ejecutadas por el personal. El autoborrado NO se registra: el titular actuo por si mismo, el acto es la solicitud, y no hay un tercero del que defenderse. Sin FK en ninguna columna uuid, a proposito.';

comment on column public.account_deletions.user_id is
  'Sin FK: apunta a alguien que acaba de ser borrado, asi que una FK haria la fila imposible. Mismo razonamiento que legal_acceptances.';

comment on column public.account_deletions.executed_by is
  'Sin FK: apunta a un admin que algun dia tambien se dara de baja, y una cascada destruiria el registro de todo lo que hizo.';

-- Lo que esta tabla NO guarda, y la lista es la mitad del diseno: correo, telefono, nombre,
-- fecha de nacimiento, foto. Son literalmente los datos que la Cancelacion destruye, y
-- copiarlos a una tabla que sobrevive convertiria la baja en un no-op. Tampoco el motivo en
-- prosa del cliente: es texto libre de una persona y puede contener cualquier cosa. El hilo
-- de correo ya existe; aqui vive un vocabulario cerrado.

create index if not exists account_deletions_fecha_idx
  on public.account_deletions (deleted_at desc);

alter table public.account_deletions enable row level security;

-- Solo lectura, y solo para admins. La escritura pasa unicamente por las edge functions con
-- service role. Sin policy de INSERT/UPDATE/DELETE: la ausencia de policy es la garantia de
-- que es append-only, no una convencion. Misma doctrina que 0004 y 0022.
drop policy if exists account_deletions_select_admin on public.account_deletions;
create policy account_deletions_select_admin
  on public.account_deletions for select
  to authenticated
  using (public.is_admin());

-- ─── La version 2.2.0 ────────────────────────────────────────────────────────
-- Corrige el correo de contacto (estaba escrito 'contact@' en los 20 sitios donde aparece,
-- incluido todo el canal ARCO), fusiona la direccion de la tienda con la fiscal —son la
-- misma— y declara esta bitacora.
--
-- Se borra la 2.1.0 porque nadie la acepto: no llego a desplegarse. Una version que alguien
-- haya aceptado no se borra nunca, y de ahi el `not exists`.

delete from public.legal_versions
where version = '2.1.0'
  and not exists (
    select 1 from public.legal_acceptances a
    where a.doc_id = legal_versions.doc_id and a.version = legal_versions.version
  );

insert into public.legal_versions (doc_id, version, ast_hash) values
  ('privacidad', '2.2.0', '6ea075bcc3c17b2309c77e3ed443c958b5e49e084f9fc28a0b2b395b01fc3b0f'),
  ('terminos',   '2.2.0', '9aa39da1218e502be4a6d5f5a50996fcb54fe20db14027aae279cfe76f4aa99a')
on conflict (doc_id, version) do nothing;
