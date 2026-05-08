"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { XPEvent } from "@/types/rewards";

interface FloatingXP {
  id: string;
  amount: number;
  x: number;
}

interface Props {
  userId: string;
  workspaceId: string;
}

export function XPGainAnimation({ userId, workspaceId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<FloatingXP[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel(`xp_events:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "xp_events",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const ev = payload.new as XPEvent;
          if (ev.workspace_id !== workspaceId) return;
          const id = ev.id;
          const x = 40 + Math.random() * 20; // percent from left
          setItems((prev) => [...prev, { id, amount: ev.amount, x }]);
          setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 1700);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, workspaceId, supabase]);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {items.map((item) => (
        <div
          key={item.id}
          className="xp-float absolute bottom-24 text-sm font-bold text-primary drop-shadow-lg"
          style={{ left: `${item.x}%` }}
        >
          +{item.amount} XP
        </div>
      ))}
    </div>
  );
}
