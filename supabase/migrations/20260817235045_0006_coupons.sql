create table public.coupons (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  dynamic_id       uuid not null references public.dynamics(id),
  status           text not null default 'active' check (status in ('active','redeemed','expired')),
  digital_awarded  boolean not null default true,
  physical_awarded boolean not null default false,
  redeemed_at      timestamptz,
  created_at       timestamptz not null default now(),
  unique (user_id, dynamic_id)
);
create index coupons_user_id_idx on public.coupons (user_id);
create index coupons_dynamic_id_idx on public.coupons (dynamic_id);
create index coupons_created_at_idx on public.coupons (created_at);

alter table public.coupons enable row level security;

create policy coupons_select_own_or_admin
  on public.coupons for select
  using (auth.uid() = user_id or public.is_admin());
