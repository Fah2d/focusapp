export interface UserXP {
  id: string;
  user_id: string;
  workspace_id: string;
  total_xp: number;
  level: number;
  updated_at: string;
}

export interface XPEvent {
  id: string;
  user_id: string;
  workspace_id: string;
  amount: number;
  reason: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";
export type AchievementCategory = "focus" | "tasks" | "social" | "milestone";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  category: AchievementCategory;
  condition_type: string;
  condition_value: number;
  rarity: AchievementRarity;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

export type RewardType = "avatar_frame" | "card_theme" | "title" | "glow" | "sound_pack" | "nameplate";

export interface RewardTrack {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  steps?: RewardTrackStep[];
}

export interface RewardTrackStep {
  id: string;
  track_id: string;
  step_number: number;
  name: string;
  description: string;
  xp_cost: number;
  reward_type: RewardType;
  reward_key: string;
  preview_color: string | null;
}

export interface UserTrackProgress {
  id: string;
  user_id: string;
  track_id: string;
  current_step: number;
  updated_at: string;
}

export interface UserUnlockedReward {
  id: string;
  user_id: string;
  reward_key: string;
  reward_type: RewardType;
  unlocked_at: string;
}

export interface EquippedRewards {
  user_id: string;
  avatar_frame: string | null;
  card_theme: string | null;
  title: string | null;
  glow: string | null;
  sound_pack: string | null;
  nameplate: string | null;
  updated_at: string;
}
