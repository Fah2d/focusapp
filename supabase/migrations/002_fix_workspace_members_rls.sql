-- Fix infinite recursion in workspace_members_select policy.
--
-- The original policy checked membership by querying workspace_members from
-- within a policy on workspace_members. Postgres applies RLS on the subquery
-- too, so the policy triggers itself recursively.
--
-- Fix: a SECURITY DEFINER function runs as its definer (superuser), bypassing
-- RLS entirely, so the membership check never re-enters the policy.

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
  );
$$;

drop policy if exists "workspace_members_select" on public.workspace_members;

create policy "workspace_members_select" on public.workspace_members
  for select using (
    public.is_workspace_member(workspace_id)
  );
