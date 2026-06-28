-- Link Discord identities to Supabase auth users so the Polar webhook can
-- assign Discord roles to the buyer's Discord account on membership purchase.
alter table public.discord_users
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create index if not exists discord_users_auth_user_id_idx
  on public.discord_users (auth_user_id);
