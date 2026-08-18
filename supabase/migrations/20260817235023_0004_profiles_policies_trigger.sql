alter table public.profiles enable row level security;

create policy profiles_select_own_or_admin
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

-- No insert/update/delete policies: profile creation only via the auth.users trigger below;
-- total_points/is_admin only mutable via SECURITY DEFINER RPCs.

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
