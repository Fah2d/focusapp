// DEV ONLY — remove GodModeLoader import before production
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { Workspace, Profile } from "@/types/database";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}

export default async function WorkspaceLayout({ children, params }: LayoutProps) {
  const { workspaceId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/auth/login");

  // Fetch user's profile
  const { data: profileRaw, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profileRaw) redirect("/auth/login");
  const profile = profileRaw as Profile;

  // Fetch active workspace
  const { data: workspaceRaw, error: wsError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (wsError || !workspaceRaw) redirect("/dashboard");
  const workspace = workspaceRaw as Workspace;

  // Fetch all workspaces the user belongs to (for switcher)
  const { data: membershipsRaw, error: membershipsError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id);

  if (membershipsError) console.error("Error fetching memberships:", membershipsError);

  const workspaceIds = ((membershipsRaw ?? []) as Array<{ workspace_id: string }>).map(
    (m) => m.workspace_id
  );

  const { data: allWorkspacesRaw } = workspaceIds.length > 0
    ? await supabase.from("workspaces").select("*").in("id", workspaceIds)
    : { data: [] };

  const allWorkspaces = (allWorkspacesRaw ?? []) as Workspace[];

  // Fetch today's user status for topbar
  const today = new Date().toISOString().split("T")[0];
  const { data: statusRaw } = await supabase
    .from("user_status")
    .select("status_text")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId)
    .eq("date", today)
    .maybeSingle();

  const initialStatus = (statusRaw as { status_text: string } | null)?.status_text ?? "";

  return (
    <>
      <DashboardShell
        workspace={workspace}
        workspaces={allWorkspaces}
        profile={profile}
        userId={user.id}
        userEmail={user.email ?? ""}
        workspaceId={workspaceId}
        initialStatus={initialStatus}
      >
        {children}
      </DashboardShell>
    </>
  );
}
