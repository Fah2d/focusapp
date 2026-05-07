"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PomodoroState, WorkspaceMemberWithProfile } from "@/types/database";
import { usePomodoroContext } from "@/contexts/pomodoro-context";
import { MemberCard } from "./member-card";

interface UserStatusRow {
  user_id: string;
  status_text: string;
}

interface FocusStats {
  user_id: string;
  minutes: number;
}

interface Props {
  members: WorkspaceMemberWithProfile[];
  currentUserId: string;
  workspaceId: string;
  initialStatuses: UserStatusRow[];
  initialFocusStats: FocusStats[];
}

interface PresenceState {
  [key: string]: Array<{ user_id: string }>;
}

type SessionRow = { user_id: string; duration_minutes: number };

export function MemberGrid({
  members,
  currentUserId,
  workspaceId,
  initialStatuses,
  initialFocusStats,
}: Props) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const s of initialStatuses) map[s.user_id] = s.status_text;
    return map;
  });
  const [pomodoroStates, setPomodoroStates] = useState<Record<string, PomodoroState>>({});
  const [focusStats, setFocusStats] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const f of initialFocusStats) map[f.user_id] = f.minutes;
    return map;
  });

  const supabase = useMemo(() => createClient(), []);

  const { localState, sessionCount } = usePomodoroContext();

  // Stable ref so the subscribe callback always broadcasts the latest state
  const localStateRef = useRef(localState);
  useEffect(() => { localStateRef.current = localState; }, [localState]);

  // Refresh focus stats whenever the current user completes a session.
  // Track previous sessionCount so remounting (tab navigation) doesn't re-fire.
  const prevSessionCountRef = useRef(sessionCount);
  useEffect(() => {
    if (sessionCount <= prevSessionCountRef.current) {
      prevSessionCountRef.current = sessionCount;
      return;
    }
    prevSessionCountRef.current = sessionCount;
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("pomodoro_sessions")
      .select("user_id, duration_minutes")
      .eq("workspace_id", workspaceId)
      .eq("completed", true)
      .gte("started_at", `${today}T00:00:00.000Z`)
      .then(({ data }) => {
        if (!data) return;
        const rows = data as SessionRow[];
        const map: Record<string, number> = {};
        for (const s of rows) {
          map[s.user_id] = (map[s.user_id] ?? 0) + s.duration_minutes;
        }
        setFocusStats(map);
      });
  }, [sessionCount, workspaceId, supabase]);

  useEffect(() => {
    // ── Presence ──────────────────────────────────────────────────────────
    const presenceChannel = supabase.channel(`workspace:${workspaceId}`, {
      config: { presence: { key: currentUserId } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState() as PresenceState;
        const online = new Set<string>();
        for (const key of Object.keys(state)) {
          for (const p of state[key]) online.add(p.user_id);
        }
        setOnlineUsers(online);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: currentUserId });
        }
      });

    // ── Pomodoro broadcast (other members) ────────────────────────────────
    const pomodoroChannel = supabase.channel(`pomodoro:${workspaceId}`);
    pomodoroChannel
      .on("broadcast", { event: "pomodoro_update" }, ({ payload }) => {
        const state = payload as PomodoroState;
        if (state.user_id === currentUserId) return;
        setPomodoroStates((prev) => ({ ...prev, [state.user_id]: state }));

        if (!state.is_running && !state.paused) {
          const today = new Date().toISOString().split("T")[0];
          supabase
            .from("pomodoro_sessions")
            .select("user_id, duration_minutes")
            .eq("workspace_id", workspaceId)
            .eq("completed", true)
            .gte("started_at", `${today}T00:00:00.000Z`)
            .then(({ data }) => {
              if (!data) return;
              const rows = data as SessionRow[];
              const map: Record<string, number> = {};
              for (const s of rows) {
                map[s.user_id] = (map[s.user_id] ?? 0) + s.duration_minutes;
              }
              setFocusStats(map);
            });
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Immediately broadcast current state so newly joining members see us
          pomodoroChannel.send({
            type: "broadcast",
            event: "pomodoro_update",
            payload: localStateRef.current,
          });
        }
      });

    // ── Status realtime subscription ──────────────────────────────────────
    const today = new Date().toISOString().split("T")[0];
    const statusChannel = supabase
      .channel(`status:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_status",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const row = payload.new as { user_id: string; status_text: string; date: string };
          if (row.date === today) {
            setStatuses((prev) => ({ ...prev, [row.user_id]: row.status_text }));
          }
        }
      )
      .subscribe();

    return () => {
      presenceChannel.unsubscribe();
      pomodoroChannel.unsubscribe();
      statusChannel.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, currentUserId]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {members.map((member) => (
        <MemberCard
          key={member.user_id}
          profile={member.profiles}
          isOnline={onlineUsers.has(member.user_id)}
          isCurrentUser={member.user_id === currentUserId}
          status={statuses[member.user_id] ?? ""}
          pomodoroState={
            member.user_id === currentUserId
              ? localState
              : (pomodoroStates[member.user_id] ?? null)
          }
          focusMinutesToday={focusStats[member.user_id] ?? 0}
          workspaceId={workspaceId}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}
