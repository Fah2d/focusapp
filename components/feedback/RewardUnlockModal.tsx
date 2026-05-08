"use client";

import { Loader2 } from "lucide-react";
import type { RewardTrackStep } from "@/types/rewards";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  step: RewardTrackStep | null;
  onEquip: () => Promise<void>;
  onSkip: () => void;
  equipping?: boolean;
}

export function RewardUnlockModal({ step, onEquip, onSkip, equipping }: Props) {
  if (!step) return null;

  return (
    <Dialog open onOpenChange={onSkip}>
      <DialogContent className="max-w-xs text-center space-y-4 py-8">
        <div
          className="mx-auto h-20 w-20 rounded-full flex items-center justify-center text-3xl border-4"
          style={{ borderColor: step.preview_color ?? "#6366f1", background: (step.preview_color ?? "#6366f1") + "22" }}
        >
          🎁
        </div>

        <DialogHeader>
          <DialogTitle className="text-center">{step.name} Unlocked!</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{step.description}</p>
        <p className="text-xs text-muted-foreground capitalize">
          Type: <span className="font-medium text-foreground">{step.reward_type.replace("_", " ")}</span>
        </p>

        <div className="flex gap-2 justify-center pt-2">
          <Button variant="outline" size="sm" onClick={onSkip} disabled={equipping}>
            Later
          </Button>
          <Button size="sm" onClick={onEquip} disabled={equipping} className="gap-2">
            {equipping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Equip Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
