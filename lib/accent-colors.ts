export const ACCENT_STORAGE_KEY = "focusapp_accent_color";

export const DEFAULT_ACCENT_HEX = "#6366f1";

export const ACCENT_COLORS = [
  { name: "Purple", hex: "#6366f1", hsl: "239 84% 67%" },
  { name: "Blue",   hex: "#3b82f6", hsl: "217 91% 60%" },
  { name: "Cyan",   hex: "#06b6d4", hsl: "189 94% 43%" },
  { name: "Green",  hex: "#10b981", hsl: "160 84% 39%" },
  { name: "Yellow", hex: "#eab308", hsl: "43 96% 46%" },
  { name: "Orange", hex: "#f97316", hsl: "24 95% 53%" },
  { name: "Pink",   hex: "#ec4899", hsl: "330 81% 60%" },
  { name: "Red",    hex: "#ef4444", hsl: "0 84% 60%" },
] as const;

export function applyAccentColor(hex: string): void {
  const color = ACCENT_COLORS.find((c) => c.hex === hex);
  if (!color || typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--primary", color.hsl);
  root.style.setProperty("--accent", color.hsl);
  root.style.setProperty("--ring", color.hsl);
}
