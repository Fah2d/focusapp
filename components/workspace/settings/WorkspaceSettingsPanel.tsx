"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Copy, RefreshCw, Crown, Trash2, LogOut,
  Loader2, Check, AlertCircle, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn, getInitials } from "@/lib/utils";
import type { Workspace, WorkspaceMemberWithProfile } from "@/types/database";

interface Props {
  workspace: Workspace;
  userId: string;
}

interface ApplyState {
  loading: boolean;
  success: string | null;
  error: string | null;
}

const idle: ApplyState = { loading: false, success: null, error: null };

export function WorkspaceSettingsPanel({ workspace, userId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const isOwner = userId === workspace.owner_id;

  // Editable fields
  const [wsName, setWsName] = useState(workspace.name);
  const [savedWsName, setSavedWsName] = useState(workspace.name);

  // Section Apply
  const [applyState, setApplyState] = useState<ApplyState>(idle);

  // Invite link
  const [inviteCode, setInviteCode] = useState(workspace.invite_code);
  const [regenerateConfirm, setRegenerateConfirm] = useState(false);
  const [regenerateState, setRegenerateState] = useState<ApplyState>(idle);
  const [copied, setCopied] = useState(false);

  // Members
  const [members, setMembers] = useState<WorkspaceMemberWithProfile[]>([]);
  const [membersLoading, setMembersLoading] = useState(isOwner);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Leave workspace
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [leaveState, setLeaveState] = useState<ApplyState>(idle);

  // Delete workspace
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteState, setDeleteState] = useState<ApplyState>(idle);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const inviteLink = `${siteUrl}/join/${inviteCode}`;
  const wsNameChanged = wsName !== savedWsName;
  const isDirty = wsNameChanged;

  // ── Members fetch ────────────────────────────────────────────────────────────

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from("workspace_members")
      .select("*, profiles(*)")
      .eq("workspace_id", workspace.id)
      .order("joined_at");
    if (data) setMembers(data as WorkspaceMemberWithProfile[]);
    setMembersLoading(false);
  }, [supabase, workspace.id]);

  useEffect(() => {
    if (isOwner) fetchMembers();
  }, [isOwner, fetchMembers]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function copyInviteLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleApply() {
    if (!wsName.trim()) return;
    setApplyState({ loading: true, success: null, error: null });
    const { error } = await supabase
      .from("workspaces")
      .update({ name: wsName.trim() })
      .eq("id", workspace.id);
    if (error) {
      setApplyState({ loading: false, success: null, error: error.message });
    } else {
      setSavedWsName(wsName.trim());
      setApplyState({ loading: false, success: "Changes saved.", error: null });
      router.refresh();
      setTimeout(() => setApplyState(idle), 3000);
    }
  }

  async function handleRegenerate() {
    setRegenerateState({ loading: true, success: null, error: null });
    const newCode = crypto.randomUUID();
    const { error } = await supabase
      .from("workspaces")
      .update({ invite_code: newCode })
      .eq("id", workspace.id);
    if (error) {
      setRegenerateState({ loading: false, success: null, error: error.message });
    } else {
      setInviteCode(newCode);
      setRegenerateConfirm(false);
      setRegenerateState({ loading: false, success: "Invite link regenerated.", error: null });
      setTimeout(() => setRegenerateState(idle), 3000);
    }
  }

  async function handleRemoveMember(memberId: string) {
    setRemovingId(memberId);
    const { error } = await supabase.from("workspace_members").delete().eq("id", memberId);
    setRemovingId(null);
    if (!error) {
      setRemoveConfirmId(null);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    }
  }

  async function handleLeave() {
    setLeaveState({ loading: true, success: null, error: null });
    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("user_id", userId)
      .eq("workspace_id", workspace.id);
    if (error) {
      setLeaveState({ loading: false, success: null, error: error.message });
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function handleDeleteWorkspace() {
    setDeleteState({ loading: true, success: null, error: null });
    const { error } = await supabase.from("workspaces").delete().eq("id", workspace.id);
    if (error) {
      setDeleteState({ loading: false, success: null, error: error.message });
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Workspace name */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Workspace Name</h3>
        {isOwner ? (
          <Input
            value={wsName}
            onChange={(e) => setWsName(e.target.value)}
            className="max-w-sm"
          />
        ) : (
          <Input
            value={workspace.name}
            readOnly
            className="max-w-sm bg-muted/40 text-muted-foreground cursor-not-allowed"
          />
        )}
      </div>

      {/* Invite link */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invite Link</h3>
        <div className="flex items-center gap-2 max-w-lg">
          <Input value={inviteLink} readOnly className="flex-1 font-mono text-xs bg-muted/40" />
          <Button variant="outline" size="sm" onClick={copyInviteLink} className="gap-1.5 flex-shrink-0">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        {isOwner && (
          <div className="space-y-2">
            {!regenerateConfirm ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRegenerateConfirm(true)}
                className="gap-1.5 text-muted-foreground"
              >
                <RefreshCw className="h-4 w-4" /> Regenerate Link
              </Button>
            ) : (
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2 max-w-lg">
                <p className="text-sm">This will invalidate the current invite link. Continue?</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={handleRegenerate} disabled={regenerateState.loading}>
                    {regenerateState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Regenerate"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRegenerateConfirm(false)}>Cancel</Button>
                </div>
              </div>
            )}
            {regenerateState.success && (
              <p className="flex items-center gap-1.5 text-xs text-green-500">
                <Check className="h-3 w-3" /> {regenerateState.success}
              </p>
            )}
            {regenerateState.error && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" /> {regenerateState.error}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Members list — owner only */}
      {isOwner && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Members ({members.length})
          </h3>
          {membersLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-2 max-w-lg">
              {members.map((member) => {
                const isOwnerRow = member.user_id === workspace.owner_id;
                const isConfirming = removeConfirmId === member.id;
                return (
                  <div key={member.id} className="rounded-md border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={member.profiles.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                          {getInitials(member.profiles.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{member.profiles.name}</span>
                          {isOwnerRow && <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                          <Badge variant={isOwnerRow ? "default" : "secondary"}>{member.role}</Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </span>
                      </div>
                      {!isOwnerRow && (
                        <button
                          type="button"
                          onClick={() => setRemoveConfirmId(isConfirming ? null : member.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 p-1"
                          title="Remove member"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {isConfirming && (
                      <div className="pt-2 border-t border-border space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Remove{" "}
                          <span className="font-medium text-foreground">{member.profiles.name}</span>{" "}
                          from workspace?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={removingId === member.id}
                          >
                            {removingId === member.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRemoveConfirmId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Section Apply — owner only (covers workspace name) */}
      {isOwner && (
        <div className="pt-4 border-t border-border space-y-2">
          <Button
            onClick={handleApply}
            disabled={!isDirty || applyState.loading}
            className="gap-2"
          >
            {applyState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Changes"}
          </Button>
          {applyState.success && (
            <p className="flex items-center gap-1.5 text-xs text-green-500">
              <Check className="h-3 w-3" /> {applyState.success}
            </p>
          )}
          {applyState.error && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" /> {applyState.error}
            </p>
          )}
        </div>
      )}

      {/* Leave workspace — non-owner only */}
      {!isOwner && (
        <div className="space-y-3 pt-6 border-t border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leave Workspace</h3>
          {!leaveConfirm ? (
            <Button variant="destructive" size="sm" onClick={() => setLeaveConfirm(true)} className="gap-1.5">
              <LogOut className="h-4 w-4" /> Leave Workspace
            </Button>
          ) : (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 space-y-3 max-w-lg">
              <p className="text-sm">
                Are you sure you want to leave{" "}
                <span className="font-semibold">{workspace.name}</span>? You will lose access immediately.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={handleLeave} disabled={leaveState.loading}>
                  {leaveState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Leave"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setLeaveConfirm(false)}>Cancel</Button>
              </div>
              {leaveState.error && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" /> {leaveState.error}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Danger Zone — owner only */}
      {isOwner && (
        <div className="pt-2">
          <div className="rounded-lg border border-destructive/40 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Delete this workspace</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently deletes the workspace and all its data. This cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-1.5 flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" /> Delete Workspace
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) { setDeleteConfirmText(""); setDeleteState(idle); }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Workspace</DialogTitle>
            <DialogDescription>
              Permanent and cannot be undone. All tasks, deadlines, members, and workspace data will
              be deleted immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm">
              Type{" "}
              <span className="font-mono font-bold bg-muted px-1 py-0.5 rounded text-foreground">
                {workspace.name}
              </span>{" "}
              to confirm:
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={workspace.name}
              onKeyDown={(e) =>
                e.key === "Enter" && deleteConfirmText === workspace.name && handleDeleteWorkspace()
              }
            />
            {deleteState.error && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" /> {deleteState.error}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => { setShowDeleteDialog(false); setDeleteConfirmText(""); setDeleteState(idle); }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteWorkspace}
              disabled={deleteConfirmText !== workspace.name || deleteState.loading}
            >
              {deleteState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Workspace"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
