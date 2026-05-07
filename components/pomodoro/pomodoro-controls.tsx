"use client";
import { useState, useEffect } from "react";
import { Settings, Lock, Pause, Play } from "lucide-react";
import { usePomodoroContext, getDuration } from "@/contexts/pomodoro-context";
import { TimerRing } from "./timer-ring";
import { PomodoroSettingsPanel } from "./pomodoro-settings";
import { Button } from "@/components/ui/button";
import { cn, formatCountdown } from "@/lib/utils";
import type { TimerMode } from "@/types/database";

const MODE_LABELS: Record<TimerMode, string> = {
  pomodoro: "Pomodoro",
  short_break: "Short Break",
  long_break: "Long Break",
};

export function PomodoroControls() {
  const {
    mode, isRunning, isPaused, startedAt, pausedSecondsLeft,
    currentSessionDuration, sessionCount, longBreakUnlocked, autoStartIn, settings,
    start, pause, resume, stop, switchMode, saveSettings,
  } = usePomodoroContext();

  const [showSettings, setShowSettings] = useState(false);

  // Local secondsLeft for display — resyncs from context state whenever it changes
  const [secondsLeft, setSecondsLeft] = useState(getDuration(mode, settings) * 60);

  useEffect(() => {
    if (isPaused && pausedSecondsLeft !== null) {
      setSecondsLeft(pausedSecondsLeft);
      return;
    }
    if (!isRunning || !startedAt) {
      setSecondsLeft(getDuration(mode, settings) * 60);
      return;
    }
    const totalSec = currentSessionDuration * 60;
    const compute = () =>
      Math.max(0, totalSec - Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    setSecondsLeft(compute());
    const id = setInterval(() => setSecondsLeft(compute()), 1000);
    return () => clearInterval(id);
  }, [isRunning, isPaused, startedAt, pausedSecondsLeft, mode, settings, currentSessionDuration]);

  const totalSeconds = (isRunning || isPaused) ? currentSessionDuration * 60 : getDuration(mode, settings) * 60;

  const nextLabel =
    sessionCount > 0 && sessionCount % 4 === 0 ? "Time for a long break!" : "Time to focus!";

  function handleSaveSettings(s: typeof settings) {
    saveSettings(s);
    setShowSettings(false);
  }

  // ── RUNNING ──────────────────────────────────────────────────────────────
  if (isRunning) {
    return (
      <div className="flex flex-col items-center gap-2">
        <TimerRing secondsLeft={secondsLeft} totalSeconds={totalSeconds} mode={mode} />
        <div className="flex items-center gap-3">
          <button
            onClick={pause}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pause className="h-2.5 w-2.5" />
            Pause
          </button>
          <button
            onClick={stop}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-current" />
            Stop
          </button>
        </div>
      </div>
    );
  }

  // ── PAUSED ───────────────────────────────────────────────────────────────
  if (isPaused) {
    return (
      <div className="flex flex-col items-center gap-2">
        <TimerRing secondsLeft={secondsLeft} totalSeconds={totalSeconds} mode={mode} paused />
        <div className="flex items-center gap-3">
          <button
            onClick={resume}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Play className="h-2.5 w-2.5" />
            Resume
          </button>
          <button
            onClick={stop}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-current" />
            Stop
          </button>
        </div>
      </div>
    );
  }

  // ── AUTO-START COUNTDOWN ─────────────────────────────────────────────────
  if (autoStartIn !== null) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-xs text-muted-foreground">Starting in {autoStartIn}…</p>
        <button
          onClick={stop}
          className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ── IDLE ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex w-full flex-col items-center gap-2 px-1">
      {/* Settings gear */}
      <button
        onClick={() => setShowSettings(true)}
        className="absolute -top-0.5 right-0 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
        title="Timer settings"
      >
        <Settings className="h-3.5 w-3.5" />
      </button>

      {/* Mode tabs */}
      <div className="flex w-full rounded-lg bg-secondary/50 p-0.5">
        {(["pomodoro", "short_break", "long_break"] as TimerMode[]).map((m) => {
          const locked = m === "long_break" && !longBreakUnlocked;
          return (
            <button
              key={m}
              onClick={() => switchMode(m)}
              disabled={locked}
              className={cn(
                "flex flex-1 items-center justify-center gap-0.5 rounded-md px-1 py-1 text-[10px] transition-colors",
                mode === m
                  ? "bg-background text-foreground shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground",
                locked && "cursor-not-allowed opacity-40"
              )}
            >
              {locked && <Lock className="h-2.5 w-2.5 flex-shrink-0" />}
              <span className="truncate">{MODE_LABELS[m]}</span>
            </button>
          );
        })}
      </div>

      {/* Large time display */}
      <span className="font-mono text-3xl font-bold tabular-nums leading-none">
        {formatCountdown(secondsLeft)}
      </span>

      {/* START button */}
      <Button
        size="sm"
        onClick={start}
        className="h-7 w-full text-xs font-semibold tracking-widest"
      >
        START
      </Button>

      {/* Session counter */}
      <p className="text-[11px] text-muted-foreground">
        #{sessionCount + 1} — {nextLabel}
      </p>

      {/* Settings panel */}
      {showSettings && (
        <PomodoroSettingsPanel
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
