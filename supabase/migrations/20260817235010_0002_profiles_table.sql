create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      citext not null unique,
  total_points  integer not null default 0 check (total_points >= 0),
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);
