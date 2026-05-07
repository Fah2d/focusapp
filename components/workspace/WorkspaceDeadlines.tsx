"use client";

import { useState, useEffect, useMemo } from "react";
import { Flag, Plus, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { WorkspaceTask } from "@/types/tasks";
import { isOverdue } from "@/types/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  workspaceId: string;
  currentUserId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function progressPercent(task: WorkspaceTask): number {
  if (!task.due_date) return 0;
  const [y, m, d] = task.due_date.split("-").map(Number);
  const due = new Date(y, m - 1, d, 23, 59, 59).getTime();
  const created = new Date(task.created_at).getTime();
  const now = Date.now();
  const total = due - created;
  if (total <= 0) return 0;
  const remaining = due - now;
  if (remaining <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((remaining / total) * 100)));
}

function preciseTimeLeft(dueDateISO: string | null): string {
  if (!dueDateISO) return "No due date";
  const [y, m, d] = dueDateISO.split("-").map(Number);
  const due = new Date(y, m - 1, d, 23, 59, 59).getTime();
  const now = Date.now();
  const diff = due - now;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const mins = Math.floor((abs % 3600000) / 60000);

  if (diff < 0) {
    if (days > 0) return `Overdue by ${days}d ${hours}h`;
    if (hours > 0) return `Overdue by ${hours}h ${mins}m`;
    return `Overdue by ${mins}m`;
  }
  if (days > 0) return `${days}d ${hours}h ${mins}m remaining`;
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

// ─── Deadline card (non-clickable, read-only with tooltip) ───────────────────

function DeadlineCard({ task }: { task: WorkspaceTask }) {
  const overdue = task.due_date ? isOverdue(task.due_date) : false;
  const pct = progressPercent(task);
  const isDone = task.status === "done";

  // Rough display label for header area
  const [y, m, d] = task.due_date ? task.due_date.split("-").map(Number) : [0, 0, 0];
  const dueLabel = task.due_date
    ? new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: task.color }} />
          <span className={cn("font-medium text-sm truncate", isDone && "line-through text-muted-foreground")}>
            {task.title}
          </span>
        </div>
        {dueLabel && (
          <span className={cn("text-xs flex-shrink-0 font-medium", overdue && !isDone ? "text-destructive" : "text-muted-foreground")}>
            {dueLabel}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {task.due_date && !isDone && (
        <div className="space-y-1">
          <div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  pct > 40 ? "bg-green-500" : pct > 15 ? "bg-amber-500" : "bg-destructive"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <div className={cn("flex items-center gap-1 text-[10px]", overdue ? "text-destructive" : "text-muted-foreground")}>
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span>{preciseTimeLeft(task.due_date)}</span>
          </div>
        </div>
      )}

      {isDone && (
        <div className="text-[10px] text-green-500 font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          Completed
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkspaceDeadlines({ workspaceId, currentUserId }: Props) {
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const supabase = useMemo(() => createClient(), []);

  async function loadDeadlines() {
    const { data } = await supabase
      .from("workspace_tasks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_deadline", true)
      .order("due_date", { ascending: true });
    if (data) setTasks(data as WorkspaceTask[]);
  }

  useEffect(() => {
    loadDeadlines();

    const channel = supabase
      .channel(`deadlines:${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "workspace_tasks" }, () => {
        loadDeadlines();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function createDeadline() {
    if (!newTitle.trim()) return;
    await supabase.from("workspace_tasks").insert({
      workspace_id: workspaceId,
      created_by: currentUserId,
      title: newTitle.trim(),
      status: "todo",
      is_deadline: true,
      due_date: newDue || null,
      position: tasks.length,
    });
    setNewTitle("");
    setNewDue("");
    setAdding(false);
  }

  const grouped = useMemo(() => {
    const overdue = tasks.filter((t) => t.status !== "done" && isOverdue(t.due_date));
    const upcoming = tasks.filter((t) => t.status !== "done" && !isOverdue(t.due_date));
    const done = tasks.filter((t) => t.status === "done");
    return { overdue, upcoming, done };
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-rose-500" />
          <h2 className="text-lg font-semibold">Deadlines</h2>
          <span className="text-sm text-muted-foreground">
            ({tasks.filter((t) => t.status !== "done").length} active)
          </span>
        </div>
        <Button size="sm" onClick={() => setAdding(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Deadline
        </Button>
      </div>

      {/* Quick add form */}
      {adding && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <Input
            placeholder="Deadline title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newDue && createDeadline()}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
              className="text-sm rounded border border-border bg-background px-2 py-1.5 flex-1"
            />
            <Button onClick={createDeadline} disabled={!newTitle.trim() || !newDue}>
              Create
            </Button>
            <Button variant="ghost" onClick={() => { setAdding(false); setNewTitle(""); setNewDue(""); }}>
              Cancel
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Due date is required for deadlines.</p>
        </div>
      )}

      {/* Overdue */}
      {grouped.overdue.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-destructive flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5" /> Overdue ({grouped.overdue.length})
          </h3>
          {grouped.overdue.map((t) => <DeadlineCard key={t.id} task={t} />)}
        </section>
      )}

      {/* Upcoming */}
      {grouped.upcoming.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Upcoming ({grouped.upcoming.length})
          </h3>
          {grouped.upcoming.map((t) => <DeadlineCard key={t.id} task={t} />)}
        </section>
      )}

      {/* Done */}
      {grouped.done.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Completed ({grouped.done.length})
          </h3>
          {grouped.done.map((t) => <DeadlineCard key={t.id} task={t} />)}
        </section>
      )}

      {tasks.length === 0 && !adding && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
            <Flag className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No deadlines yet. Add one to get started.</p>
        </div>
      )}
    </div>
  );
}
