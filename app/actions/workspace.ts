"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";

export async function createWorkspace(name: string): Promise<{ error: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // DEBUG: check whether the server action is reading a valid session
  console.log("[createWorkspace] auth.getUser →", { userId: user?.id ?? null, authError });

  if (!user) redirect("/auth/login");

  // DEBUG: temporarily using service role to bypass RLS and confirm the auth
  // session is the issue. If this succeeds but the normal insert fails, the
  // problem is that auth.uid() is null at the DB level despite getUser() returning
  // a user — meaning the anon-key client isn't forwarding the session JWT.
  // TODO: remove service client and revert to `supabase` once auth is confirmed working.
  const serviceClient = createServiceClient();

  const { data: workspace, error: wsError } = await serviceClient
    .from("workspaces")
    .insert({ name, owner_id: user.id })
    .select()
    .single();

  console.log("[createWorkspace] workspace insert →", { workspaceId: workspace?.id ?? null, wsError });

  if (wsError || !workspace) {
    return { error: wsError?.message ?? "Failed to create workspace" };
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspace.id, user_id: user.id, role: "owner" });

  if (memberError) {
    return { error: memberError.message };
  }

  redirect(`/dashboard/${workspace.id}`);
}

export async function joinWorkspace(inviteCode: string): Promise<{ error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Service client needed here: the user isn't a member yet so the workspaces
  // RLS policy (select only if already a member) blocks the lookup entirely.
  const serviceClient = createServiceClient();

  const { data: workspace, error: wsError } = await serviceClient
    .from("workspaces")
    .select("id, name")
    .eq("invite_code", inviteCode.trim())
    .single();

  if (wsError || !workspace) {
    return { error: "No workspace found with that invite code." };
  }

  // Authenticated client for the insert so auth.uid() = user_id satisfies RLS.
  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspace.id, user_id: user.id, role: "member" });

  if (memberError) {
    // 23505 = unique_violation: user is already a member, just navigate there.
    if (memberError.code === "23505") redirect(`/dashboard/${workspace.id}`);
    return { error: memberError.message };
  }

  redirect(`/dashboard/${workspace.id}`);
}
