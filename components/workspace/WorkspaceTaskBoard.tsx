"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, GripVertical, Filter, Flag } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import { awardXP } from "@/lib/xp-engine";
import type { WorkspaceTask, TaskStatus, TaskPriority } from "@/types/tasks";
import { formatTimeLeft, isOverdue } from "@/types/tasks";
import type { Profile } from "@/types/database";
import { TaskDetailModal } from "./TaskDetailModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo",        label: "To Do",       color: "bg-slate-500" },
  { id: "in_progress", label: "In Progress",  color: "bg-amber-500" },
  { id: "done",        label: "Done",         color: "bg-green-500" },
];

const COLUMN_IDS = new Set<string>(["todo", "in_progress", "done"]);

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low:    "bg-slate-400/20 text-slate-400",
  medium: "bg-amber-400/20 text-amber-400",
  high:   "bg-rose-400/20 text-rose-400",
};

interface Props {
  workspaceId: string;
  currentUserId: string;
}

// ─── Sortable task card ───────────────────────────────────────────────────────

function TaskCard({
  task,
  onClick,
  isGhost,
}: {
  task: WorkspaceTask;
  onClick: () => void;
  isGhost?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue = isOverdue(task.due_date);
  const timeLeft = formatTimeLeft(task.due_date);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer select-none",
        isGhost && "opacity-30"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 flex-shrink-0 text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-all cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: task.color }} />
            <span className={cn("text-sm font-medium leading-tight", task.status === "done" && "line-through text-muted-foreground")}>
              {task.title}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn("text-[10px] rounded px-1.5 py-0.5 font-medium", PRIORITY_COLOR[task.priority])}>
              {task.priority}
            </span>
            {task.is_deadline && (
              <span className="flex items-center gap-0.5 text-[10px] text-rose-400">
                <Flag className="h-2.5 w-2.5" /> deadline
              </span>
            )}
            {timeLeft && (
              <span className={cn("text-[10px]", overdue ? "text-destructive" : "text-muted-foreground")}>
                {timeLeft}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({
  col,
  tasks,
  onTaskClick,
  onQuickAdd,
  activeId,
}: {
  col: typeof COLUMNS[number];
  tasks: WorkspaceTask[];
  onTaskClick: (id: string) => void;
  onQuickAdd: (status: TaskStatus, title: string) => void;
  activeId: string | null;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Droppable on the column container itself (catches drops on empty space)
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: col.id });

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function submit() {
    if (title.trim()) {
      onQuickAdd(col.id, title.trim());
      setTitle("");
    }
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-2 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", col.color)} />
          <span className="text-sm font-semibold">{col.label}</span>
          <span className="text-xs text-muted-foreground">({tasks.length})</span>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Cards — droppable by column ID so empty columns accept drops */}
      <div
        ref={setDropRef}
        className={cn(
          "flex flex-col gap-2 min-h-[120px] rounded-lg p-1 transition-colors",
          isOver && "bg-primary/5 ring-1 ring-primary/20"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task.id)}
              isGhost={activeId === task.id}
            />
          ))}
        </SortableContext>
      </div>

      {/* Quick add */}
      {adding ? (
        <div className="space-y-1.5">
          <Input
            ref={inputRef}
            placeholder="Task title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") { setAdding(false); setTitle(""); }
            }}
            className="h-7 text-xs"
          />
          <div className="flex gap-1">
            <Button size="sm" onClick={submit} className="h-6 text-xs px-2">Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setTitle(""); }} className="h-6 text-xs px-2">Cancel</Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-1 rounded hover:bg-muted/40"
        >
          <Plus className="h-3.5 w-3.5" /> Add task
        </button>
      )}
    </div>
  );
}

// ─── Main board ───────────────────────────────────────────────────────────────

