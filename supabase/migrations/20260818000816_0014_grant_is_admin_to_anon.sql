-- RLS policies wrap is_admin() as `(select public.is_admin())`, which Postgres plans as an
-- InitPlan evaluated once per query regardless of role or row -- including for anon requests
-- reading public.dynamics, even when the first OR branch (active window) would already satisfy
-- the policy. Revoking EXECUTE from anon in 0012 broke anonymous reads of dynamics/leaderboard
-- data with "permission denied for function is_admin". is_admin() only reports the CALLER's own
-- admin status (false for anon), so granting it back to anon carries no privilege-escalation risk.
grant execute on function public.is_admin() to anon;
