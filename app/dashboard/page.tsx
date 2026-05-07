import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateWorkspaceForm } from "@/components/workspace/create-workspace-form";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) redirect("/auth/login");

  // Find user's first workspace
  const { data: membershipsRaw, error: memberError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1);

  if (memberError) {
    console.error("Error fetching workspaces:", memberError);
  }

  const memberships = (membershipsRaw ?? []) as Array<{ workspace_id: string }>;

  if (memberships.length > 0) {
    redirect(`/dashboard/${memberships[0].workspace_id}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <CreateWorkspaceForm userId={user.id} />
    </div>
  );
}
