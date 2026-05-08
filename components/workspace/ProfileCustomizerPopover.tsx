"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AVATAR_FRAMES, CARD_THEMES, NAMEPLATES } from "@/lib/rewards-catalog";
import type { EquippedRewards, UserUnlockedReward } from "@/types/rewards";

interface Props {
  userId: string;
  children: React.ReactNode;
}

type Section = "avatar_frame" | "nameplate" | "card_theme" | "title";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "avatar_frame", label: "Frame" },
  { id: "nameplate",    label: "Nameplate" },
  { id: "card_theme",   label: "Theme" },
  { id: "title",        label: "Title" },
];

function getEquippedForSection(equipped: EquippedRewards | null, section: Section): string | null {
  if (!equipped) return null;
  switch (section) {
    case "avatar_frame": return equipped.avatar_frame;
    case "nameplate":    return equipped.nameplate;
    case "card_theme":   return equipped.card_theme;
    case "title":        return equipped.title;
  }
}

export function ProfileCustomizerPopover({ userId, children }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState<UserUnlockedReward[]>([]);
  const [equipped, setEquipped] = useState<EquippedRewards | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("avatar_frame");

  useEffect(() => {
    if (!open) return;
    Promise.all([
      supabase.from("user_unlocked_rewards").select("*").eq("user_id", userId),
      supabase.from("user_equipped_rewards").select("*").eq("user_id", userId).maybeSingle(),
    ]).then(([unlockedRes, equippedRes]) => {
      if (unlockedRes.data) setUnlocked(unlockedRes.data as UserUnlockedReward[]);
      if (equippedRes.data) setEquipped(equippedRes.data as EquippedRewards);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  async function equip(section: Section, key: string | null) {
    const colMap: Record<Section, string> = {
      avatar_frame: "avatar_frame",
      nameplate:    "nameplate",
      card_theme:   "card_theme",
      title:        "title",
    };
    const patch: Record<string, string | null> = { [colMap[section]]: key };
    await supabase.from("user_equipped_rewards").upsert(
      { user_id: userId, ...patch }, { onConflict: "user_id" }
    );
    setEquipped((prev) => prev
      ? { ...prev, ...patch }
      : { user_id: userId, avatar_frame: null, card_theme: null, title: null, glow: null, sound_pack: null, nameplate: null, updated_at: "", ...patch }
    );
  }

  const unlockedForSection = unlocked.filter((r) => r.reward_type === activeSection);
  const catalog = { ...AVATAR_FRAMES, ...CARD_THEMES, ...NAMEPLATES };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-60 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customize</p>
          <button
            onClick={() => {
              setOpen(false);
              window.dispatchEvent(new CustomEvent("focusapp:tab", { detail: "rewards" }));
            }}
            className="text-[10px] text-primary hover:underline"
          >
            Rewards Hub →
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                "flex-1 rounded-md py-1 text-[10px] font-medium transition-colors",
                activeSection === s.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => equip(activeSection, null)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors flex items-center gap-1",
              getEquippedForSection(equipped, activeSection) === null
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            {getEquippedForSection(equipped, activeSection) === null && (
              <Check className="h-2.5 w-2.5" />
            )}
            None
          </button>

          {unlockedForSection.length === 0 && (
            <p className="text-[10px] text-muted-foreground w-full text-center py-1">
              No unlocked rewards yet
            </p>
          )}

          {unlockedForSection.map((r) => {
            const meta = catalog[r.reward_key];
            const label = meta?.label ?? r.reward_key.replace(/-/g, " ");
            const isEquipped = getEquippedForSection(equipped, activeSection) === r.reward_key;
            return (
              <button
                key={r.reward_key}
                onClick={() => equip(activeSection, r.reward_key)}
                style={meta?.previewColor ? { borderLeftColor: meta.previewColor, borderLeftWidth: 3 } : undefined}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors capitalize",
                  isEquipped
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
