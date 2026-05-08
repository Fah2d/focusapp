import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateWorkspaceForm } from "@/components/workspace/create-workspace-form";
import { WorkspacePicker } from "@/components/workspace/WorkspacePicker";
import type { Workspace } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/auth/login");

  const { data: membershipsRaw, error: memberError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id);

  if (memberError) console.error("Error fetching workspaces:", memberError);

  const memberships = (membershipsRaw ?? []) as Array<{ workspace_id: string }>;

  if (memberships.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <CreateWorkspaceForm userId={user.id} />
      </div>
    );
  }

  if (memberships.length === 1) {
    redirect(`/dashboard/${memberships[0].workspace_id}`);
  }

  // Multiple workspaces — show picker
  const workspaceIds = memberships.map(m => m.workspace_id);

  const [workspacesRes, countsRes] = await Promise.all([
    supabase.from("workspaces").select("*").in("id", workspaceIds),
    supabase.from("workspace_members").select("workspace_id").in("workspace_id", workspaceIds),
  ]);

  const workspaces = (workspacesRes.data ?? []) as Workspace[];

  const memberCounts: Record<string, number> = {};
  ((countsRes.data ?? []) as Array<{ workspace_id: string }>).forEach(row => {
    memberCounts[row.workspace_id] = (memberCounts[row.workspace_id] ?? 0) + 1;
  });

  return (
    <WorkspacePicker
      workspaces={workspaces}
      memberCounts={memberCounts}
      userId={user.id}
    />
  );
}
