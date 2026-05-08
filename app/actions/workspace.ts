"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

export async function createWorkspace(name: string): Promise<{ error: string } | void> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log("[createWorkspace] user:", user?.id ?? null, "authError:", authError?.message ?? null);
  if (!user) redirect("/auth/login");

  // Generate workspace ID upfront so we can insert both rows without
  // needing to SELECT back after the first insert.
  // (The workspaces SELECT policy requires membership, so INSERT...select()
  //  returns nothing until workspace_members row exists — chicken and egg.)
  const workspaceId = randomUUID();

  try {
    const { error: wsError } = await supabase
      .from("workspaces")
      .insert({ id: workspaceId, name, owner_id: user.id });

    if (wsError) {
      console.error("[createWorkspace] workspace insert failed:", wsError);
      return { error: wsError.message };
    }

    const { error: memberError } = await supabase
      .from("workspace_members")
      .insert({ workspace_id: workspaceId, user_id: user.id, role: "owner" });

    if (memberError) {
      console.error("[createWorkspace] member insert failed:", memberError);
      return { error: memberError.message };
    }
  } catch (err) {
    console.error("[createWorkspace] unexpected throw:", err);
    return { error: err instanceof Error ? err.message : "Unexpected error" };
  }

  // redirect() throws NEXT_REDIRECT internally — must be outside try/catch
  // so Next.js can intercept it and send the navigation response to the client.
  redirect(`/dashboard/${workspaceId}`);
}

export async function joinWorkspace(inviteCode: string): Promise<{ error: string } | void> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Service client needed: user isn't a member yet, so the workspaces SELECT
  // RLS policy blocks the invite code lookup entirely.
  let serviceClient;
  try {
    serviceClient = createServiceClient();
  } catch (err) {
    console.error("[joinWorkspace] failed to create service client:", err);
    return { error: "Server configuration error. Contact support." };
  }

  const { data: workspace, error: wsError } = await serviceClient
    .from("workspaces")
    .select("id")
    .eq("invite_code", inviteCode.trim())
    .single();

  if (wsError || !workspace) {
    return { error: "No workspace found with that invite code." };
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspace.id, user_id: user.id, role: "member" });

  if (memberError) {
    // 23505 = unique_violation: already a member, navigate there
    if (memberError.code === "23505") redirect(`/dashboard/${workspace.id}`);
    return { error: memberError.message };
  }

  redirect(`/dashboard/${workspace.id}`);
}
