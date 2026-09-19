-- 0025 — es_tu_fila devuelve false, nunca null.
--
-- Bug de la 0024, encontrado al ejecutarla contra la base real: `p.id = v_me` con v_me
-- nulo no da false, da NULL. Y v_me es null justo en el caso mas comun de esta funcion,
-- que esta concedida a `anon` para pintar el Top 5 de la home publica.
--
-- En JavaScript null es falsy y el bug no se nota nunca. En Kotlin, deserializar null
-- sobre un Boolean no anulable lanza: la pantalla de inicio de la app reventaria para
-- cualquiera sin sesion. La logica de tres valores de SQL contra el booleano de dos
-- valores del cliente es una trampa que solo aparece al cruzar el limite, y que no se ve
-- leyendo el SQL — hay que ejecutarlo.

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
      select p.username,
        sum((case when c.digital_awarded then 1 else 0 end) + (case when c.physical_awarded then 10 else 0 end))::int,
        coalesce(p.id = v_me, false)
      from public.coupons c join public.profiles p on p.id = c.user_id
      where c.created_at >= v_start and c.created_at < v_end
        and p.is_admin = false and p.username is not null
      group by p.id, p.username
      having sum((case when c.digital_awarded then 1 else 0 end) + (case when c.physical_awarded then 10 else 0 end)) > 0
      order by 2 desc;
  end if;
end;
$$;

comment on function public.get_leaderboard(text) is
  'Marcador publico. NO devuelve el id del usuario a proposito: es_tu_fila se calcula contra auth.uid(), y va con coalesce para no devolver null cuando no hay sesion.';

revoke all on function public.get_leaderboard(text) from public;
grant execute on function public.get_leaderboard(text) to anon, authenticated;
