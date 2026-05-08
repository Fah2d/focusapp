"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { playLevelUpSound } from "@/lib/sounds";
import type { UserXP } from "@/types/rewards";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  userId: string;
  workspaceId: string;
}

export function LevelUpModal({ userId, workspaceId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [newLevel, setNewLevel] = useState<number | null>(null);
  const prevLevelRef = useRef<number | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`user_xp_level:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_xp",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as UserXP;
          if (row.workspace_id !== workspaceId) return;
          const prev = prevLevelRef.current;
          if (prev !== null && row.level > prev) {
            setNewLevel(row.level);
            playLevelUpSound();
            launchConfetti();
          }
          prevLevelRef.current = row.level;
        }
      )
      .subscribe();

    // Load initial level
    supabase
      .from("user_xp")
      .select("level")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) prevLevelRef.current = (data as { level: number }).level;
      });

    return () => { supabase.removeChannel(channel); };
  }, [userId, workspaceId, supabase]);

  function launchConfetti() {
    import("canvas-confetti").then((mod) => {
      const confetti = mod.default;
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ["#6366f1","#8b5cf6","#f59e0b","#10b981"] });
    });
  }

  return (
    <Dialog open={newLevel !== null} onOpenChange={() => setNewLevel(null)}>
      <DialogContent className="max-w-xs text-center space-y-4 py-8">
        <DialogTitle asChild>
          <VisuallyHidden.Root>Level Up</VisuallyHidden.Root>
        </DialogTitle>
        <div className="text-6xl">🎉</div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Level Up!</p>
          <p className="text-4xl font-black text-primary mt-1">Level {newLevel}</p>
        </div>
        <p className="text-sm text-muted-foreground">Keep crushing it — rewards await!</p>
        <button
          onClick={() => setNewLevel(null)}
          className="mt-2 text-xs font-medium text-primary hover:underline"
        >
          Continue
        </button>
      </DialogContent>
    </Dialog>
  );
}
