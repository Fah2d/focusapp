"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import type { PomodoroState, TimerMode } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { awardXP } from "@/lib/xp-engine";
import { playPomodoroCompletionForPack } from "@/lib/sounds";
import {
  DEFAULT_SETTINGS,
  type PomodoroSettingsData,
} from "@/components/pomodoro/pomodoro-settings";

const STORAGE_KEY = "focusapp_pomodoro_settings";

function loadSettings(): PomodoroSettingsData {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<PomodoroSettingsData>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function getDuration(mode: TimerMode, s: PomodoroSettingsData): number {
  if (mode === "pomodoro") return s.pomodoroDuration;
  if (mode === "short_break") return s.shortBreakDuration;
  return s.longBreakDuration;
}

export interface PomodoroContextValue {
  mode: TimerMode;
  isRunning: boolean;
  isPaused: boolean;
  startedAt: string | null;
  pausedSecondsLeft: number | null;
  currentSessionDuration: number;
  sessionCount: number;
  longBreakUnlocked: boolean;
  autoStartIn: number | null;
  settings: PomodoroSettingsData;
  localState: PomodoroState;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  switchMode: (m: TimerMode) => void;
  saveSettings: (s: PomodoroSettingsData) => void;
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

export function usePomodoroContext(): PomodoroContextValue {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoroContext must be used within PomodoroProvider");
  return ctx;
}

interface Props {
  userId: string;
  workspaceId: string;
  children: React.ReactNode;
}

export function PomodoroProvider({ userId, workspaceId, children }: Props) {
  const [settings, setSettings] = useState<PomodoroSettingsData>(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [pausedSecondsLeft, setPausedSecondsLeft] = useState<number | null>(null);
  // Duration (minutes) locked at session start — unaffected by mid-session settings changes
  const [currentSessionDuration, setCurrentSessionDuration] = useState(
    DEFAULT_SETTINGS.pomodoroDuration
  );
  const [sessionCount, setSessionCount] = useState(0);
  const [longBreakUnlocked, setLongBreakUnlocked] = useState(false);
  const [autoStartIn, setAutoStartIn] = useState<number | null>(null);

  const completionRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Real session start time for DB inserts — survives pause/resume
  const originalStartedAtRef = useRef<string | null>(null);

  // Stable refs so interval callbacks always see current values without deps
  const settingsRef = useRef<PomodoroSettingsData>(DEFAULT_SETTINGS);
  const modeRef = useRef<TimerMode>("pomodoro");
  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);
  const startedAtRef = useRef<string | null>(null);
  const pausedSecondsLeftRef = useRef<number | null>(null);
  const sessionCountRef = useRef(0);
  const longBreakUnlockedRef = useRef(false);
  const autoStartInRef = useRef<number | null>(null);
  const currentSessionDurationRef = useRef(DEFAULT_SETTINGS.pomodoroDuration);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { startedAtRef.current = startedAt; }, [startedAt]);
  useEffect(() => { pausedSecondsLeftRef.current = pausedSecondsLeft; }, [pausedSecondsLeft]);
  useEffect(() => { sessionCountRef.current = sessionCount; }, [sessionCount]);
  useEffect(() => { longBreakUnlockedRef.current = longBreakUnlocked; }, [longBreakUnlocked]);
  useEffect(() => { autoStartInRef.current = autoStartIn; }, [autoStartIn]);
  useEffect(() => { currentSessionDurationRef.current = currentSessionDuration; }, [currentSessionDuration]);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    settingsRef.current = loaded;
  }, []);

  // Broadcast helper — stable ref so it can be called from intervals
  const broadcastRef = useRef<(s: PomodoroState) => void>(() => {});
  const broadcastFn = useCallback(
    (state: PomodoroState) => {
      const ch = supabase.channel(`pomodoro:${workspaceId}`);
      ch.send({ type: "broadcast", event: "pomodoro_update", payload: state });
    },
    [supabase, workspaceId]
  );
  useEffect(() => { broadcastRef.current = broadcastFn; }, [broadcastFn]);

  const playSound = useCallback(() => {
    if (!settingsRef.current.soundEnabled) return;
    try {
      const pack = (typeof window !== "undefined" ? localStorage.getItem("focusapp_sound_pack") : null) ?? "default";
      playPomodoroCompletionForPack(pack);
    } catch { /* AudioContext unavailable */ }
  }, []);

  // Forward refs so handleDone/beginAutoStart can call each other without deps
  const doStartRef = useRef<(m: TimerMode) => void>(() => {});
  const beginAutoStartRef = useRef<(m: TimerMode) => void>(() => {});

  const doStart = useCallback(
    (timerMode: TimerMode) => {
      const duration = getDuration(timerMode, settingsRef.current);
      const now = new Date().toISOString();
      if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
      originalStartedAtRef.current = now;
      const vals = {
        mode: timerMode,
        startedAt: now,
        isRunning: true,
        isPaused: false,
        autoStartIn: null as number | null,
        pausedSecondsLeft: null as number | null,
        currentSessionDuration: duration,
      };
      modeRef.current = timerMode;
      startedAtRef.current = now;
      isRunningRef.current = true;
      isPausedRef.current = false;
      autoStartInRef.current = null;
      pausedSecondsLeftRef.current = null;
      currentSessionDurationRef.current = duration;
      setMode(vals.mode);
      setStartedAt(vals.startedAt);
      setIsRunning(vals.isRunning);
      setIsPaused(vals.isPaused);
      setAutoStartIn(vals.autoStartIn);
      setPausedSecondsLeft(vals.pausedSecondsLeft);
      setCurrentSessionDuration(vals.currentSessionDuration);
      broadcastRef.current({
        user_id: userId,
        is_running: true,
        paused: false,
        paused_seconds_left: null,
        started_at: now,
        duration_minutes: duration,
        mode: timerMode,
        session_count: sessionCountRef.current,
      });
    },
    [userId]
  );
  useEffect(() => { doStartRef.current = doStart; }, [doStart]);

  const beginAutoStart = useCallback((nextMode: TimerMode) => {
    if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
    setAutoStartIn(3);
    autoStartInRef.current = 3;
    let count = 3;
    autoIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
        setAutoStartIn(null);
        autoStartInRef.current = null;
        doStartRef.current(nextMode);
      } else {
        setAutoStartIn(count);
        autoStartInRef.current = count;
      }
    }, 1000);
  }, []);
  useEffect(() => { beginAutoStartRef.current = beginAutoStart; }, [beginAutoStart]);

  const handleDone = useCallback(
    async (finishedMode: TimerMode) => {
      if (completionRef.current) clearInterval(completionRef.current);
      playSound();

      let newCount = sessionCountRef.current;
      const origStart = originalStartedAtRef.current;

      if (finishedMode === "pomodoro" && origStart) {
        const sessionPayload = {
          user_id: userId,
          workspace_id: workspaceId,
          started_at: origStart,
          ended_at: new Date().toISOString(),
          duration_minutes: currentSessionDurationRef.current,
          completed: true,
        };
        const { error } = await supabase.from("pomodoro_sessions").insert(sessionPayload);
        if (error) console.error("Error saving session:", error);
        else console.log("SESSION SAVED", sessionPayload);

        newCount = sessionCountRef.current + 1;
        setSessionCount(newCount);
        sessionCountRef.current = newCount;

        if (newCount >= 4 && !longBreakUnlockedRef.current) {
          setLongBreakUnlocked(true);
          longBreakUnlockedRef.current = true;
        }

        // Award XP for pomodoro completion
        await awardXP(supabase, userId, workspaceId, 50, "pomodoro_complete");
        // Combo bonus every 4th session
        if (newCount % 4 === 0) {
          await awardXP(supabase, userId, workspaceId, 25, "combo_bonus", { session_count: newCount });
        }
      }

      originalStartedAtRef.current = null;

      const nextMode: TimerMode =
        finishedMode === "pomodoro"
          ? newCount % 4 === 0 ? "long_break" : "short_break"
          : "pomodoro";

      const nextDuration = getDuration(nextMode, settingsRef.current);

      broadcastRef.current({
        user_id: userId,
        is_running: false,
        paused: false,
        paused_seconds_left: null,
        started_at: null,
        duration_minutes: nextDuration,
        mode: nextMode,
        session_count: newCount,
      });

      setIsRunning(false); isRunningRef.current = false;
      setIsPaused(false); isPausedRef.current = false;
      setStartedAt(null); startedAtRef.current = null;
      setPausedSecondsLeft(null); pausedSecondsLeftRef.current = null;
      setMode(nextMode); modeRef.current = nextMode;
      setCurrentSessionDuration(nextDuration);
      currentSessionDurationRef.current = nextDuration;

      if (finishedMode === "pomodoro" && settingsRef.current.autoStartBreaks) {
        beginAutoStartRef.current(nextMode);
      } else if (finishedMode !== "pomodoro" && settingsRef.current.autoStartPomodoros) {
        beginAutoStartRef.current("pomodoro");
      }
    },
    [userId, workspaceId, supabase, playSound]
  );

  const handleDoneRef = useRef(handleDone);
  useEffect(() => { handleDoneRef.current = handleDone; }, [handleDone]);

  // Lightweight completion detection — survives tab changes because PomodoroProvider never unmounts
  useEffect(() => {
    if (!isRunning || isPaused || !startedAt) {
      if (completionRef.current) clearInterval(completionRef.current);
      return;
    }
    const totalSeconds = currentSessionDuration * 60;
    completionRef.current = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - new Date(startedAt).getTime()) / 1000
      );
      if (elapsed >= totalSeconds) {
        handleDoneRef.current(modeRef.current);
      }
    }, 1000);
    return () => {
      if (completionRef.current) clearInterval(completionRef.current);
    };
  }, [isRunning, isPaused, startedAt, currentSessionDuration]);

  useEffect(() => {
    return () => {
      if (completionRef.current) clearInterval(completionRef.current);
      if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
    };
  }, []);

  // ── Public actions (all stable — use refs internally) ──────────────────

  const start = useCallback(() => {
    doStart(modeRef.current);
  }, [doStart]);

  const pause = useCallback(() => {
    if (!isRunningRef.current || isPausedRef.current) return;
    if (completionRef.current) clearInterval(completionRef.current);
    const totalSec = currentSessionDurationRef.current * 60;
    const sAt = startedAtRef.current;
    const frozen = sAt
      ? Math.max(0, totalSec - Math.floor((Date.now() - new Date(sAt).getTime()) / 1000))
      : totalSec;
    setPausedSecondsLeft(frozen); pausedSecondsLeftRef.current = frozen;
    setIsRunning(false); isRunningRef.current = false;
    setIsPaused(true); isPausedRef.current = true;
    setStartedAt(null); startedAtRef.current = null;
    broadcastRef.current({
      user_id: userId,
      is_running: true,
      paused: true,
      paused_seconds_left: frozen,
      started_at: null,
      duration_minutes: currentSessionDurationRef.current,
      mode: modeRef.current,
      session_count: sessionCountRef.current,
    });
  }, [userId]);

  const resume = useCallback(() => {
    if (!isPausedRef.current) return;
    const totalSec = currentSessionDurationRef.current * 60;
    const frozen = pausedSecondsLeftRef.current ?? totalSec;
    const virtualStart = new Date(Date.now() - (totalSec - frozen) * 1000).toISOString();
    setStartedAt(virtualStart); startedAtRef.current = virtualStart;
    setIsRunning(true); isRunningRef.current = true;
    setIsPaused(false); isPausedRef.current = false;
    broadcastRef.current({
      user_id: userId,
      is_running: true,
      paused: false,
      paused_seconds_left: null,
      started_at: virtualStart,
      duration_minutes: currentSessionDurationRef.current,
      mode: modeRef.current,
      session_count: sessionCountRef.current,
    });
  }, [userId]);

  const stop = useCallback(() => {
    if (completionRef.current) clearInterval(completionRef.current);
    if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
    setAutoStartIn(null); autoStartInRef.current = null;

    if ((isRunningRef.current || isPausedRef.current) && modeRef.current === "pomodoro") {
      const origStart = originalStartedAtRef.current;
      if (origStart) {
        const endedAt = new Date();
        // Use actual elapsed time, accounting for any pauses
        let actualMinutes: number;
        if (isPausedRef.current) {
          const totalSec = currentSessionDurationRef.current * 60;
          const remaining = pausedSecondsLeftRef.current ?? totalSec;
          actualMinutes = Math.max(0, Math.round((totalSec - remaining) / 60));
        } else if (startedAtRef.current) {
          // startedAt is the virtual start that already accounts for pause offsets
          actualMinutes = Math.max(0, Math.round(
            (endedAt.getTime() - new Date(startedAtRef.current).getTime()) / 60000
          ));
        } else {
          actualMinutes = 0;
        }
        supabase
          .from("pomodoro_sessions")
          .insert({
            user_id: userId,
            workspace_id: workspaceId,
            started_at: origStart,
            ended_at: endedAt.toISOString(),
            duration_minutes: actualMinutes,
            completed: false,
          })
          .then(({ error }) => {
            if (error) console.error("Error saving session:", error);
          });
      }
    }

    originalStartedAtRef.current = null;
    broadcastRef.current({
      user_id: userId,
      is_running: false,
      paused: false,
      paused_seconds_left: null,
      started_at: null,
      duration_minutes: getDuration(modeRef.current, settingsRef.current),
      mode: modeRef.current,
      session_count: sessionCountRef.current,
    });

    setIsRunning(false); isRunningRef.current = false;
    setIsPaused(false); isPausedRef.current = false;
    setStartedAt(null); startedAtRef.current = null;
    setPausedSecondsLeft(null); pausedSecondsLeftRef.current = null;
  }, [userId, workspaceId, supabase]);

  const switchMode = useCallback((m: TimerMode) => {
    if (isRunningRef.current || isPausedRef.current || autoStartInRef.current !== null) return;
    if (m === "long_break" && !longBreakUnlockedRef.current) return;
    setMode(m);
    modeRef.current = m;
  }, []);

  const saveSettings = useCallback((newSettings: PomodoroSettingsData) => {
    setSettings(newSettings);
    settingsRef.current = newSettings;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
  }, []);

  // localState is used by MemberGrid to drive the current user's card glow.
  // Only changes on session transitions (not every tick), so no re-render thrash.
  const localState = useMemo((): PomodoroState => {
    if (isRunning) {
      return {
        user_id: userId, is_running: true, paused: false,
        paused_seconds_left: null, started_at: startedAt,
        duration_minutes: currentSessionDuration, mode, session_count: sessionCount,
      };
    }
    if (isPaused) {
      return {
        user_id: userId, is_running: true, paused: true,
        paused_seconds_left: pausedSecondsLeft, started_at: null,
        duration_minutes: currentSessionDuration, mode, session_count: sessionCount,
      };
    }
    return {
      user_id: userId, is_running: false, paused: false,
      paused_seconds_left: null, started_at: null,
      duration_minutes: getDuration(mode, settings), mode, session_count: sessionCount,
    };
  }, [isRunning, isPaused, startedAt, pausedSecondsLeft, currentSessionDuration, mode, settings, sessionCount, userId]);

  const value = useMemo(
    (): PomodoroContextValue => ({
      mode, isRunning, isPaused, startedAt, pausedSecondsLeft,
      currentSessionDuration, sessionCount, longBreakUnlocked,
      autoStartIn, settings, localState,
      start, pause, resume, stop, switchMode, saveSettings,
    }),
    [
      mode, isRunning, isPaused, startedAt, pausedSecondsLeft,
      currentSessionDuration, sessionCount, longBreakUnlocked,
      autoStartIn, settings, localState,
      start, pause, resume, stop, switchMode, saveSettings,
    ]
  );

  return (
    <PomodoroContext.Provider value={value}>
      {children}
    </PomodoroContext.Provider>
  );
}
