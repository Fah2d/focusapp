"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { spendXP, xpProgress } from "@/lib/xp-engine";
import { playXPSpendSound, playRewardUnlockSound, previewSoundForPack } from "@/lib/sounds";
import { AVATAR_FRAMES, CARD_THEMES, GLOWS, SOUND_PACKS, NAMEPLATES, RARITY_COLORS, RARITY_BG } from "@/lib/rewards-catalog";
import type {
  UserXP,
  Achievement,
  RewardTrack,
  RewardTrackStep,
  UserTrackProgress,
  UserUnlockedReward,
  EquippedRewards,
} from "@/types/rewards";
import { RewardUnlockModal } from "@/components/feedback/RewardUnlockModal";
import { cn } from "@/lib/utils";
import { Lock, Check, Star, Zap, Play, X, Minus } from "lucide-react";

interface Props {
  userId: string;
  workspaceId: string;
}

type TabKey = "all" | "avatar_frame" | "nameplate" | "card_theme" | "glow" | "title" | "sound_pack" | "achievements";

const TABS: { id: TabKey; label: string }[] = [
  { id: "all",          label: "All" },
  { id: "avatar_frame", label: "Frames" },
  { id: "nameplate",    label: "Nameplates" },
  { id: "card_theme",   label: "Themes" },
  { id: "glow",         label: "Glows" },
  { id: "title",        label: "Titles" },
  { id: "sound_pack",   label: "Sound Packs" },
  { id: "achievements", label: "Achievements" },
];

interface StepCard {
  step: RewardTrackStep;
  track: RewardTrack;
  isUnlocked: boolean;
  isEquipped: boolean;
  isNext: boolean;
}

function getEquippedForType(equipped: EquippedRewards | null, type: string): string | null {
  if (!equipped) return null;
  switch (type) {
    case "avatar_frame": return equipped.avatar_frame;
    case "card_theme":   return equipped.card_theme;
    case "title":        return equipped.title;
    case "glow":         return equipped.glow;
    case "sound_pack":   return equipped.sound_pack;
    case "nameplate":    return equipped.nameplate;
    default:             return null;
  }
}

function getRarity(xpCost: number): string {
  if (xpCost >= 10000) return "legendary";
  if (xpCost >= 5000)  return "epic";
  if (xpCost >= 2000)  return "rare";
  return "common";
}

function getPreviewColor(step: RewardTrackStep): string {
  const catalog = { ...AVATAR_FRAMES, ...CARD_THEMES, ...GLOWS, ...SOUND_PACKS, ...NAMEPLATES };
  return catalog[step.reward_key]?.previewColor ?? step.preview_color ?? "#6366f1";
}

