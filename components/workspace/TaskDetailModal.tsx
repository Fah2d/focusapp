"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Check, Flag, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { awardXP } from "@/lib/xp-engine";
import type { WorkspaceTask, TaskSubtask, TaskPriority, TaskStatus } from "@/types/tasks";
import type { Profile } from "@/types/database";
import { formatTimeLeft, isOverdue } from "@/types/tasks";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRESET_COLORS = [
  "#f43f5e", "#f97316", "#f59e0b", "#22c55e",
  "#14b8a6", "#3b82f6", "#6366f1", "#8b5cf6",
];

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

interface Props {
  taskId: string | null;
  onClose: () => void;
  onChanged: () => void;
  workspaceId: string;
  currentUserId: string;
}

export function TaskDetailModal({ taskId, onClose, onChanged, workspaceId, currentUserId }: Props) {
  const [task, setTask] = useState<WorkspaceTask | null>(null);
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);

  // Unsaved text drafts
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [dirtyText, setDirtyText] = useState(false);

  const [newSubtask, setNewSubtask] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();

  // Fetch members once per workspaceId
  useEffect(() => {
    supabase
      .from("workspace_members")
      .select("profiles(*)")
      .eq("workspace_id", workspaceId)
      .then(({ data }) => {
        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setMembers(data.map((m: any) => m.profiles as Profile).filter(Boolean));
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // Load task data when taskId changes
  useEffect(() => {
    if (!taskId) { setTask(null); setDirtyText(false); return; }
    (async () => {
      const [{ data: t }, { data: sub }, { data: asgn }] = await Promise.all([
        supabase.from("workspace_tasks").select("*").eq("id", taskId).single(),
        supabase.from("task_subtasks").select("*").eq("task_id", taskId).order("position"),
        supabase.from("task_assignees").select("user_id").eq("task_id", taskId),
      ]);
      if (t) {
        const loaded = t as WorkspaceTask;
        setTask(loaded);
        setDraftTitle(loaded.title);
        setDraftDescription(loaded.description ?? "");
        setDirtyText(false);
      }
      if (sub) setSubtasks(sub as TaskSubtask[]);
      if (asgn) setAssignees((asgn as { user_id: string }[]).map((a) => a.user_id));
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  // Save title + description only (called on Save button click)
  async function saveText() {
    if (!task || !draftTitle.trim()) return;
    setSaving(true);
    const patch = {
      title: draftTitle.trim(),
      description: draftDescription.trim() || null,
      updated_at: new Date().toISOString(),
    };
    await supabase.from("workspace_tasks").update(patch).eq("id", task.id);
    setTask((prev) => prev ? { ...prev, ...patch } : prev);
    setSaving(false);
    setDirtyText(false);
    onChanged();
  }

  // Immediate save for discrete fields (status, priority, color, etc.)
  async function saveMeta(patch: Partial<WorkspaceTask>) {
    if (!task) return;
    setTask((prev) => prev ? { ...prev, ...patch } : prev);
    await supabase
      .from("workspace_tasks")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", task.id);
    onChanged();
  }

  async function addSubtask() {
    if (!task || !newSubtask.trim()) return;
    const { data } = await supabase
      .from("task_subtasks")
      .insert({ task_id: task.id, title: newSubtask.trim(), position: subtasks.length })
      .select()
      .single();
    if (data) setSubtasks((prev) => [...prev, data as TaskSubtask]);
    setNewSubtask("");
  }

  async function toggleSubtask(sub: TaskSubtask) {
    const updated = { ...sub, completed: !sub.completed };
    setSubtasks((prev) => prev.map((s) => (s.id === sub.id ? updated : s)));
    await supabase.from("task_subtasks").update({ completed: updated.completed }).eq("id", sub.id);
    if (!sub.completed) {
      await awardXP(supabase, currentUserId, workspaceId, 10, "subtask_complete", { subtask_id: sub.id });
    }
  }

  async function deleteSubtask(subId: string) {
    setSubtasks((prev) => prev.filter((s) => s.id !== subId));
    await supabase.from("task_subtasks").delete().eq("id", subId);
  }

  async function toggleAssignee(userId: string) {
    if (!task) return;
    if (assignees.includes(userId)) {
      setAssignees((prev) => prev.filter((id) => id !== userId));
      await supabase.from("task_assignees").delete().eq("task_id", task.id).eq("user_id", userId);
    } else {
      setAssignees((prev) => [...prev, userId]);
      await supabase.from("task_assignees").insert({ task_id: task.id, user_id: userId });
    }
    onChanged();
  }

  async function handleDelete() {
    if (!task) return;
    setDeleting(true);
    await supabase.from("workspace_tasks").delete().eq("id", task.id);
    setDeleting(false);
    onChanged();
    onClose();
  }

  if (!taskId) return null;

  if (!task) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="sr-only">Task Detail</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Loading…
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const completedCount = subtasks.filter((s) => s.completed).length;
  const canDelete = task.created_by === currentUserId;
  const overdue = isOverdue(task.due_date);
  const timeLeft = formatTimeLeft(task.due_date);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Task Detail</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title — draft until Save */}
          <div className="space-y-1">
            <input
              className="w-full text-lg font-semibold bg-transparent border-none outline-none focus:ring-1 focus:ring-ring rounded px-1 -ml-1"
              value={draftTitle}
              onChange={(e) => { setDraftTitle(e.target.value); setDirtyText(true); }}
              placeholder="Task title"
            />
          </div>

          {/* Meta row — immediate save */}
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={task.status}
              onChange={(e) => saveMeta({ status: e.target.value as TaskStatus })}
              className="text-xs rounded border border-border bg-background px-2 py-1 cursor-pointer"
            >
              {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>

            <select
              value={task.priority}
              onChange={(e) => saveMeta({ priority: e.target.value as TaskPriority })}
              className="text-xs rounded border border-border bg-background px-2 py-1 cursor-pointer"
            >
              {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>

            <input
              type="date"
              value={task.due_date ?? ""}
              onChange={(e) => saveMeta({ due_date: e.target.value || null })}
              className={cn(
                "text-xs rounded border border-border bg-background px-2 py-1 cursor-pointer",
                overdue && "text-destructive border-destructive"
              )}
            />
            {timeLeft && (
              <span className={cn("text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
                {timeLeft}
              </span>
            )}

            <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={task.is_deadline}
                onChange={(e) => saveMeta({ is_deadline: e.target.checked })}
                className="rounded"
              />
              <Flag className="h-3 w-3" />
              Deadline
            </label>
          </div>

          {/* Color — immediate save */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Color</span>
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => saveMeta({ color: c })}
                  className={cn(
                    "w-5 h-5 rounded-full hover:scale-110 transition-transform",
                    task.color === c && "ring-2 ring-offset-1 ring-offset-background ring-white/60"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Description — draft until Save */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
            <textarea
              className="w-full text-sm bg-muted/30 rounded border border-border p-2 outline-none focus:ring-1 focus:ring-ring resize-none"
              rows={3}
              placeholder="Add a description…"
              value={draftDescription}
              onChange={(e) => { setDraftDescription(e.target.value); setDirtyText(true); }}
            />
          </div>

          {/* Save button for text fields */}
          {dirtyText && (
            <Button
              onClick={saveText}
              disabled={saving || !draftTitle.trim()}
              size="sm"
              className="w-full"
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          )}

          {/* Assignees */}
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
              <User className="h-3 w-3" /> Assignees
            </label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const assigned = assignees.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleAssignee(m.id)}
                    className={cn(
                      "flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 border transition-colors",
                      assigned
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    {m.avatar_url ? (
                      <img src={m.avatar_url} className="w-4 h-4 rounded-full object-cover" alt="" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-muted-foreground/30 flex items-center justify-center text-[9px] font-bold">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {m.name.split(" ")[0]}
                    {assigned && <Check className="h-2.5 w-2.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              Subtasks {subtasks.length > 0 && `(${completedCount}/${subtasks.length})`}
            </label>
            {subtasks.length > 0 && (
              <div className="space-y-1 mb-2">
                {subtasks.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2 group">
                    <button
                      type="button"
                      onClick={() => toggleSubtask(sub)}
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                        sub.completed ? "bg-primary border-primary" : "border-border hover:border-primary"
                      )}
                    >
                      {sub.completed && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </button>
                    <span className={cn("text-sm flex-1", sub.completed && "line-through text-muted-foreground")}>
                      {sub.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteSubtask(sub.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Add subtask…"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                className="h-7 text-xs"
              />
              <Button size="sm" variant="outline" onClick={addSubtask} className="h-7 px-2">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Delete */}
          {canDelete && (
            <div className="pt-2 border-t border-border flex justify-end">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? "Deleting…" : "Delete Task"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