export function WorkspaceTaskBoard({ workspaceId, currentUserId }: Props) {
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const mutatedRef = useRef<Set<string>>(new Set());
  const supabase = useMemo(() => createClient(), []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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

  async function loadTasks() {
    const { data } = await supabase
      .from("workspace_tasks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("position");
    if (data) setTasks(data as WorkspaceTask[]);
  }

  useEffect(() => {
    loadTasks();

    const channel = supabase
      .channel(`tasks:${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "workspace_tasks" }, (payload) => {
        const row = payload.new as WorkspaceTask | undefined;
        const oldRow = payload.old as { id: string } | undefined;

        if (payload.eventType === "DELETE") {
          const id = oldRow?.id;
          if (!id) return;
          setTasks((prev) => prev.filter((t) => t.id !== id));
          return;
        }
        if (!row) return;
        if (row.workspace_id !== workspaceId) return;
        if (mutatedRef.current.has(row.id)) {
          mutatedRef.current.delete(row.id);
          return;
        }

        if (payload.eventType === "INSERT") {
          setTasks((prev) => {
            if (prev.find((t) => t.id === row.id)) return prev;
            return [...prev, row];
          });
        } else {
          setTasks((prev) => prev.map((t) => (t.id === row.id ? row : t)));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function handleQuickAdd(status: TaskStatus, title: string) {
    const colTasks = tasks.filter((t) => t.status === status);
    const { data } = await supabase
      .from("workspace_tasks")
      .insert({ workspace_id: workspaceId, created_by: currentUserId, title, status, position: colTasks.length })
      .select()
      .single();
    if (data) {
      mutatedRef.current.add((data as WorkspaceTask).id);
      setTasks((prev) => [...prev, data as WorkspaceTask]);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // ── Determine target column and insert position ──
    if (COLUMN_IDS.has(over.id as string)) {
      // Dropped on empty column area
      const targetStatus = over.id as TaskStatus;
      if (activeTask.status === targetStatus) return;

      const targetColTasks = tasks
        .filter((t) => t.status === targetStatus)
        .sort((a, b) => a.position - b.position);

      const newCol = [...targetColTasks, { ...activeTask, status: targetStatus }];
      const updatedCol = newCol.map((t, i) => ({ ...t, position: i }));

      setTasks((prev) => [
        ...prev.filter((t) => t.id !== activeTask.id && t.status !== targetStatus),
        ...updatedCol,
      ]);

      mutatedRef.current.add(activeTask.id);
      await supabase
        .from("workspace_tasks")
        .update({ status: targetStatus, position: updatedCol.length - 1, updated_at: new Date().toISOString() })
        .eq("id", activeTask.id);

      if (targetStatus === "done" && activeTask.status !== "done") {
        const xpAmount = activeTask.priority === "high" ? 80 : activeTask.priority === "medium" ? 40 : 20;
        await awardXP(supabase, currentUserId, workspaceId, xpAmount, "task_complete", { task_id: activeTask.id, priority: activeTask.priority });
      }

    } else {
      // Dropped on a card
      if (over.id === active.id) return;
      const overTask = tasks.find((t) => t.id === over.id);
      if (!overTask) return;

      const targetStatus = overTask.status;
      const colTasks = tasks
        .filter((t) => t.status === targetStatus)
        .sort((a, b) => a.position - b.position);

      let updatedCol: WorkspaceTask[];

      if (activeTask.status === targetStatus) {
        // Same column — use arrayMove for correct reorder direction
        const oldIdx = colTasks.findIndex((t) => t.id === activeTask.id);
        const newIdx = colTasks.findIndex((t) => t.id === overTask.id);
        updatedCol = arrayMove(colTasks, oldIdx, newIdx).map((t, i) => ({ ...t, position: i }));
      } else {
        // Cross column — remove active from its col, insert at over card's position
        const insertIdx = colTasks.findIndex((t) => t.id === overTask.id);
        const newCol = [...colTasks];
        newCol.splice(insertIdx >= 0 ? insertIdx : newCol.length, 0, { ...activeTask, status: targetStatus });
        updatedCol = newCol.map((t, i) => ({ ...t, position: i }));
      }

      // Optimistic: remove active from source, replace full target column
      setTasks((prev) => [
        ...prev.filter((t) => t.id !== activeTask.id && t.status !== targetStatus),
        ...updatedCol,
      ]);

      // Persist only tasks whose position or status changed
      for (const t of updatedCol) {
        const orig = tasks.find((o) => o.id === t.id);
        if (!orig || orig.position !== t.position || orig.status !== t.status) {
          mutatedRef.current.add(t.id);
          await supabase
            .from("workspace_tasks")
            .update({ status: t.status, position: t.position, updated_at: new Date().toISOString() })
            .eq("id", t.id);
          // XP for cross-column move to done
          if (t.id === activeTask.id && t.status === "done" && activeTask.status !== "done") {
            const xpAmount = activeTask.priority === "high" ? 80 : activeTask.priority === "medium" ? 40 : 20;
            await awardXP(supabase, currentUserId, workspaceId, xpAmount, "task_complete", { task_id: t.id, priority: activeTask.priority });
          }
        }
      }
    }
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterAssignee !== "all" && !t.assignees?.includes(filterAssignee)) return false;
      return true;
    });
  }, [tasks, filterPriority, filterAssignee]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as TaskPriority | "all")}
          className="text-xs rounded border border-border bg-background px-2 py-1"
        >
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="text-xs rounded border border-border bg-background px-2 py-1"
        >
          <option value="all">All members</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Kanban */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              col={col}
              tasks={filteredTasks
                .filter((t) => t.status === col.id)
                .sort((a, b) => a.position - b.position)}
              onTaskClick={setDetailId}
              onQuickAdd={handleQuickAdd}
              activeId={activeId}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <div className="rotate-2 opacity-90 shadow-xl">
              <TaskCard task={activeTask} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <TaskDetailModal
        taskId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={loadTasks}
        workspaceId={workspaceId}
        currentUserId={currentUserId}
      />
    </div>
  );
}