export function RewardsHub({ userId, workspaceId }: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [xp, setXp] = useState<UserXP | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<Set<string>>(new Set());
  const [tracks, setTracks] = useState<RewardTrack[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [equipped, setEquipped] = useState<EquippedRewards | null>(null);
  const [unlockStep, setUnlockStep] = useState<RewardTrackStep | null>(null);
  const [equipping, setEquipping] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [lockModal, setLockModal] = useState<StepCard | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("user_xp").select("*").eq("user_id", userId).eq("workspace_id", workspaceId).maybeSingle(),
      supabase.from("achievements").select("*").order("category").order("condition_value"),
      supabase.from("user_achievements").select("achievement_id").eq("user_id", userId),
      supabase.from("reward_tracks").select("*, reward_track_steps(*)").order("id"),
      supabase.from("user_track_progress").select("*").eq("user_id", userId),
      supabase.from("user_unlocked_rewards").select("reward_key").eq("user_id", userId),
      supabase.from("user_equipped_rewards").select("*").eq("user_id", userId).maybeSingle(),
    ]).then(([xpRes, achRes, uachRes, tracksRes, progressRes, unlockedRes, equippedRes]) => {
      if (xpRes.data) setXp(xpRes.data as UserXP);
      if (achRes.data) setAchievements(achRes.data as Achievement[]);
      if (uachRes.data) setUserAchievements(new Set((uachRes.data as { achievement_id: string }[]).map((u) => u.achievement_id)));
      if (tracksRes.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = (tracksRes.data as any[]).map((track) => ({
          ...track,
          steps: (track.reward_track_steps as RewardTrackStep[]).sort((a, b) => a.step_number - b.step_number),
        }));
        setTracks(t as RewardTrack[]);
      }
      if (progressRes.data) {
        const map: Record<string, number> = {};
        (progressRes.data as UserTrackProgress[]).forEach((p) => { map[p.track_id] = p.current_step; });
        setProgress(map);
      }
      if (unlockedRes.data) setUnlocked(new Set((unlockedRes.data as UserUnlockedReward[]).map((u) => u.reward_key)));
      if (equippedRes.data) setEquipped(equippedRes.data as EquippedRewards);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, workspaceId]);

  useEffect(() => {
    const channel = supabase
      .channel(`rewards_xp:${userId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "user_xp",
        filter: `user_id=eq.${userId}`,
      }, (p) => { if (p.new) setXp(p.new as UserXP); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, supabase]);

  const cards: StepCard[] = useMemo(() => {
    return tracks.flatMap((track) => {
      const steps = track.steps ?? [];
      const currentStep = progress[track.id] ?? 0;
      return steps.map((step) => ({
        step,
        track,
        isUnlocked: unlocked.has(step.reward_key),
        isEquipped: getEquippedForType(equipped, step.reward_type) === step.reward_key,
        isNext: step.step_number === currentStep + 1,
      }));
    });
  }, [tracks, progress, unlocked, equipped]);

  const filteredCards = useMemo(() => {
    if (activeTab === "all" || activeTab === "achievements") return cards;
    return cards.filter((c) => c.step.reward_type === activeTab);
  }, [cards, activeTab]);

  const totalXP = xp?.total_xp ?? 0;
  const { level, current, needed, pct } = xp ? xpProgress(xp.total_xp) : { level: 1, current: 0, needed: 100, pct: 0 };

  async function handleUnlock(card: StepCard) {
    const { step, track } = card;
    if (!xp || xp.total_xp < step.xp_cost) return;
    const ok = await spendXP(supabase, userId, workspaceId, step.xp_cost);
    if (!ok) return;
    playXPSpendSound();

    await supabase.from("user_unlocked_rewards").insert({
      user_id: userId, reward_key: step.reward_key, reward_type: step.reward_type,
    });
    await supabase.from("user_track_progress").upsert({
      user_id: userId, track_id: track.id, current_step: step.step_number,
    }, { onConflict: "user_id,track_id" });

    setUnlocked((prev) => new Set([...prev, step.reward_key]));
    setProgress((prev) => ({ ...prev, [track.id]: step.step_number }));
    setXp((prev) => prev ? { ...prev, total_xp: prev.total_xp - step.xp_cost } : prev);
    setLockModal(null);
    setUnlockStep(step);
    playRewardUnlockSound();
  }

  async function equipReward(type: string, key: string) {
    const patch: Record<string, string | null> = {};
    if (type === "avatar_frame") patch.avatar_frame = key;
    if (type === "card_theme")   patch.card_theme   = key;
    if (type === "title")        patch.title        = key;
    if (type === "glow")         patch.glow         = key;
    if (type === "sound_pack") {
      patch.sound_pack = key;
      if (typeof window !== "undefined") localStorage.setItem("focusapp_sound_pack", key);
    }
    if (type === "nameplate")    patch.nameplate    = key;
    await supabase.from("user_equipped_rewards").upsert(
      { user_id: userId, ...patch }, { onConflict: "user_id" }
    );
    setEquipped((prev) => prev
      ? { ...prev, ...patch }
      : { user_id: userId, avatar_frame: null, card_theme: null, title: null, glow: null, sound_pack: null, nameplate: null, updated_at: "", ...patch }
    );
  }

  async function unequipReward(type: string) {
    const patch: Record<string, null> = {};
    if (type === "avatar_frame") patch.avatar_frame = null;
    if (type === "card_theme")   patch.card_theme   = null;
    if (type === "title")        patch.title        = null;
    if (type === "glow")         patch.glow         = null;
    if (type === "sound_pack")   patch.sound_pack   = null;
    if (type === "nameplate")    patch.nameplate    = null;
    await supabase.from("user_equipped_rewards").upsert(
      { user_id: userId, ...patch }, { onConflict: "user_id" }
    );
    setEquipped((prev) => prev ? { ...prev, ...patch } : null);
  }

  async function handleEquipFromModal() {
    if (!unlockStep) return;
    setEquipping(true);
    await equipReward(unlockStep.reward_type, unlockStep.reward_key);
    setEquipping(false);
    setUnlockStep(null);
  }

  function handleCardClick(card: StepCard) {
    if (card.isUnlocked) {
      if (card.isEquipped) {
        unequipReward(card.step.reward_type);
      } else {
        equipReward(card.step.reward_type, card.step.reward_key);
      }
    } else {
      setLockModal(card);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* XP Header */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Star className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-primary">Level {level}</span>
              <span className="text-sm text-muted-foreground">{totalXP.toLocaleString()} total XP</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">{current} / {needed}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          Earn XP by completing pomodoros, tasks, and daily todos
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 rounded-xl bg-muted/40 p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex-shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap",
              activeTab === t.id
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Achievements grid */}
      {activeTab === "achievements" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {achievements.map((ach) => {
            const earned = userAchievements.has(ach.id);
            return (
              <div
                key={ach.id}
                className={cn(
                  "rounded-xl border p-3 space-y-1.5 transition-all",
                  earned ? cn("border-border", RARITY_BG[ach.rarity]) : "border-border opacity-40 grayscale"
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{ach.icon}</span>
                  <span className={cn("text-[9px] font-bold uppercase", RARITY_COLORS[ach.rarity])}>{ach.rarity}</span>
                </div>
                <p className="text-xs font-semibold leading-tight">{ach.name}</p>
                <p className="text-[10px] text-muted-foreground leading-snug">{ach.description}</p>
                {earned && <p className="text-[10px] text-primary font-medium">+{ach.xp_reward} XP</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Reward cards grid */}
      {activeTab !== "achievements" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* None card — only for single-type tabs, not "all" */}
          {activeTab !== "all" && (
            <div
              onClick={() => unequipReward(activeTab)}
              className={cn(
                "relative rounded-xl border p-3 cursor-pointer transition-all duration-200 flex flex-col gap-2",
                getEquippedForType(equipped, activeTab) === null
                  ? "border-primary shadow-[0_0_12px_hsl(var(--primary)/0.4)] bg-primary/5"
                  : "border-border/60 bg-card hover:border-primary/40 hover:shadow-sm"
              )}
            >
              <div className="h-12 rounded-lg flex items-center justify-center bg-muted/40 border border-border/60">
                <Minus className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold leading-tight">None</p>
                <p className="text-[10px] text-muted-foreground">Default (unequipped)</p>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-[9px] font-bold uppercase text-muted-foreground">default</span>
                {getEquippedForType(equipped, activeTab) === null && (
                  <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                    <Check className="h-3 w-3" /> Active
                  </span>
                )}
              </div>
            </div>
          )}

          {filteredCards.map((card) => {
            const { step, track, isUnlocked, isEquipped, isNext } = card;
            const rarity = getRarity(step.xp_cost);
            const color = getPreviewColor(step);
            const canAfford = totalXP >= step.xp_cost;
            const isSoundPack = step.reward_type === "sound_pack";

            return (
              <div
                key={step.id}
                onClick={() => handleCardClick(card)}
                className={cn(
                  "relative rounded-xl border p-3 cursor-pointer transition-all duration-200 flex flex-col gap-2",
                  isEquipped
                    ? "border-primary shadow-[0_0_12px_hsl(var(--primary)/0.4)] bg-primary/5"
                    : isUnlocked
                      ? "border-border hover:border-primary/40 bg-card hover:shadow-sm"
                      : "border-border/60 bg-card opacity-75 hover:opacity-100"
                )}
              >
                {/* Color preview */}
                <div
                  className="h-12 rounded-lg flex items-center justify-center relative overflow-hidden"
                  style={{ background: color + "33", border: `1px solid ${color}66` }}
                >
                  <div className="absolute inset-0 opacity-40" style={{ background: color }} />
                  {!isUnlocked && (
                    <Lock className="h-4 w-4 text-white/80 relative z-10" />
                  )}
                  {isEquipped && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-primary/20">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  {isUnlocked && !isEquipped && isSoundPack && (
                    <button
                      onClick={(e) => { e.stopPropagation(); previewSoundForPack(step.reward_key); }}
                      className="relative z-10 bg-white/20 hover:bg-white/40 rounded-full p-1.5 transition-colors"
                    >
                      <Play className="h-3 w-3 text-white" />
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold leading-tight">{step.name}</p>
                  <p className="text-[10px] text-muted-foreground">{track.name}</p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto">
                  <span className={cn("text-[9px] font-bold uppercase", RARITY_COLORS[rarity])}>{rarity}</span>
                  {isEquipped ? (
                    <span className="text-[10px] font-bold text-primary">Equipped</span>
                  ) : isUnlocked ? (
                    <span className="text-[10px] text-green-500 font-medium">Unlocked</span>
                  ) : (
                    <span className={cn("text-[10px] font-bold", canAfford && isNext ? "text-primary" : "text-muted-foreground")}>
                      {step.xp_cost.toLocaleString()} XP
                    </span>
                  )}
                </div>

                {isUnlocked && isSoundPack && !isEquipped && (
                  <p className="text-[9px] text-muted-foreground text-center -mt-1">▶ preview · click to equip</p>
                )}
              </div>
            );
          })}
          {filteredCards.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
              No rewards in this category yet.
            </div>
          )}
        </div>
      )}

      {/* Lock info modal */}
      {lockModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setLockModal(null)}
        >
          <div
            className="relative w-72 rounded-2xl border border-border bg-card p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLockModal(null)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div
              className="h-16 rounded-xl flex items-center justify-center relative overflow-hidden"
              style={{ background: getPreviewColor(lockModal.step) + "22" }}
            >
              <div className="absolute inset-0 opacity-30" style={{ background: getPreviewColor(lockModal.step) }} />
              <Lock className="h-6 w-6 text-white/60 relative z-10" />
            </div>

            <div>
              <p className="font-bold text-sm">{lockModal.step.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{lockModal.step.description}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Track: {lockModal.track.name}</p>
            </div>

            <div className="rounded-xl bg-muted/50 p-3 space-y-1.5">
              <p className="text-xs font-semibold">Requirements</p>
              {!lockModal.isNext && (
                <p className="text-[11px] text-amber-500 font-medium">
                  Complete step {lockModal.step.step_number - 1} of this track first.
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Cost:{" "}
                <span className={cn("font-bold", totalXP >= lockModal.step.xp_cost ? "text-primary" : "text-destructive")}>
                  {lockModal.step.xp_cost.toLocaleString()} XP
                </span>
                {totalXP < lockModal.step.xp_cost && (
                  <span className="ml-1">({(lockModal.step.xp_cost - totalXP).toLocaleString()} more needed)</span>
                )}
              </p>
            </div>

            {lockModal.isNext && (
              <button
                onClick={() => handleUnlock(lockModal)}
                disabled={totalXP < lockModal.step.xp_cost}
                className={cn(
                  "w-full rounded-xl py-2.5 text-sm font-semibold transition-colors",
                  totalXP >= lockModal.step.xp_cost
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                Unlock for {lockModal.step.xp_cost.toLocaleString()} XP
              </button>
            )}
          </div>
        </div>
      )}

      <RewardUnlockModal
        step={unlockStep}
        onEquip={handleEquipFromModal}
        onSkip={() => setUnlockStep(null)}
        equipping={equipping}
      />
    </div>
  );
}
