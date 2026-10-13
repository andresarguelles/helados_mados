-- 0044 — Roles: cliente, staff, admin y superadmin.
--
-- Hasta aqui habia un solo nivel de acceso, el booleano `profiles.is_admin`. Decision del
-- duenio (2026-10-12):
--
--   cliente     — todos, por omision.
--   staff       — el personal del mostrador: escanea QR y maneja la Estacion y las pantallas.
--                 NO crea dinamicas ni ve palabras secretas futuras, y NO ve el panel de clientes.
--   admin       — lo de siempre: dinamicas, clientes, escaner, Estacion.
--   superadmin  — lo de admin, mas el panel de Metricas y el poder de asignar roles. Por ahora
--                 uno solo, y no hay forma de crear otro desde la app.
--
-- `role` es la fuente de verdad y `is_admin` se queda como ESPEJO, mantenido por un trigger.
-- Asi lo que lee la columna directamente sigue funcionando sin tocarlo: las edge functions de
-- borrado, `estacion_voz` de Alexa (que solo existe en produccion) y las APK ya instaladas.
--
-- Ni staff ni admins aparecen en el ranking: son personal de la tienda.

-- ─── 1. La columna ───────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists role text not null default 'cliente'
  constraint profiles_role_valido check (role in ('cliente', 'staff', 'admin', 'superadmin'));

update public.profiles set role = 'admin' where is_admin and role = 'cliente';

-- Se busca por correo y no por id: el id es generado y no debe vivir en una migracion.
update public.profiles set role = 'superadmin' where email = 'aarguellesgonzalez@gmail.com';

comment on column public.profiles.role is
  'cliente | staff | admin | superadmin. Fuente de verdad del acceso; is_admin es su espejo. Solo se cambia con asignar_rol (superadmin).';

-- ─── 2. is_admin como espejo ─────────────────────────────────────────────────
create or replace function public.profiles_rol_a_is_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.is_admin := new.role in ('admin', 'superadmin');
  return new;
end;
$$;

create trigger profiles_rol_a_is_admin
  before insert or update on public.profiles
  for each row execute function public.profiles_rol_a_is_admin();

comment on column public.profiles.is_admin is
  'Espejo de role in (admin, superadmin), mantenido por el trigger profiles_rol_a_is_admin. No se escribe a mano: el trigger lo pisa.';

-- ─── 3. Las funciones de permiso ─────────────────────────────────────────────
-- Las tres con los mismos permisos que is_admin() tenia: las politicas las evaluan tambien
-- para `anon` (la 0014 explica por que).
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role in ('admin', 'superadmin') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role in ('staff', 'admin', 'superadmin') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_superadmin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role = 'superadmin' from public.profiles where id = auth.uid()), false);
$$;

revoke all on function public.is_staff() from public;
revoke all on function public.is_superadmin() from public;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_superadmin() to anon, authenticated;

-- ─── 4. Lo que el staff si puede hacer: escanear y manejar la Estacion ───────
-- No se reescriben los cuerpos: en produccion las funciones de la Estacion delegan en los
-- `_estacion_aplicar_*` de la rama de Alexa (0034), que `main` no tiene. Se toma la definicion
-- que exista y se cambia SOLO la revision de permiso, asi esto vale en las dos ramas.
do $$
declare
  v_fn  text;
  v_def text;
begin
  foreach v_fn in array array[
    'public.scan_coupon(uuid)',
    'public.estacion_set_periodo(text)',
    'public.estacion_set_sabor(text, boolean)',
    'public.estacion_mostrar_todos()'
  ] loop
    v_def := pg_get_functiondef(v_fn::regprocedure);
    if position('public.is_admin()' in v_def) = 0 then
      raise exception 'La 0044 esperaba public.is_admin() en %', v_fn;
    end if;
    execute replace(v_def, 'public.is_admin()', 'public.is_staff()');
  end loop;
end;
$$;

-- La pantalla del ranking escucha `coupons` por Realtime (0043) y la de sabores lee `estacion`:
-- con sesion de staff tienen que seguir funcionando. El staff vera filas de cupones (ids y
-- fechas), pero no `profiles`: ahi sigue mandando is_admin().
alter policy coupons_select_own_or_admin on public.coupons
  using ((select auth.uid()) = user_id or (select public.is_staff()));
alter policy coupons_select_own_or_admin on public.coupons rename to coupons_select_own_or_staff;

alter policy estacion_select_admin on public.estacion
  using ((select public.is_staff()));
alter policy estacion_select_admin on public.estacion rename to estacion_select_staff;

-- ─── 5. El ranking es solo de clientes ───────────────────────────────────────
-- Identica a la 0043 salvo el filtro: `role = 'cliente'` en vez de `is_admin = false`.
create or replace function public.get_leaderboard(p_period text default 'all')
returns table(username citext, points integer, es_tu_fila boolean)
language plpgsql stable security definer set search_path = public, extensions
as $$
declare
  v_tz constant text := 'America/Mexico_City';
  v_me uuid := auth.uid();
  v_local_date date;
  v_start timestamptz;
  v_end timestamptz;
  v_dow int;
  v_days_since_saturday int;
