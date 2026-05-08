"use client";

import { useState } from "react";
import { ChevronRight, Plus, Users, Loader2 } from "lucide-react";
import type { Workspace } from "@/types/database";
import { cn, getInitials } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JoinWorkspaceModal } from "@/components/workspace/join-workspace-modal";
import { createWorkspace } from "@/app/actions/workspace";
import { useToast } from "@/components/ui/use-toast";

interface Props {
  workspaces: Workspace[];
  memberCounts: Record<string, number>;
  userId: string;
}

function wsColorClass(id: string): string {
  const COLORS = [
    "bg-violet-500", "bg-blue-500",   "bg-emerald-500",
    "bg-orange-500", "bg-pink-500",   "bg-cyan-500",
    "bg-amber-500",  "bg-rose-500",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0x7fffffff;
  return COLORS[hash % COLORS.length];
}

export function WorkspacePicker({ workspaces, memberCounts, userId }: Props) {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen,   setJoinOpen]   = useState(false);
  const [name,       setName]       = useState("");
  const [creating,   setCreating]   = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const result = await createWorkspace(name.trim());
    if (result?.error) {
      toast({ variant: "destructive", title: "Error", description: result.error });
      setCreating(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Your Workspaces</h1>
          <p className="text-sm text-muted-foreground">Select a workspace to continue</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {workspaces.map((ws) => (
            <a
              key={ws.id}
              href={`/dashboard/${ws.id}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all group"
            >
              <div className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0",
                wsColorClass(ws.id)
              )}>
                {getInitials(ws.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{ws.name}</p>
                <p className="text-xs text-muted-foreground">
                  {memberCounts[ws.id] ?? 1} member{(memberCounts[ws.id] ?? 1) !== 1 ? "s" : ""}
                  {ws.owner_id === userId && (
                    <span className="ml-1.5 text-primary font-medium">· Owner</span>
                  )}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            </a>
          ))}

          <button
            onClick={() => { setName(""); setCreateOpen(true); }}
            className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-card/50 p-4 hover:border-primary hover:bg-card transition-all text-left"
          >
            <div className="h-12 w-12 rounded-xl border border-dashed border-border flex items-center justify-center flex-shrink-0">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Create workspace</p>
              <p className="text-xs text-muted-foreground">Start a new shared space</p>
            </div>
          </button>

          <button
            onClick={() => setJoinOpen(true)}
            className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-card/50 p-4 hover:border-primary hover:bg-card transition-all text-left"
          >
            <div className="h-12 w-12 rounded-xl border border-dashed border-border flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Join workspace</p>
              <p className="text-xs text-muted-foreground">Use an invite code</p>
            </div>
          </button>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>Create a new shared space for your team.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label htmlFor="ws-picker-name">Workspace name</Label>
              <Input
                id="ws-picker-name"
                placeholder="e.g. Study Group, Dev Team..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={creating || !name.trim()}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <JoinWorkspaceModal open={joinOpen} onOpenChange={setJoinOpen} userId={userId} />
    </div>
  );
}
