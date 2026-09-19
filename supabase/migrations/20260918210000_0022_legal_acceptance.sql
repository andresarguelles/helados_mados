-- 0022 — Quedar constancia de que version del texto legal acepto cada quien.
--
-- Hasta aqui no habia ninguna. El unico consentimiento con fecha era el de WhatsApp
-- (whatsapp_opt_in_at, de la 0019). Si manana alguien reclama, no hay forma de mostrar
-- que texto vio ni cuando: el documento vivia hardcodeado en un .tsx y cambiaba con un
-- deploy, sin dejar rastro.
--
-- Ahora el texto se compila desde legal/*.md y cada version tiene un hash del AST. Esta
-- migracion guarda ese par (version, hash) del lado del servidor, para que el cliente no
-- pueda registrar la aceptacion de algo que nunca se publico.

-- ─── 1. Las versiones publicadas ─────────────────────────────────────────────
-- Nadie escribe esto desde el cliente. Lo siembra una migracion cuando se publica una
-- version nueva, con el `insert` que imprime `npm run legal:build`. Si la fila no existe,
-- accept_legal() rechaza: eso es lo que impide que un cliente manipulado invente versiones.
create table if not exists public.legal_versions (
  doc_id       text        not null,
  version      text        not null,
  ast_hash     text        not null,
  published_at timestamptz not null default now(),
  primary key (doc_id, version)
);

comment on table public.legal_versions is
  'Versiones publicadas del texto legal. Se siembra desde una migracion con la salida de `npm run legal:build`; el cliente solo lee.';

alter table public.legal_versions enable row level security;

-- Lectura publica: el cliente necesita saber cual es la version vigente antes de tener
-- sesion (la pantalla de alta muestra el aviso simplificado y pide aceptar).
drop policy if exists legal_versions_select_all on public.legal_versions;
create policy legal_versions_select_all
  on public.legal_versions for select
  to anon, authenticated
  using (true);

-- ─── 2. Las aceptaciones ─────────────────────────────────────────────────────
-- OJO con la ausencia de foreign key a profiles, que es deliberada.
--
-- Esta tabla es la PRUEBA del consentimiento, y al borrar la cuenta tiene que sobrevivir:
-- si se fuera en cascada con el perfil, la baja destruiria justo la evidencia de que en su
-- momento hubo consentimiento. La ley permite conservarla bloqueada durante el plazo de
-- prescripcion; el aviso de privacidad lo declara en su seccion de conservacion.
--
-- Cuando el perfil ya no existe, el user_id queda como un UUID huerfano que no identifica
-- a nadie por si solo. Eso es exactamente el bloqueo que se pretende.
create table if not exists public.legal_acceptances (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null,
  doc_id      text        not null,
  version     text        not null,
  ast_hash    text        not null,
  platform    text        not null check (platform in ('web', 'android')),
  accepted_at timestamptz not null default now()
);

comment on table public.legal_acceptances is
  'Append-only. Prueba de que version acepto cada usuario y cuando. Sin FK a profiles a proposito: sobrevive al borrado de la cuenta como bloqueo, no como tratamiento activo.';

create index if not exists legal_acceptances_user_idx
  on public.legal_acceptances (user_id, doc_id, accepted_at desc);

alter table public.legal_acceptances enable row level security;

-- Solo lectura, y solo lo propio. La escritura pasa unicamente por accept_legal(), que
-- valida contra legal_versions. Sin policy de UPDATE ni de DELETE: es append-only y la
-- ausencia de policy es lo que lo garantiza, no una convencion.
drop policy if exists legal_acceptances_select_own on public.legal_acceptances;
create policy legal_acceptances_select_own
  on public.legal_acceptances for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ─── 3. Cual es la version vigente de cada documento ─────────────────────────
-- Por published_at y no ordenando la cadena de version: '10.0.0' < '9.0.0' como texto, y
-- ese bug aparece justo cuando el proyecto lleva anios y nadie se acuerda de esto.
create or replace function public.legal_current_versions()
returns table (doc_id text, version text, ast_hash text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (lv.doc_id) lv.doc_id, lv.version, lv.ast_hash
  from public.legal_versions lv
  order by lv.doc_id, lv.published_at desc, lv.version desc
$$;

revoke all on function public.legal_current_versions() from public;
grant execute on function public.legal_current_versions() to anon, authenticated;

-- ─── 4. Que le falta por aceptar al usuario ──────────────────────────────────
-- Es lo que consulta la compuerta de re-aceptacion de los dos clientes. Devuelve solo lo
-- pendiente, para que el cliente no tenga que razonar sobre versiones.
create or replace function public.my_legal_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'pendientes',
    coalesce(
      jsonb_agg(jsonb_build_object('doc_id', c.doc_id, 'version', c.version, 'ast_hash', c.ast_hash)
                order by c.doc_id),
      '[]'::jsonb
    )
  )
  from public.legal_current_versions() c
  where auth.uid() is not null
    and not exists (
      select 1 from public.legal_acceptances a
      where a.user_id = auth.uid()
        and a.doc_id  = c.doc_id
        and a.version = c.version
    )
$$;

revoke all on function public.my_legal_status() from public, anon;
grant execute on function public.my_legal_status() to authenticated;

-- ─── 5. Registrar la aceptacion ──────────────────────────────────────────────
-- p_docs: [{"doc_id":"terminos","version":"2.0.0","ast_hash":"..."}, ...]
--
-- Valida cada terna contra legal_versions. El hash importa: sin el, un cliente viejo
-- podria registrar "acepte la 2.0.0" mostrando un texto que ya no es la 2.0.0.
create or replace function public.accept_legal(p_docs jsonb, p_platform text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id  uuid := auth.uid();
  v_platform text := lower(coalesce(p_platform, ''));
  v_doc      jsonb;
  v_n        int := 0;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  if v_platform not in ('web', 'android') then
    return jsonb_build_object('success', false, 'reason', 'invalid_platform');
  end if;

  if p_docs is null or jsonb_typeof(p_docs) <> 'array' or jsonb_array_length(p_docs) = 0 then
    return jsonb_build_object('success', false, 'reason', 'no_docs');
  end if;

  for v_doc in select * from jsonb_array_elements(p_docs) loop
    if not exists (
      select 1 from public.legal_versions lv
      where lv.doc_id   = v_doc->>'doc_id'
        and lv.version  = v_doc->>'version'
        and lv.ast_hash = v_doc->>'ast_hash'
    ) then
      -- El cliente muestra un texto que el servidor no reconoce: casi siempre es un APK
      -- viejo. Que no se registre nada es lo correcto; aceptar a ciegas seria peor.
      return jsonb_build_object('success', false, 'reason', 'unknown_version',
                                'doc_id', v_doc->>'doc_id');
    end if;

    insert into public.legal_acceptances (user_id, doc_id, version, ast_hash, platform)
    values (v_user_id, v_doc->>'doc_id', v_doc->>'version', v_doc->>'ast_hash', v_platform);
    v_n := v_n + 1;
  end loop;

  return jsonb_build_object('success', true, 'registradas', v_n);
end;
$$;

revoke all on function public.accept_legal(jsonb, text) from public, anon;
grant execute on function public.accept_legal(jsonb, text) to authenticated;

-- ─── 6. La siembra va aparte, a proposito ────────────────────────────────────
-- Aqui NO se inserta ninguna version. Esta migracion solo trae la maquinaria, y es
-- puramente aditiva: se puede aplicar en produccion sin romper a los clientes que ya
-- estan desplegados.
--
-- La fila de la version vigente se siembra en su propia migracion, en el momento del
-- cambio, con el `insert` que imprime `npm run legal:build`. Mientras el texto siga
-- teniendo marcadores «PENDIENTE» sin llenar, su hash va a cambiar, y sembrar un hash
-- que va a dejar de ser el vigente solo crea filas muertas.
--
-- Regla para el futuro: una version se siembra cuando se publica, no cuando se escribe.
