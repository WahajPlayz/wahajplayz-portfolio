create extension if not exists pgcrypto;

create table if not exists public.team_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  title text not null,
  description text not null default '',
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'done')),
  assignee_discord_id text,
  created_by_discord_id text,
  sort_order bigint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists team_tasks_project_id_idx on public.team_tasks (project_id);
create index if not exists team_tasks_assignee_discord_id_idx on public.team_tasks (assignee_discord_id);
create index if not exists team_tasks_sort_order_idx on public.team_tasks (sort_order);

create or replace function public.set_team_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_team_tasks_updated_at on public.team_tasks;

create trigger set_team_tasks_updated_at
before update on public.team_tasks
for each row
execute function public.set_team_tasks_updated_at();

alter table public.team_tasks enable row level security;

drop policy if exists "Authenticated users can view team tasks" on public.team_tasks;
create policy "Authenticated users can view team tasks"
on public.team_tasks
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can create team tasks" on public.team_tasks;
create policy "Authenticated users can create team tasks"
on public.team_tasks
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update team tasks" on public.team_tasks;
create policy "Authenticated users can update team tasks"
on public.team_tasks
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete team tasks" on public.team_tasks;
create policy "Authenticated users can delete team tasks"
on public.team_tasks
for delete
to authenticated
using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'team_tasks'
  ) then
    alter publication supabase_realtime add table public.team_tasks;
  end if;
end
$$;
