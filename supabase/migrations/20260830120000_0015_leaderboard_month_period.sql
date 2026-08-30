create or replace function public.get_leaderboard(p_period text default 'all')
returns table(user_id uuid, username citext, points integer)
language plpgsql stable security definer set search_path = public
as $$
declare v_cutoff timestamptz;
begin
  if p_period = 'all' then
    return query
      select p.id, p.username, p.total_points
      from public.profiles p
      where p.is_admin = false
      order by p.total_points desc;
  else
    v_cutoff := now() - (case p_period
      when 'day' then interval '1 day'
      when 'week' then interval '7 days'
      else interval '1 month'
    end);
    return query
      select p.id, p.username,
        sum((case when c.digital_awarded then 1 else 0 end) + (case when c.physical_awarded then 10 else 0 end))::int
      from public.coupons c join public.profiles p on p.id = c.user_id
      where c.created_at > v_cutoff and p.is_admin = false
      group by p.id, p.username
      having sum((case when c.digital_awarded then 1 else 0 end) + (case when c.physical_awarded then 10 else 0 end)) > 0
      order by 3 desc;
  end if;
end;
$$;
