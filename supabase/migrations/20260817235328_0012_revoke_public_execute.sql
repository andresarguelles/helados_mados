-- PUBLIC grants apply to every role including anon/authenticated regardless of
-- explicit per-role revokes, which is why is_admin()/handle_new_user() were still
-- listed as anon-executable after 0011. Revoke from PUBLIC directly; authenticated
-- keeps its own explicit grant on is_admin() for self-checks.
revoke execute on function public.is_admin() from public;
revoke execute on function public.handle_new_user() from public;
grant execute on function public.is_admin() to authenticated;
