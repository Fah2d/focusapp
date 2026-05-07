"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { joinWorkspace } from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function JoinWorkspaceModal({ open, onOpenChange, userId }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);

    const result = await joinWorkspace(code.trim());

    if (result?.error) {
      toast({ variant: "destructive", title: "Invalid code", description: result.error });
      setLoading(false);
    }
    // on success the server action calls redirect(), no client-side navigation needed
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join a workspace</DialogTitle>
          <DialogDescription>
            Enter the invite code shared by your team member.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleJoin} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite code</Label>
            <Input
              id="invite-code"
              placeholder="e.g. a1b2c3d4e5"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Join workspace
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
