-- Move extensions out of public per Supabase lint recommendation.
alter extension citext set schema extensions;
alter extension btree_gist set schema extensions;

-- Functions that cast/return citext need extensions on their search_path now.
alter function public.get_leaderboard(text) set search_path = public, extensions;
alter function public.redeem_keyword(text, text) set search_path = public, extensions;

-- Lock down RPCs that should not be callable by anon/unauthenticated (get_leaderboard stays public by design).
revoke execute on function public.is_admin() from anon;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.redeem_keyword(text, text) from anon;
revoke execute on function public.scan_coupon(uuid) from anon;

-- Perf: avoid per-row re-evaluation of auth.uid()/is_admin() in RLS policies.
drop policy profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
  on public.profiles for select
  using ((select auth.uid()) = id or (select public.is_admin()));

drop policy coupons_select_own_or_admin on public.coupons;
create policy coupons_select_own_or_admin
  on public.coupons for select
  using ((select auth.uid()) = user_id or (select public.is_admin()));

-- Perf: consolidate the two overlapping SELECT-permissive policies on dynamics into one,
-- keep a separate policy for admin insert/update/delete only.
drop policy dynamics_select_active_public on public.dynamics;
drop policy dynamics_admin_all on public.dynamics;

create policy dynamics_select_active_or_admin
  on public.dynamics for select
  using ((starts_at <= now() and ends_at > now()) or (select public.is_admin()));

create policy dynamics_admin_write
  on public.dynamics for insert
  with check ((select public.is_admin()));
create policy dynamics_admin_update
  on public.dynamics for update
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy dynamics_admin_delete
  on public.dynamics for delete
  using ((select public.is_admin()));

-- Perf: cover the ip_redemption_logs -> dynamics foreign key.
create index ip_redemption_logs_dynamic_id_idx on public.ip_redemption_logs (dynamic_id);
