-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ================================================================
-- TABLES
-- ================================================================

-- Users extended profile (mirrors auth.users)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Workspaces
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references profiles(id) on delete cascade not null,
  invite_code text unique not null default substr(md5(random()::text), 1, 10),
  created_at timestamptz default now()
);

-- Workspace members
create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz default now(),
  unique(workspace_id, user_id)
);

-- Daily user status (resets daily)
create table if not exists user_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  status_text text not null default '',
  date date not null default current_date,
  unique(user_id, workspace_id, date)
);

-- Pomodoro sessions
create table if not exists pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes int not null default 25,
  completed boolean default false
);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table user_status enable row level security;
alter table pomodoro_sessions enable row level security;

-- ----------------------------------------------------------------
-- profiles policies
-- ----------------------------------------------------------------
create policy "profiles_select_all" on profiles
  for select using (true);

create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- ----------------------------------------------------------------
-- workspaces policies
-- ----------------------------------------------------------------
create policy "workspaces_select_member" on workspaces
  for select using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = workspaces.id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "workspaces_insert_authenticated" on workspaces
  for insert with check (auth.uid() = owner_id);

create policy "workspaces_update_owner" on workspaces
  for update using (auth.uid() = owner_id);

create policy "workspaces_delete_owner" on workspaces
  for delete using (auth.uid() = owner_id);

-- ----------------------------------------------------------------
-- workspace_members policies
-- ----------------------------------------------------------------
create policy "workspace_members_select" on workspace_members
  for select using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "workspace_members_insert_self" on workspace_members
  for insert with check (auth.uid() = user_id);

create policy "workspace_members_delete_own" on workspace_members
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- user_status policies
-- ----------------------------------------------------------------
create policy "user_status_select_workspace_member" on user_status
  for select using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = user_status.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "user_status_insert_own" on user_status
  for insert with check (auth.uid() = user_id);

create policy "user_status_update_own" on user_status
  for update using (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- pomodoro_sessions policies
-- ----------------------------------------------------------------
create policy "pomodoro_sessions_select_workspace_member" on pomodoro_sessions
  for select using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = pomodoro_sessions.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "pomodoro_sessions_insert_own" on pomodoro_sessions
  for insert with check (auth.uid() = user_id);

create policy "pomodoro_sessions_update_own" on pomodoro_sessions
  for update using (auth.uid() = user_id);

-- ================================================================
-- REALTIME PUBLICATIONS
-- ================================================================

-- Enable realtime for user_status and pomodoro_sessions tables
alter publication supabase_realtime add table user_status;
alter publication supabase_realtime add table pomodoro_sessions;

-- ================================================================
-- TRIGGER: auto-create profile on signup
-- ================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set
      name = coalesce(excluded.name, profiles.name),
      avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
