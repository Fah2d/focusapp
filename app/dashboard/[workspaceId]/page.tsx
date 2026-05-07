import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MemberGrid } from "@/components/workspace/member-grid";
import type { WorkspaceMemberWithProfile } from "@/types/database";

interface PageProps {
  params: Promise<{ workspaceId: string }>;
}

type StatusRow = { user_id: string; status_text: string };
type SessionRow = { user_id: string; duration_minutes: number };

export default async function WorkspacePage({ params }: PageProps) {
  const { workspaceId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/auth/login");

  // Verify membership
  const { error: memberError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (memberError) redirect("/dashboard");

  // Fetch members with profiles
  const { data: membersRaw, error: membersError } = await supabase
    .from("workspace_members")
    .select("*, profiles(*)")
    .eq("workspace_id", workspaceId)
    .order("joined_at");

  if (membersError) {
    console.error("Error fetching members:", membersError);
  }

  const members = (membersRaw ?? []) as WorkspaceMemberWithProfile[];

  // Fetch today's statuses
  const today = new Date().toISOString().split("T")[0];
  const { data: statusesRaw } = await supabase
    .from("user_status")
    .select("user_id, status_text")
    .eq("workspace_id", workspaceId)
    .eq("date", today);

  const statuses = (statusesRaw ?? []) as StatusRow[];

  // Fetch today's focus time per user
  const { data: sessionsRaw } = await supabase
    .from("pomodoro_sessions")
    .select("user_id, duration_minutes")
    .eq("workspace_id", workspaceId)
    .eq("completed", true)
    .gte("started_at", `${today}T00:00:00.000Z`);

  const sessions = (sessionsRaw ?? []) as SessionRow[];

  const focusStatsMap: Record<string, number> = {};
  for (const s of sessions) {
    focusStatsMap[s.user_id] = (focusStatsMap[s.user_id] ?? 0) + s.duration_minutes;
  }

  const focusStats = Object.entries(focusStatsMap).map(([user_id, minutes]) => ({
    user_id,
    minutes,
  }));

  return (
    <div className="animate-fade-in">
      <MemberGrid
        members={members}
        currentUserId={user.id}
        workspaceId={workspaceId}
        initialStatuses={statuses}
        initialFocusStats={focusStats}
      />
    </div>
  );
}
