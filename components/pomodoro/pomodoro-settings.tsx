"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PomodoroSettingsData {
  pomodoroDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  soundEnabled: boolean;
}

export const DEFAULT_SETTINGS: PomodoroSettingsData = {
  pomodoroDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  soundEnabled: true,
};

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none",
          checked ? "bg-primary" : "bg-secondary"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </label>
  );
}

interface Props {
  settings: PomodoroSettingsData;
  onSave: (s: PomodoroSettingsData) => void;
  onClose: () => void;
}

const DURATION_FIELDS = [
  { key: "pomodoroDuration", label: "Pomodoro", min: 1, max: 90 },
  { key: "shortBreakDuration", label: "Short Break", min: 1, max: 30 },
  { key: "longBreakDuration", label: "Long Break", min: 1, max: 60 },
] as const;

export function PomodoroSettingsPanel({ settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<PomodoroSettingsData>({ ...settings });

  function clampDuration(value: string, min: number, max: number): number {
    const n = parseInt(value, 10);
    if (isNaN(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold text-sm">Timer Settings</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* TIMER */}
          <section>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Timer (minutes)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {DURATION_FIELDS.map(({ key, label, min, max }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">{label}</label>
                  <input
                    type="number"
                    min={min}
                    max={max}
                    value={draft[key]}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        [key]: clampDuration(e.target.value, min, max),
                      }))
                    }
                    className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* AUTO START */}
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Auto Start
            </h3>
            <div className="space-y-0.5">
              <Toggle
                label="Auto-start Breaks"
                checked={draft.autoStartBreaks}
                onChange={(v) => setDraft((d) => ({ ...d, autoStartBreaks: v }))}
              />
              <Toggle
                label="Auto-start Pomodoros"
                checked={draft.autoStartPomodoros}
                onChange={(v) => setDraft((d) => ({ ...d, autoStartPomodoros: v }))}
              />
            </div>
          </section>

          {/* SOUND */}
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sound
            </h3>
            <Toggle
              label="Play sound when timer ends"
              checked={draft.soundEnabled}
              onChange={(v) => setDraft((d) => ({ ...d, soundEnabled: v }))}
            />
          </section>
        </div>

        <div className="border-t px-5 py-4">
          <Button onClick={() => onSave(draft)} className="w-full">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