begin
  if p_period = 'all' then
    return query
      select p.username, p.total_points, coalesce(p.id = v_me, false)
      from public.profiles p
      -- Cuando gano su ultimo punto de cupon: el momento en que llego a su total.
      left join lateral (
        select max(greatest(
                 case when c.digital_awarded then c.created_at end,
                 case when c.physical_awarded then c.redeemed_at end
               )) as t
        from public.coupons c
        where c.user_id = p.id
      ) u on true
      where p.role = 'cliente' and p.username is not null
      order by p.total_points desc, coalesce(u.t, p.created_at) asc, p.username asc;
  else
    v_local_date := (now() at time zone v_tz)::date;

    if p_period = 'day' then
      v_start := (v_local_date::timestamp) at time zone v_tz;
      v_end := v_start + interval '1 day';
    elsif p_period = 'week' then
      v_dow := extract(dow from v_local_date)::int; -- 0=sun .. 6=sat
      v_days_since_saturday := (v_dow + 1) % 7; -- sat=0, sun=1, ..., fri=6
      v_start := ((v_local_date - v_days_since_saturday)::timestamp) at time zone v_tz;
      v_end := v_start + interval '7 days';
    else
      v_start := (date_trunc('month', v_local_date)::timestamp) at time zone v_tz;
      v_end := v_start + interval '1 month';
    end if;

    return query
      with puntos as (
        -- +1 al canjear la palabra: cuenta el dia en que se creo el cupon.
        select c.user_id, 1 as pts, c.created_at as t
        from public.coupons c
        where c.digital_awarded and c.created_at >= v_start and c.created_at < v_end
        union all
        -- +10 al escanear el QR en tienda: cuenta el dia del escaneo, no el del cupon.
        select c.user_id, 10 as pts, c.redeemed_at as t
        from public.coupons c
        where c.physical_awarded and c.redeemed_at >= v_start and c.redeemed_at < v_end
      )
      select p.username, sum(x.pts)::int, coalesce(p.id = v_me, false)
      from puntos x join public.profiles p on p.id = x.user_id
      where p.role = 'cliente' and p.username is not null
      group by p.id, p.username
      -- Entre empatados, quien llego antes a ese puntaje (su ultimo punto de la ventana).
      order by 2 desc, max(x.t) asc, p.username asc;
  end if;
end;
$$;

comment on function public.get_leaderboard(text) is
  'Marcador publico, solo de clientes (role = cliente). NO devuelve el id del usuario a proposito: es_tu_fila se calcula contra auth.uid(), y va con coalesce para no devolver null cuando no hay sesion. En day/week/month el +1 cuenta por created_at y el +10 por redeemed_at. Empates: primero quien llego antes a ese puntaje, luego el apodo.';

revoke all on function public.get_leaderboard(text) from public;
grant execute on function public.get_leaderboard(text) to anon, authenticated;

-- ─── 6. Asignar roles: solo el superadmin, y con bitacora ────────────────────
-- Sin llaves foraneas, por la misma razon que `account_deletions`: la constancia de quien le
-- dio acceso a quien tiene que sobrevivir aunque cualquiera de los dos borre su cuenta.
create table if not exists public.cambios_de_rol (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  username      text,
  rol_anterior  text not null,
  rol_nuevo     text not null,
  ejecutado_por uuid not null,
  creado_en     timestamptz not null default now()
);

comment on table public.cambios_de_rol is
  'Bitacora de cambios de rol. Solo la escribe asignar_rol y solo la lee el superadmin.';

alter table public.cambios_de_rol enable row level security;

create policy cambios_de_rol_select_superadmin
  on public.cambios_de_rol for select
  to authenticated
  using ((select public.is_superadmin()));

revoke all on public.cambios_de_rol from anon;
revoke insert, update, delete, truncate on public.cambios_de_rol from authenticated;

create or replace function public.asignar_rol(p_usuario uuid, p_rol text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_yo  uuid := auth.uid();
  v_obj public.profiles;
begin
  if not public.is_superadmin() then
    return jsonb_build_object('success', false, 'reason', 'forbidden');
  end if;
  -- Nunca crea superadmins: ese rol no se reparte desde la app.
  if p_rol is null or p_rol not in ('cliente', 'staff', 'admin') then
    return jsonb_build_object('success', false, 'reason', 'invalid_role');
  end if;

  select * into v_obj from public.profiles where id = p_usuario for update;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;
  -- Quitarse el rol a uno mismo dejaria la tienda sin nadie que pueda devolverlo.
  if v_obj.id = v_yo then
    return jsonb_build_object('success', false, 'reason', 'self');
  end if;
  if v_obj.role = 'superadmin' then
    return jsonb_build_object('success', false, 'reason', 'target_superadmin');
  end if;
  if v_obj.username is null then
    return jsonb_build_object('success', false, 'reason', 'no_username');
  end if;
  -- Cuenta legacy que nunca vinculo Google: no tiene forma de entrar.
  if v_obj.email is null then
    return jsonb_build_object('success', false, 'reason', 'sin_acceso');
  end if;
  if v_obj.role = p_rol then
    return jsonb_build_object('success', false, 'reason', 'sin_cambio');
  end if;

  update public.profiles set role = p_rol where id = p_usuario;

  insert into public.cambios_de_rol (user_id, username, rol_anterior, rol_nuevo, ejecutado_por)
  values (v_obj.id, v_obj.username, v_obj.role, p_rol, v_yo);

  return jsonb_build_object('success', true, 'rol', p_rol);
end;
$$;

revoke all on function public.asignar_rol(uuid, text) from public, anon;
grant execute on function public.asignar_rol(uuid, text) to authenticated;
