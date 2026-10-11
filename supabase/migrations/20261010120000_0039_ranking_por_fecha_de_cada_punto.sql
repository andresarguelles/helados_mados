-- 0039 — El ranking por periodo cuenta cada punto en la fecha en que se gano.
--
-- Bug encontrado por una clienta (Margaret) que escaneo su cupon de "Helado doble" el
-- sabado 2026-10-03 a las 16:04 y no aparecio en la pantalla del mostrador. El escaneo
-- SI sumo sus +10 a total_points; lo que fallaba era el ranking por periodo.
--
-- Hasta la 0025, las ramas day/week/month filtraban los cupones por `created_at` y sumaban
-- ahi el +1 digital Y el +10 fisico. Pero el +10 se gana al escanear (`redeemed_at`), que
-- puede ser dias despues de canjear la palabra. Su cupon se creo el martes 29 de septiembre:
-- el sabado no entraba en "hoy", ni en "semana" (que empieza en sabado), ni en "mes" (el
-- cupon era de septiembre). Al medirlo, 55 de 131 escaneos fisicos habian caido en un dia
-- distinto al de su cupon.
--
-- Ahora cada punto se ubica en su propia fecha: el +1 por `created_at` y el +10 por
-- `redeemed_at`. `scan_coupon` sella `redeemed_at` en el mismo update que pone
-- `physical_awarded`, y se verifico que ningun cupon fisico lo tiene nulo.
--
-- Se calcula al vuelo, asi que los periodos pasados se corrigen solos. La rama 'all' no
-- cambia, y la firma tampoco: ni la web ni Android tienen que tocar nada.

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
      where p.is_admin = false and p.username is not null
      order by p.total_points desc;
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
        select c.user_id, 1 as pts
        from public.coupons c
        where c.digital_awarded and c.created_at >= v_start and c.created_at < v_end
        union all
        -- +10 al escanear el QR en tienda: cuenta el dia del escaneo, no el del cupon.
        select c.user_id, 10 as pts
        from public.coupons c
        where c.physical_awarded and c.redeemed_at >= v_start and c.redeemed_at < v_end
      )
      select p.username, sum(x.pts)::int, coalesce(p.id = v_me, false)
      from puntos x join public.profiles p on p.id = x.user_id
      where p.is_admin = false and p.username is not null
      group by p.id, p.username
      order by 2 desc;
  end if;
end;
$$;

comment on function public.get_leaderboard(text) is
  'Marcador publico. NO devuelve el id del usuario a proposito: es_tu_fila se calcula contra auth.uid(), y va con coalesce para no devolver null cuando no hay sesion. En day/week/month el +1 cuenta por created_at y el +10 por redeemed_at.';

revoke all on function public.get_leaderboard(text) from public;
grant execute on function public.get_leaderboard(text) to anon, authenticated;

-- La rama del +10 ahora filtra por redeemed_at; solo importan los cupones escaneados.
create index if not exists coupons_redeemed_at_idx
  on public.coupons (redeemed_at) where physical_awarded;
