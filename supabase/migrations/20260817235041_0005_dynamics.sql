create table public.dynamics (
  id                uuid primary key default gen_random_uuid(),
  keyword           citext not null,
  physical_stock    integer not null check (physical_stock >= 0),
  physical_redeemed integer not null default 0 check (physical_redeemed >= 0),
  starts_at         timestamptz not null,
  ends_at           timestamptz not null check (ends_at > starts_at),
  description       text not null default '',
  prize_label       text not null,
  created_at        timestamptz not null default now()
);

alter table public.dynamics
  add constraint dynamics_no_overlapping_keyword
  exclude using gist (lower(keyword::text) with =, tstzrange(starts_at, ends_at) with &&);

alter table public.dynamics enable row level security;

create policy dynamics_select_active_public
  on public.dynamics for select
  using (starts_at <= now() and ends_at > now());

create policy dynamics_admin_all
  on public.dynamics for all
  using (public.is_admin())
  with check (public.is_admin());
