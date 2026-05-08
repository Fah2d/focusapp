"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACCENT_COLORS,
  DEFAULT_ACCENT_HEX,
  ACCENT_STORAGE_KEY,
  applyAccentColor,
} from "@/lib/accent-colors";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark",  label: "Dark",  icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [accentHex, setAccentHex] = useState(DEFAULT_ACCENT_HEX);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (saved) setAccentHex(saved);
  }, []);

  function handleAccentSelect(hex: string) {
    setAccentHex(hex);
    applyAccentColor(hex);
    localStorage.setItem(ACCENT_STORAGE_KEY, hex);
  }

  if (!mounted) {
    return <div className="h-48 rounded-lg bg-muted animate-pulse" />;
  }

  return (
    <div className="space-y-8">
      {/* Theme */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Theme</h3>
        <div className="flex gap-3 flex-wrap">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-col items-center gap-2.5 rounded-xl border-2 p-4 w-28 transition-all",
                theme === value
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:bg-secondary"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  theme === value ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  theme === value ? "text-primary" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent color */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Accent Color</h3>
        <div className="flex gap-3 flex-wrap">
          {ACCENT_COLORS.map(({ name, hex }) => (
            <button
              key={hex}
              type="button"
              title={name}
              onClick={() => handleAccentSelect(hex)}
              className="relative h-9 w-9 rounded-full transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              style={{
                backgroundColor: hex,
                outline: accentHex === hex ? `3px solid ${hex}` : "none",
                outlineOffset: accentHex === hex ? "3px" : "0",
              }}
            >
              {accentHex === hex && (
                <Check
                  className="absolute inset-0 m-auto h-4 w-4 text-white"
                  style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}
                />
              )}
              <span className="sr-only">{name}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Changes apply immediately. Selection persists across sessions.
        </p>
      </div>
    </div>
  );
}
