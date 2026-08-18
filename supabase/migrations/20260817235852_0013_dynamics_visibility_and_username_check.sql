-- Users need to see the dynamic behind their own past coupons (redeemed/expired history),
-- not just currently-active ones, or Account.tsx's coupon history breaks.
drop policy dynamics_select_active_or_admin on public.dynamics;
create policy dynamics_select_visible
  on public.dynamics for select
  using (
    (starts_at <= now() and ends_at > now())
    or (select public.is_admin())
    or exists (
      select 1 from public.coupons c
      where c.dynamic_id = dynamics.id and c.user_id = (select auth.uid())
    )
  );

-- Friendly pre-check for the register form (profiles isn't publicly readable by username).
create or replace function public.username_available(p_username citext)
returns boolean
language sql stable security definer set search_path = public
as $$
  select not exists (select 1 from public.profiles where username = p_username);
$$;
grant execute on function public.username_available(citext) to anon, authenticated;
