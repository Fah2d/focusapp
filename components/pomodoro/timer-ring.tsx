"use client";
import { formatCountdown } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { TimerMode } from "@/types/database";

interface Props {
  secondsLeft: number;
  totalSeconds: number;
  size?: number;
  mode?: TimerMode;
  paused?: boolean;
}

const MODE_LABELS: Record<TimerMode, string> = {
  pomodoro: "🔥 focus",
  short_break: "☕ short break",
  long_break: "🌙 long break",
};

export function TimerRing({
  secondsLeft,
  totalSeconds,
  size = 64,
  mode = "pomodoro",
  paused = false,
}: Props) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, secondsLeft) / totalSeconds;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className={cn("flex flex-col items-center gap-1", paused && "opacity-50")}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-border"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-primary transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-mono font-bold text-primary">
            {formatCountdown(secondsLeft)}
          </span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground">
        {paused ? "⏸ paused" : MODE_LABELS[mode]}
      </span>
    </div>
  );
}
