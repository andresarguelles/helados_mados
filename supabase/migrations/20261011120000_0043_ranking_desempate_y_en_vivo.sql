-- 0043 — El ranking desempata por quien llego primero, y la pantalla del mostrador se entera
-- de cada canje y cada escaneo al momento.
--
-- La idea del duenio: cuando un cliente cobra su QR en tienda, sus +10 tienen que verse en la
-- pantalla del mostrador en ese instante, y si lo meten al top del dia, ahi debe aparecer. La
-- 0039 ya ubica el +10 en el dia del escaneo. Quedaban dos huecos:
--
-- 1. EMPATES SIN REGLA. `get_leaderboard` ordenaba solo por puntos, asi que entre empatados el
--    orden lo decidia Postgres y podia cambiar de una consulta a otra: alguien empatado en el
--    lugar 10 entraba y salia de la pantalla. Decision del duenio: entre empatados va primero
--    QUIEN LLEGO ANTES a ese puntaje, es decir, quien gano su ultimo punto antes. El +1 cuenta
--    con la hora del canje y el +10 con la del escaneo, igual que la suma. En 'all' el total
--    incluye los bonos viejos, que no tienen hora: se usa el ultimo punto de cupon y, si no
--    hay ninguno, la creacion de la cuenta. El ultimo desempate es el apodo, para que el
--    orden sea siempre el mismo.
--
-- 2. LA PANTALLA PREGUNTABA CADA MINUTO. Ahora `coupons` entra a la publicacion de Realtime y
--    la pantalla relee el marcador en cuanto hay un canje o un escaneo. Realtime respeta RLS
--    (`coupons_select_own_or_admin`): el admin de la pantalla recibe todos; un usuario normal
--    que se suscribiera solo veria los suyos, que ya puede leer. No sale ningun dato nuevo.

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
      where p.is_admin = false and p.username is not null
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
      where p.is_admin = false and p.username is not null
      group by p.id, p.username
      -- Entre empatados, quien llego antes a ese puntaje (su ultimo punto de la ventana).
      order by 2 desc, max(x.t) asc, p.username asc;
  end if;
end;
$$;

comment on function public.get_leaderboard(text) is
  'Marcador publico. NO devuelve el id del usuario a proposito: es_tu_fila se calcula contra auth.uid(), y va con coalesce para no devolver null cuando no hay sesion. En day/week/month el +1 cuenta por created_at y el +10 por redeemed_at. Empates: primero quien llego antes a ese puntaje, luego el apodo.';

revoke all on function public.get_leaderboard(text) from public;
grant execute on function public.get_leaderboard(text) to anon, authenticated;

-- La pantalla del mostrador escucha los canjes y escaneos para releer el marcador al momento.
alter publication supabase_realtime add table public.coupons;
