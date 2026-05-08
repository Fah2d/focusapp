import type { RewardType } from "@/types/rewards";

export interface RewardMeta {
  key: string;
  type: RewardType;
  label: string;
  previewColor: string;
  cssClass?: string;
}

export const AVATAR_FRAMES: Record<string, RewardMeta> = {
  "avatar-frame-sunrise":      { key: "avatar-frame-sunrise",      type: "avatar_frame", label: "Dawn",          previewColor: "#f97316", cssClass: "avatar-frame-sunrise" },
  "avatar-frame-ocean":        { key: "avatar-frame-ocean",        type: "avatar_frame", label: "Ocean",         previewColor: "#3b82f6", cssClass: "avatar-frame-ocean" },
  "avatar-frame-forest":       { key: "avatar-frame-forest",       type: "avatar_frame", label: "Forest",        previewColor: "#10b981", cssClass: "avatar-frame-forest" },
  "avatar-frame-phoenix":      { key: "avatar-frame-phoenix",      type: "avatar_frame", label: "Phoenix",       previewColor: "#ef4444", cssClass: "avatar-frame-phoenix" },
  "avatar-frame-focus-novice": { key: "avatar-frame-focus-novice", type: "avatar_frame", label: "Focus Novice",  previewColor: "#6366f1", cssClass: "avatar-frame-focus-novice" },
  "avatar-frame-focus-expert": { key: "avatar-frame-focus-expert", type: "avatar_frame", label: "Focus Expert",  previewColor: "#8b5cf6", cssClass: "avatar-frame-focus-expert" },
  "avatar-frame-focus-legend": { key: "avatar-frame-focus-legend", type: "avatar_frame", label: "Focus Legend",  previewColor: "#ec4899", cssClass: "avatar-frame-focus-legend" },
  "avatar-frame-mythic":       { key: "avatar-frame-mythic",       type: "avatar_frame", label: "Mythic",        previewColor: "#ef4444", cssClass: "avatar-frame-mythic" },
};

export const CARD_THEMES: Record<string, RewardMeta> = {
  "card-theme-glass":      { key: "card-theme-glass",      type: "card_theme", label: "Glass",      previewColor: "#ffffff", cssClass: "card-theme-glass" },
  "card-theme-neon":       { key: "card-theme-neon",       type: "card_theme", label: "Neon",       previewColor: "#6366f1", cssClass: "card-theme-neon" },
  "card-theme-crystal":    { key: "card-theme-crystal",    type: "card_theme", label: "Dark Crystal", previewColor: "#0f172a", cssClass: "card-theme-crystal" },
  "card-theme-productive": { key: "card-theme-productive", type: "card_theme", label: "Productive", previewColor: "#10b981", cssClass: "card-theme-productive" },
  "card-theme-champion":   { key: "card-theme-champion",   type: "card_theme", label: "Champion",   previewColor: "#f59e0b", cssClass: "card-theme-champion" },
};

export const GLOWS: Record<string, RewardMeta> = {
  "glow-soft":      { key: "glow-soft",      type: "glow", label: "Soft Glow",      previewColor: "#6366f1", cssClass: "glow-soft" },
  "glow-pulse":     { key: "glow-pulse",     type: "glow", label: "Pulse Glow",     previewColor: "#8b5cf6", cssClass: "glow-pulse" },
  "glow-neon":      { key: "glow-neon",      type: "glow", label: "Neon Glow",      previewColor: "#a855f7", cssClass: "glow-neon" },
  "glow-legendary": { key: "glow-legendary", type: "glow", label: "Legendary Glow", previewColor: "#f59e0b", cssClass: "glow-legendary" },
};

export const SOUND_PACKS: Record<string, RewardMeta> = {
  chimes: { key: "chimes", type: "sound_pack", label: "Chimes",  previewColor: "#14b8a6" },
  retro:  { key: "retro",  type: "sound_pack", label: "Retro",   previewColor: "#f59e0b" },
  nature: { key: "nature", type: "sound_pack", label: "Nature",  previewColor: "#10b981" },
};

export const NAMEPLATES: Record<string, RewardMeta> = {
  "nameplate-crimson":  { key: "nameplate-crimson",  type: "nameplate", label: "Crimson",       previewColor: "#dc2626", cssClass: "nameplate-crimson" },
  "nameplate-midnight": { key: "nameplate-midnight", type: "nameplate", label: "Midnight",       previewColor: "#1e3a5f", cssClass: "nameplate-midnight" },
  "nameplate-gold":     { key: "nameplate-gold",     type: "nameplate", label: "Gold Leaf",      previewColor: "#b45309", cssClass: "nameplate-gold" },
  "nameplate-galaxy":   { key: "nameplate-galaxy",   type: "nameplate", label: "Galaxy",         previewColor: "#4c1d95", cssClass: "nameplate-galaxy" },
  "nameplate-aurora":   { key: "nameplate-aurora",   type: "nameplate", label: "Aurora",         previewColor: "#06b6d4", cssClass: "nameplate-aurora" },
  "nameplate-cherry":   { key: "nameplate-cherry",   type: "nameplate", label: "Cherry Blossom", previewColor: "#be185d", cssClass: "nameplate-cherry" },
  "nameplate-sakura":   { key: "nameplate-sakura",   type: "nameplate", label: "Sakura Bloom",   previewColor: "#ec4899", cssClass: "nameplate-sakura" },
  "nameplate-spring":   { key: "nameplate-spring",   type: "nameplate", label: "Eternal Spring", previewColor: "#f472b6", cssClass: "nameplate-spring" },
};

export const RARITY_COLORS: Record<string, string> = {
  common:    "text-slate-400",
  rare:      "text-blue-400",
  epic:      "text-purple-400",
  legendary: "text-amber-400",
};

export const RARITY_BG: Record<string, string> = {
  common:    "bg-slate-400/10",
  rare:      "bg-blue-400/10",
  epic:      "bg-purple-400/10",
  legendary: "bg-amber-400/10",
};
