"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, Plus, Users } from "lucide-react";
import type { Workspace } from "@/types/database";
import { cn, getInitials } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspace, joinWorkspace } from "@/app/actions/workspace";
import { useToast } from "@/components/ui/use-toast";

interface Props {
  workspaces: Workspace[];
  activeWorkspaceId: string;
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

function parseInviteCode(raw: string): string {
  try {
    const url = new URL(raw.trim());
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex(p => p === "invite" || p === "join");
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    return parts[parts.length - 1] ?? raw.trim();
  } catch {
    return raw.trim();
  }
}

export function WorkspaceSwitcher({ workspaces, activeWorkspaceId }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [createOpen, setCreateOpen]   = useState(false);
  const [joinOpen,   setJoinOpen]     = useState(false);

  const [newName,     setNewName]     = useState("");
  const [creating,    setCreating]    = useState(false);
  const [inviteCode,  setInviteCode]  = useState("");
  const [joining,     setJoining]     = useState(false);

  const currentWorkspace = workspaces.find(ws => ws.id === activeWorkspaceId) ?? workspaces[0];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const result = await createWorkspace(newName.trim());
    if (result?.error) {
      toast({ variant: "destructive", title: "Error", description: result.error });
      setCreating(false);
    }
    // success: server action calls redirect()
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setJoining(true);
    const result = await joinWorkspace(parseInviteCode(inviteCode));
    if (result?.error) {
      toast({ variant: "destructive", title: "Invalid code", description: result.error });
      setJoining(false);
    }
  }

  if (!currentWorkspace) return null;

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex flex-col items-center gap-0.5 group outline-none"
            aria-label="Switch workspace"
          >
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold text-white transition-all",
              wsColorClass(activeWorkspaceId),
              "group-hover:opacity-85 group-hover:scale-105"
            )}>
              {getInitials(currentWorkspace.name)}
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </PopoverTrigger>

        <PopoverContent side="right" align="start" sideOffset={12} className="w-64 p-0 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border bg-muted/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Workspaces</p>
          </div>

          <div className="py-1 max-h-56 overflow-y-auto">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { setPopoverOpen(false); router.push(`/dashboard/${ws.id}`); }}
                className="flex items-center gap-3 w-full px-3 py-2 hover:bg-muted/60 transition-colors text-left"
              >
                <div className={cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0",
                  wsColorClass(ws.id)
                )}>
                  {getInitials(ws.name)}
                </div>
                <span className="flex-1 text-sm truncate">{ws.name}</span>
                {ws.id === activeWorkspaceId && (
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          <div className="border-t border-border py-1">
            <button
              onClick={() => { setPopoverOpen(false); setNewName(""); setCreateOpen(true); }}
              className="flex items-center gap-3 w-full px-3 py-2 hover:bg-muted/60 transition-colors text-left"
            >
              <div className="h-7 w-7 rounded-lg border border-dashed border-border flex items-center justify-center flex-shrink-0">
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Create new workspace</span>
            </button>
            <button
              onClick={() => { setPopoverOpen(false); setInviteCode(""); setJoinOpen(true); }}
              className="flex items-center gap-3 w-full px-3 py-2 hover:bg-muted/60 transition-colors text-left"
            >
              <div className="h-7 w-7 rounded-lg border border-dashed border-border flex items-center justify-center flex-shrink-0">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Join via invite code</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Create workspace modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>Create a new shared space for your team.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label htmlFor="new-ws-name">Workspace name</Label>
              <Input
                id="new-ws-name"
                placeholder="e.g. Study Group, Dev Team..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={creating || !newName.trim()}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Join workspace modal */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Join workspace</DialogTitle>
            <DialogDescription>Paste an invite code or full invite URL from a team member.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJoin} className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label htmlFor="join-code-sw">Invite code or URL</Label>
              <Input
                id="join-code-sw"
                placeholder="e.g. a1b2c3d4-... or https://..."
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setJoinOpen(false)} disabled={joining}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={joining || !inviteCode.trim()}>
                {joining && <Loader2 className="h-4 w-4 animate-spin" />}
                Join
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
