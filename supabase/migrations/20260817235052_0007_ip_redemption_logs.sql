create table public.ip_redemption_logs (
  ip_hash     text not null,
  dynamic_id  uuid not null references public.dynamics(id) on delete cascade,
  count       integer not null default 0 check (count >= 0),
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  primary key (ip_hash, dynamic_id)
);

alter table public.ip_redemption_logs enable row level security;
-- No policies of any kind: table is completely inaccessible to anon/authenticated,
-- only SECURITY DEFINER functions (which bypass RLS) can touch it.
