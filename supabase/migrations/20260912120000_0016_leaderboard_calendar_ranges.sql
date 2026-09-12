-- Align 'day'/'week'/'month' leaderboard periods to real calendar boundaries
-- (America/Mexico_City) instead of rolling windows, with weeks running
-- Saturday through Friday. Also add get_leaderboard_range() so the client
-- can display the exact date range each period covers.

create or replace function public.get_leaderboard(p_period text default 'all')
returns table(user_id uuid, username citext, points integer)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_tz constant text := 'America/Mexico_City';
  v_local_date date;
  v_start timestamptz;
  v_end timestamptz;
  v_dow int;
  v_days_since_saturday int;
begin
  if p_period = 'all' then
    return query
      select p.id, p.username, p.total_points
      from public.profiles p
      where p.is_admin = false
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
      select p.id, p.username,
        sum((case when c.digital_awarded then 1 else 0 end) + (case when c.physical_awarded then 10 else 0 end))::int
      from public.coupons c join public.profiles p on p.id = c.user_id
      where c.created_at >= v_start and c.created_at < v_end and p.is_admin = false
      group by p.id, p.username
      having sum((case when c.digital_awarded then 1 else 0 end) + (case when c.physical_awarded then 10 else 0 end)) > 0
      order by 3 desc;
  end if;
end;
$$;

create or replace function public.get_leaderboard_range(p_period text)
returns table(range_start date, range_end date)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_tz constant text := 'America/Mexico_City';
  v_local_date date;
  v_start timestamptz;
  v_end timestamptz;
  v_dow int;
  v_days_since_saturday int;
begin
  if p_period = 'all' then
    return query select null::date, null::date;
    return;
  end if;

  v_local_date := (now() at time zone v_tz)::date;

  if p_period = 'day' then
    v_start := (v_local_date::timestamp) at time zone v_tz;
    v_end := v_start + interval '1 day';
  elsif p_period = 'week' then
    v_dow := extract(dow from v_local_date)::int;
    v_days_since_saturday := (v_dow + 1) % 7;
    v_start := ((v_local_date - v_days_since_saturday)::timestamp) at time zone v_tz;
    v_end := v_start + interval '7 days';
  else
    v_start := (date_trunc('month', v_local_date)::timestamp) at time zone v_tz;
    v_end := v_start + interval '1 month';
  end if;

  return query
    select (v_start at time zone v_tz)::date, ((v_end - interval '1 day') at time zone v_tz)::date;
end;
$$;

grant execute on function public.get_leaderboard_range(text) to anon, authenticated;
