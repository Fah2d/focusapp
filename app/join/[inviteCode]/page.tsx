import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Workspace } from "@/types/database";

interface PageProps {
  params: Promise<{ inviteCode: string }>;
}

export default async function JoinPage({ params }: PageProps) {
  const { inviteCode } = await params;
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/auth/login");
  }

  // Look up workspace by invite code (full select avoids partial-type inference issues)
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("invite_code", inviteCode)
    .single();

  if (wsError || !workspace) {
    redirect("/dashboard");
  }

  const ws = workspace as Workspace;

  // Try to join — ignore duplicate (already a member)
  const { error: joinError } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: ws.id, user_id: user.id, role: "member" as const });

  if (joinError && joinError.code !== "23505") {
    console.error("Join error:", joinError);
    redirect("/dashboard");
  }

  redirect(`/dashboard/${ws.id}`);
}
