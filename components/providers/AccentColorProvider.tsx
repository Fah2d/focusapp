"use client";

import { useEffect } from "react";
import { applyAccentColor, ACCENT_STORAGE_KEY } from "@/lib/accent-colors";

export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (saved) applyAccentColor(saved);
  }, []);

  return <>{children}</>;
}
