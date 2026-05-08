import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserXP } from "@/types/rewards";

export type XPReason =
  | "pomodoro_complete"
  | "combo_bonus"
  | "task_complete"
  | "daily_todo_complete"
  | "subtask_complete"
  | "achievement_reward"
  | "first_login";

export function computeLevel(totalXp: number): number {
  return Math.min(100, Math.floor(Math.sqrt(totalXp / 100)) + 1);
}

export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

export function xpProgress(totalXp: number): { level: number; current: number; needed: number; pct: number } {
  const level = computeLevel(totalXp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(Math.min(level + 1, 100));
  const current = totalXp - floor;
  const needed = ceil - floor;
  return { level, current, needed, pct: needed > 0 ? Math.min(100, (current / needed) * 100) : 100 };
}

export interface AwardResult {
  newXP: number;
  newLevel: number;
  prevLevel: number;
  leveledUp: boolean;
  newlyUnlocked: string[];
}

export async function awardXP(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  amount: number,
  reason: XPReason,
  metadata?: Record<string, unknown>
): Promise<AwardResult> {
  await supabase.from("xp_events").insert({
    user_id: userId,
    workspace_id: workspaceId,
    amount,
    reason,
    metadata: metadata ?? null,
  });

  const { data: current } = await supabase
    .from("user_xp")
    .select("total_xp, level")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const prevXP = (current as UserXP | null)?.total_xp ?? 0;
  const prevLevel = (current as UserXP | null)?.level ?? 1;
  const newXP = prevXP + amount;
  const newLevel = computeLevel(newXP);

  await supabase.from("user_xp").upsert(
    { user_id: userId, workspace_id: workspaceId, total_xp: newXP, level: newLevel },
    { onConflict: "user_id,workspace_id" }
  );

  const newlyUnlocked = reason !== "achievement_reward"
    ? await checkAchievements(supabase, userId, workspaceId, reason, newXP, newLevel)
    : [];

  return { newXP, newLevel, prevLevel, leveledUp: newLevel > prevLevel, newlyUnlocked };
}

export async function spendXP(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  amount: number
): Promise<boolean> {
  const { data: current } = await supabase
    .from("user_xp")
    .select("total_xp, level")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const currentXP = (current as UserXP | null)?.total_xp ?? 0;
  if (currentXP < amount) return false;

  const newXP = currentXP - amount;
  await supabase.from("user_xp").upsert(
    { user_id: userId, workspace_id: workspaceId, total_xp: newXP, level: computeLevel(newXP) },
    { onConflict: "user_id,workspace_id" }
  );
  return true;
}

async function checkAchievements(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  reason: XPReason,
  newXP: number,
  newLevel: number
): Promise<string[]> {
  const { data: existing } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);

  const unlocked = new Set((existing ?? []).map((u: { achievement_id: string }) => u.achievement_id));
  const toUnlock: Array<{ id: string; xp: number }> = [];

  async function countEvents(r: XPReason): Promise<number> {
    const { count } = await supabase
      .from("xp_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("reason", r);
    return count ?? 0;
  }

  if (reason === "pomodoro_complete") {
    const c = await countEvents("pomodoro_complete");
    if (c >= 1)   check("first_pomodoro", 50);
    if (c >= 5)   check("focus_5", 100);
    if (c >= 25)  check("focus_25", 200);
    if (c >= 100) check("focus_100", 500);
    if (c >= 500) check("focus_500", 1000);
    // Early bird / night owl
    const h = new Date().getHours();
    if (h < 8)  check("early_bird", 200);
    if (h >= 22) check("night_owl", 200);
  }

  if (reason === "combo_bonus") {
    const c = await countEvents("combo_bonus");
    if (c >= 1)  check("combo_4", 150);
    if (c >= 10) check("combo_master", 300);
  }

  if (reason === "task_complete") {
    const c = await countEvents("task_complete");
    if (c >= 1)   check("first_task", 50);
    if (c >= 10)  check("tasks_10", 150);
    if (c >= 50)  check("tasks_50", 300);
    if (c >= 200) check("tasks_200", 750);
  }

  if (reason === "daily_todo_complete") {
    const c = await countEvents("daily_todo_complete");
    if (c >= 1)   check("first_todo", 25);
    if (c >= 100) check("todos_100", 400);
  }

  if (reason === "subtask_complete") {
    const c = await countEvents("subtask_complete");
    if (c >= 50) check("subtasks_50", 200);
  }

  // XP / level milestones — checked on any award
  if (newXP >= 1000)  check("xp_1000", 100);
  if (newXP >= 5000)  check("xp_5000", 250);
  if (newXP >= 25000) check("xp_25000", 500);
  if (newLevel >= 5)  check("level_5", 100);
  if (newLevel >= 10) check("level_10", 200);
  if (newLevel >= 25) check("level_25", 500);
  if (newLevel >= 50) check("level_50", 1000);

  function check(id: string, xp: number) {
    if (!unlocked.has(id)) toUnlock.push({ id, xp });
  }

  if (toUnlock.length === 0) return [];

  const newlyUnlocked: string[] = [];
  for (const { id, xp } of toUnlock) {
    const { error } = await supabase.from("user_achievements").insert({
      user_id: userId,
      achievement_id: id,
    });
    if (!error) {
      newlyUnlocked.push(id);
      if (xp > 0) {
        await supabase.from("xp_events").insert({
          user_id: userId,
          workspace_id: workspaceId,
          amount: xp,
          reason: "achievement_reward",
          metadata: { achievement_id: id },
        });
        const { data: cur } = await supabase
          .from("user_xp")
          .select("total_xp")
          .eq("user_id", userId)
          .eq("workspace_id", workspaceId)
          .maybeSingle();
        const cur_xp = (cur as { total_xp: number } | null)?.total_xp ?? 0;
        const nxp = cur_xp + xp;
        await supabase.from("user_xp").upsert(
          { user_id: userId, workspace_id: workspaceId, total_xp: nxp, level: computeLevel(nxp) },
          { onConflict: "user_id,workspace_id" }
        );
      }
    }
  }

  return newlyUnlocked;
}
