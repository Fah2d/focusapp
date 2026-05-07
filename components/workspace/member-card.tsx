"use client";
import { useState, useEffect } from "react";
import type { Profile, PomodoroState, TimerMode } from "@/types/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TimerRing } from "@/components/pomodoro/timer-ring";
import { PomodoroControls } from "@/components/pomodoro/pomodoro-controls";
import { StatusInput } from "@/components/status/status-input";
import { formatFocusTime, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { BarChart2 } from "lucide-react";
import { ReportPanel } from "@/components/workspace/ReportPanel";
import { DailyTodoPopover } from "@/components/workspace/DailyTodoPopover";

// Border color + outer glow per mode, with dimmed variants for paused state.
// Background is NEVER changed — only border and shadow.
const GLOW: Record<TimerMode, { run: string; paused: string }> = {
  pomodoro: {
    run:    "border-rose-500   shadow-[0_0_18px_4px_rgba(239,68,68,0.45)]",
    paused: "border-rose-500/30 shadow-[0_0_10px_2px_rgba(239,68,68,0.15)]",
  },
  short_break: {
    run:    "border-blue-400   shadow-[0_0_18px_4px_rgba(59,130,246,0.45)]",
    paused: "border-blue-400/30 shadow-[0_0_10px_2px_rgba(59,130,246,0.15)]",
  },
  long_break: {
    run:    "border-indigo-400   shadow-[0_0_18px_4px_rgba(99,102,241,0.45)]",
    paused: "border-indigo-400/30 shadow-[0_0_10px_2px_rgba(99,102,241,0.15)]",
  },
};

interface Props {
  profile: Profile;
  isOnline: boolean;
  isCurrentUser: boolean;
  status: string;
  pomodoroState: PomodoroState | null;
  focusMinutesToday: number;
  workspaceId: string;
  currentUserId: string;
}

export function MemberCard({
  profile,
  isOnline,
  isCurrentUser,
  status,
  pomodoroState,
  focusMinutesToday,
  workspaceId,
  currentUserId,
}: Props) {
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!pomodoroState?.is_running) {
      setSecondsLeft((pomodoroState?.duration_minutes ?? 25) * 60);
      return;
    }
    if (pomodoroState.paused) {
      setSecondsLeft(pomodoroState.paused_seconds_left ?? pomodoroState.duration_minutes * 60);
      return;
    }
    if (!pomodoroState.started_at) {
      setSecondsLeft(pomodoroState.duration_minutes * 60);
      return;
    }
    const compute = () => {
      const elapsed = Math.floor(
        (Date.now() - new Date(pomodoroState.started_at!).getTime()) / 1000
      );
      return Math.max(0, pomodoroState.duration_minutes * 60 - elapsed);
    };
    setSecondsLeft(compute());
    const id = setInterval(() => setSecondsLeft(compute()), 1000);
    return () => clearInterval(id);
  }, [pomodoroState]);

  // Active = running or paused (session in progress)
  const activeMode: TimerMode | null = pomodoroState?.is_running ? pomodoroState.mode : null;
  const isPaused = activeMode ? (pomodoroState?.paused ?? false) : false;

  const glowClass = activeMode
    ? GLOW[activeMode][isPaused ? "paused" : "run"]
    : "";

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center gap-3 rounded-2xl border p-5 transition-all duration-500",
        "bg-card/50 backdrop-blur-sm",
        activeMode
          ? glowClass
          : cn(
              isOnline ? "border-border hover:border-primary/40" : "border-border/50",
              !isOnline && "opacity-75"
            ),
        isCurrentUser && "ring-1 ring-primary/20"
      )}
    >
      {/* Top-right: todo icon + report icon + online indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <DailyTodoPopover
          memberId={profile.id}
          memberName={profile.name}
          workspaceId={workspaceId}
          isOwner={isCurrentUser}
        />
        <button
          onClick={() => setReportOpen(true)}
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          title={`View ${profile.name}'s focus report`}
        >
          <BarChart2 className="size-3.5 text-muted-foreground" />
        </button>
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            isOnline ? "bg-green-400 shadow-sm shadow-green-400/50" : "bg-muted-foreground/40"
          )}
        />
      </div>

      {/* Avatar */}
      <Avatar className="h-14 w-14 ring-2 ring-border">
        <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.name} />
        <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
          {getInitials(profile.name)}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <div className="text-center">
        <p className="font-semibold text-sm leading-tight">
          {profile.name}
          {isCurrentUser && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
        </p>
      </div>

      {/* Status */}
      <div className="w-full text-center min-h-[20px]">
        {isCurrentUser ? (
          <StatusInput
            userId={currentUserId}
            workspaceId={workspaceId}
            initialStatus={status}
          />
        ) : (
          <p className="text-xs text-muted-foreground truncate px-2">
            {status || <span className="italic opacity-50">no status</span>}
          </p>
        )}
      </div>

      {/* Pomodoro */}
      <div className="flex w-full flex-col items-center gap-2">
        {isCurrentUser ? (
          <PomodoroControls />
        ) : pomodoroState?.is_running ? (
          <TimerRing
            secondsLeft={secondsLeft}
            totalSeconds={pomodoroState.duration_minutes * 60}
            mode={pomodoroState.mode}
            paused={pomodoroState.paused}
          />
        ) : null}
      </div>

      {/* Focus time today */}
      {focusMinutesToday > 0 && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span>🎯</span>
          <span>{formatFocusTime(focusMinutesToday)} today</span>
        </div>
      )}

      <ReportPanel
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        memberId={profile.id}
        memberName={profile.name}
        workspaceId={workspaceId}
      />
    </div>
  );
}
