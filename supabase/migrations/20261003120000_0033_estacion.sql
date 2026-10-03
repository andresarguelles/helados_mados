-- 0033 — La Estacion: lo que muestran las pantallas de mostrador, controlado en vivo.
--
-- Las pantallas /admin/leaderboard y /admin/flavors corren en monitores dentro de la tienda.
-- Desde /admin/estacion el personal decide que periodo muestra la tabla de lideres y que
-- sabores aparecen. Una sola fila guarda ese estado, y Realtime la empuja a las pantallas en
-- cuanto cambia: nadie tiene que recargar nada. La fila (y no solo mensajes sueltos) es para
-- que una pantalla que arranca o se reconecta lea el estado actual antes de recibir cambios.
--
-- Se guardan los sabores OCULTOS y no los visibles, a proposito: un sabor nuevo en el
-- catalogo (src/content/sabores.ts) aparece solo, y un id viejo que se quede en la lista no
-- hace dano. El catalogo vive en el cliente, asi que aqui solo se valida la forma del id.
--
-- El periodo solo lo lee /admin/leaderboard. El ranking publico y el Top 5 de la home no lo
-- consultan: get_leaderboard no cambia.
--
-- Solo admins leen (RLS) y nadie escribe directo: todo pasa por las tres RPC, que comprueban
-- is_admin(). Realtime respeta la RLS, asi que los cambios solo les llegan a admins.

create table public.estacion (
  -- Una sola fila: la llave solo puede valer true.
  id boolean primary key default true check (id),
  periodo_ranking text not null default 'all'
    check (periodo_ranking in ('day', 'week', 'month', 'all')),
  sabores_ocultos text[] not null default '{}',
  actualizado_en timestamptz not null default now(),
  -- Sin FK a proposito, como en account_deletions: borrar a un admin no debe tocar esto.
  actualizado_por uuid
);

comment on table public.estacion is
  'Estado de las pantallas de mostrador (una fila). Se escribe solo con estacion_set_periodo, estacion_set_sabor y estacion_mostrar_todos.';

insert into public.estacion default values;

alter table public.estacion enable row level security;

create policy estacion_select_admin
  on public.estacion for select
  to authenticated
  using ((select public.is_admin()));

-- Sin politicas de escritura ya no se puede escribir; esto lo hace explicito.
revoke all on public.estacion from anon;
revoke insert, update, delete, truncate on public.estacion from authenticated;

alter publication supabase_realtime add table public.estacion;

create or replace function public.estacion_set_periodo(p_periodo text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'reason', 'forbidden');
  end if;
  if p_periodo is null or p_periodo not in ('day', 'week', 'month', 'all') then
    return jsonb_build_object('success', false, 'reason', 'invalid');
  end if;

  update public.estacion
    set periodo_ranking = p_periodo, actualizado_en = now(), actualizado_por = auth.uid()
    where id;
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.estacion_set_sabor(p_sabor text, p_visible boolean)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'reason', 'forbidden');
  end if;
  if p_sabor is null or p_sabor !~ '^[a-z0-9-]{1,40}$' or p_visible is null then
    return jsonb_build_object('success', false, 'reason', 'invalid');
  end if;

  -- Un solo UPDATE: la fila queda bloqueada mientras se calcula el arreglo nuevo, asi que dos
  -- admins tocando sabores distintos al mismo tiempo no se pisan.
  update public.estacion
    set sabores_ocultos = case
          when p_visible then array_remove(sabores_ocultos, p_sabor)
          when p_sabor = any(sabores_ocultos) then sabores_ocultos
          else array_append(sabores_ocultos, p_sabor)
        end,
        actualizado_en = now(),
        actualizado_por = auth.uid()
    where id;
  return jsonb_build_object('success', true);
end;
$$;

-- Para cuando se surte todo, normalmente al abrir.
create or replace function public.estacion_mostrar_todos()
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'reason', 'forbidden');
  end if;

  update public.estacion
    set sabores_ocultos = '{}', actualizado_en = now(), actualizado_por = auth.uid()
    where id;
  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.estacion_set_periodo(text) from public, anon;
revoke all on function public.estacion_set_sabor(text, boolean) from public, anon;
revoke all on function public.estacion_mostrar_todos() from public, anon;
grant execute on function public.estacion_set_periodo(text) to authenticated;
grant execute on function public.estacion_set_sabor(text, boolean) to authenticated;
grant execute on function public.estacion_mostrar_todos() to authenticated;
