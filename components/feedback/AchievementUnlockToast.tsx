"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { playAchievementSound } from "@/lib/sounds";
import { RARITY_BG, RARITY_COLORS } from "@/lib/rewards-catalog";
import type { Achievement, UserAchievement } from "@/types/rewards";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: string;
  achievement: Achievement;
}

interface Props {
  userId: string;
  workspaceId: string;
}

export function AchievementUnlockToast({ userId, workspaceId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    // Cache of known achievement IDs already shown this session to avoid duplicates on reconnect
    const seen = new Set<string>();

    const channel = supabase
      .channel(`user_achievements:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_achievements",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const row = payload.new as UserAchievement;
          if (seen.has(row.achievement_id)) return;
          seen.add(row.achievement_id);

          const { data: ach } = await supabase
            .from("achievements")
            .select("*")
            .eq("id", row.achievement_id)
            .single();

          if (!ach) return;
          const achievement = ach as Achievement;
          playAchievementSound();

          setToasts((prev) => [...prev, { id: row.id, achievement }]);
          setTimeout(() => dismiss(row.id), 5000);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, workspaceId, supabase]);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-xl",
            "animate-in slide-in-from-right-8 fade-in duration-300",
            RARITY_BG[toast.achievement.rarity]
          )}
        >
          <span className="text-2xl">{toast.achievement.icon}</span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Achievement Unlocked
            </p>
            <p className={cn("text-sm font-bold", RARITY_COLORS[toast.achievement.rarity])}>
              {toast.achievement.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">{toast.achievement.description}</p>
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
