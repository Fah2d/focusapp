"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CalendarEvent } from "@/types/database";
import type { WorkspaceTask } from "@/types/tasks";
import { TaskDetailModal } from "./TaskDetailModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PRESET_COLORS = [
  { label: "rose",   value: "#f43f5e" },
  { label: "orange", value: "#f97316" },
  { label: "amber",  value: "#f59e0b" },
  { label: "green",  value: "#22c55e" },
  { label: "teal",   value: "#14b8a6" },
  { label: "blue",   value: "#3b82f6" },
  { label: "indigo", value: "#6366f1" },
  { label: "violet", value: "#8b5cf6" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function todayISO(): string {
  return toISO(new Date());
}

function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleString("default", { month: "long", year: "numeric" });
}

function formatWeekLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${weekStart.toLocaleDateString("default", opts)} – ${end.toLocaleDateString("default", opts)}`;
}

function formatEventDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Returns Monday-aligned grid cells for the month view
function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  // 0=Sun → shift to Mon-based
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// Returns Mon–Sun for a week containing `anchor`
function buildWeekDays(anchor: Date): Date[] {
  const dow = (anchor.getDay() + 6) % 7; // Mon=0
  const mon = new Date(anchor);
  mon.setDate(anchor.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PRESET_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          className={cn(
            "w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center",
            value === c.value && "ring-2 ring-offset-2 ring-offset-background ring-white/60"
          )}
          style={{ backgroundColor: c.value }}
          title={c.label}
        >
          {value === c.value && (
            <svg className="w-3.5 h-3.5 text-white drop-shadow" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

function EventPill({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded px-1.5 py-0.5 text-[10px] leading-tight font-medium text-white truncate hover:brightness-110 transition-all"
      style={{ backgroundColor: event.color }}
      title={event.title}
    >
      {event.title}
    </button>
  );
}

// ─── Dialogs ─────────────────────────────────────────────────────────────────

interface CreateDialogProps {
  date: string | null;
  onClose: () => void;
  onCreated: (event: CalendarEvent) => void;
  workspaceId: string;
  currentUserId: string;
}

function CreateDialog({ date, onClose, onCreated, workspaceId, currentUserId }: CreateDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0].value);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        workspace_id: workspaceId,
        created_by: currentUserId,
        title: title.trim(),
        description: description.trim() || null,
        event_date: date,
        color,
      })
      .select("*")
      .single();
    setSaving(false);
    if (!error) {
      onClose();
      // State update handled solely by realtime INSERT handler — no optimistic add
    }
  }

  return (
    <Dialog open={!!date} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>New event</DialogTitle>
          {date && (
            <p className="text-sm text-muted-foreground">{formatEventDate(date)}</p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Title *</label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, links, or notes…"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Color</label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving || !title.trim()} className="flex-1">
              {saving ? "Saving…" : "Add Event"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DetailDialogProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onUpdated: (event: CalendarEvent) => void;
  onDeleted: (id: string) => void;
}

function DetailDialog({ event, onClose, onUpdated, onDeleted }: DetailDialogProps) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0].value);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? "");
      setColor(event.color);
      setMode("view");
    }
  }, [event]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!event || !title.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("calendar_events")
      .update({ title: title.trim(), description: description.trim() || null, color, updated_at: new Date().toISOString() })
      .eq("id", event.id)
      .select("*")
      .single();
    setSaving(false);
    if (!error && data) {
      onUpdated({ ...data, creator_name: event.creator_name });
      onClose();
    }
  }

  async function handleDelete() {
    if (!event) return;
    setSaving(true);
    await supabase.from("calendar_events").delete().eq("id", event.id);
    setSaving(false);
    onDeleted(event.id);
    onClose();
  }

  if (!event) return null;

  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        {mode === "view" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                <DialogTitle className="leading-snug">{event.title}</DialogTitle>
              </div>
              <p className="text-sm text-muted-foreground">{formatEventDate(event.event_date)}</p>
            </DialogHeader>
            <div className="space-y-3 pt-1">
              <p className="text-sm">
                {event.description ?? <span className="text-muted-foreground italic">No description</span>}
              </p>
              {event.creator_name && (
                <p className="text-xs text-muted-foreground">Created by {event.creator_name}</p>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setMode("edit")}>
                  Edit
                </Button>
                <Button variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={() => setMode("confirm-delete")}>
                  Delete
                </Button>
              </div>
            </div>
          </>
        )}

        {mode === "edit" && (
          <>
            <DialogHeader>
              <DialogTitle>Edit event</DialogTitle>
              <p className="text-sm text-muted-foreground">{formatEventDate(event.event_date)}</p>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4 pt-1">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Title *</label>
                <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details, links, or notes…"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Color</label>
                <ColorPicker value={color} onChange={setColor} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={saving || !title.trim()} className="flex-1">
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setMode("view")} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </>
        )}

        {mode === "confirm-delete" && (
          <>
            <DialogHeader>
              <DialogTitle>Delete event?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">
                &ldquo;{event.title}&rdquo; will be permanently removed.
              </p>
              <div className="flex gap-2">
                <Button variant="destructive" disabled={saving} className="flex-1" onClick={handleDelete}>
                  {saving ? "Deleting…" : "Delete"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setMode("view")}>
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  workspaceId: string;
  currentUserId: string;
}

export function WorkspaceCalendar({ workspaceId, currentUserId }: Props) {
  const today = new Date();
  const [view, setView] = useState<"month" | "week">("month");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [weekAnchor, setWeekAnchor] = useState<Date>(today);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Dialogs
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);

  const supabase = createClient();

  // ── Fetch all events once ──
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("calendar_events")
        .select("*, profiles(name)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });

      if (data) {
        setEvents(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.map((row: any) => ({
            ...row,
            creator_name: row.profiles?.name ?? undefined,
            profiles: undefined,
          }))
        );
      }
    }
    load();
  }, [workspaceId]);

  // ── Tasks with due dates ──
  useEffect(() => {
    supabase
      .from("workspace_tasks")
      .select("id, title, color, due_date, status, is_deadline, workspace_id, created_by, description, priority, position, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .not("due_date", "is", null)
      .then(({ data }) => { if (data) setTasks(data as WorkspaceTask[]); });

    const taskChannel = supabase
      .channel(`cal-tasks:${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "workspace_tasks" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setTasks((prev) => prev.filter((t) => t.id !== (payload.old as { id: string }).id));
          return;
        }
        const row = payload.new as WorkspaceTask;
        if (row.workspace_id !== workspaceId) return;
        if (payload.eventType === "INSERT") {
          if (!row.due_date) return;
          setTasks((prev) => prev.find((t) => t.id === row.id) ? prev : [...prev, row]);
        } else {
          setTasks((prev) => {
            const filtered = prev.filter((t) => t.id !== row.id);
            return row.due_date ? [...filtered, row] : filtered;
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(taskChannel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // ── Realtime ──
  useEffect(() => {
    const channel = supabase
      .channel(`calendar:${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_events", filter: `workspace_id=eq.${workspaceId}` },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const newRow = payload.new as CalendarEvent;
            const { data: profile } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", newRow.created_by)
              .single();
            setEvents((prev) => {
              if (prev.find((e) => e.id === newRow.id)) return prev;
              return [...prev, { ...newRow, creator_name: profile?.name ?? undefined }];
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as CalendarEvent;
            setEvents((prev) =>
              prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e))
            );
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setEvents((prev) => prev.filter((e) => e.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workspaceId]);

  // ── Handlers ──
  const handleCreated = useCallback((event: CalendarEvent) => {
    setEvents((prev) => [...prev, event]);
  }, []);

  const handleUpdated = useCallback((event: CalendarEvent) => {
    setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
  }, []);

  const handleDeleted = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  function eventsForDay(iso: string): CalendarEvent[] {
    return events.filter((e) => e.event_date === iso);
  }

  function tasksForDay(iso: string): WorkspaceTask[] {
    return tasks.filter((t) => t.due_date === iso);
  }

  // ── Navigation ──
  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }
  function prevWeek() {
    setWeekAnchor(d => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; });
  }
  function nextWeek() {
    setWeekAnchor(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; });
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setWeekAnchor(today);
  }

  const todayStr = todayISO();

  // ── Month view ──
  const monthCells = buildMonthGrid(year, month);

  // ── Week view ──
  const weekDays = buildWeekDays(weekAnchor);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            onClick={view === "month" ? prevMonth : prevWeek}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-medium min-w-[140px] text-center">
            {view === "month"
              ? formatMonthLabel(year, month)
              : formatWeekLabel(weekDays[0])}
          </span>
          <button
            onClick={view === "month" ? nextMonth : nextWeek}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <Button variant="outline" size="sm" onClick={goToday} className="text-xs h-7 px-2.5">
          Today
        </Button>

        <div className="ml-auto flex rounded-md border border-border overflow-hidden">
          {(["month", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                view === v ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {v === "month" ? "Month" : "Week"}
            </button>
          ))}
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Month grid */}
      {view === "month" && (
        <div className="grid grid-cols-7 gap-px flex-1 bg-border rounded-lg overflow-hidden">
          {monthCells.map((date, idx) => {
            if (!date) {
              return <div key={idx} className="bg-card/20 min-h-[90px]" />;
            }
            const iso = toISO(date);
            const dayEvents = eventsForDay(iso);
            const dayTasks = tasksForDay(iso);
            const isToday = iso === todayStr;
            const isCurrentMonth = date.getMonth() === month;
            const expanded = expandedDay === iso;
            const visible = expanded ? dayEvents : dayEvents.slice(0, 2);
            const overflow = dayEvents.length - 2;

            return (
              <div
                key={iso}
                onClick={() => setCreateDate(iso)}
                className={cn(
                  "bg-card/50 min-h-[90px] p-1.5 flex flex-col gap-1 cursor-pointer hover:bg-muted/30 transition-colors",
                  !isCurrentMonth && "opacity-40"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium self-start w-6 h-6 flex items-center justify-center rounded-full leading-none",
                    isToday && "bg-primary text-primary-foreground"
                  )}
                >
                  {date.getDate()}
                </span>
                {visible.map((ev) => (
                  <EventPill
                    key={ev.id}
                    event={ev}
                    onClick={(e) => { e.stopPropagation(); setDetailEvent(ev); }}
                  />
                ))}
                {!expanded && overflow > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedDay(iso); }}
                    className="text-[10px] text-muted-foreground hover:text-foreground text-left pl-1"
                  >
                    +{overflow} more
                  </button>
                )}
                {dayTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={(e) => { e.stopPropagation(); setDetailTaskId(t.id); }}
                    className="w-full text-left rounded px-1.5 py-0.5 text-[10px] leading-tight font-medium text-white truncate flex items-center gap-1 hover:brightness-110 transition-all"
                    style={{ backgroundColor: t.color }}
                    title={t.title}
                  >
                    <Flag className="h-2.5 w-2.5 flex-shrink-0" />
                    {t.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Week grid */}
      {view === "week" && (
        <div className="grid grid-cols-7 gap-px flex-1 bg-border rounded-lg overflow-hidden">
          {weekDays.map((date) => {
            const iso = toISO(date);
            const dayEvents = eventsForDay(iso);
            const dayTasks = tasksForDay(iso);
            const isToday = iso === todayStr;

            return (
              <div
                key={iso}
                onClick={() => setCreateDate(iso)}
                className="bg-card/50 min-h-[140px] p-1.5 flex flex-col gap-1 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <span
                  className={cn(
                    "text-xs font-medium self-start w-6 h-6 flex items-center justify-center rounded-full leading-none",
                    isToday && "bg-primary text-primary-foreground"
                  )}
                >
                  {date.getDate()}
                </span>
                {dayEvents.map((ev) => (
                  <EventPill
                    key={ev.id}
                    event={ev}
                    onClick={(e) => { e.stopPropagation(); setDetailEvent(ev); }}
                  />
                ))}
                {dayTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={(e) => { e.stopPropagation(); setDetailTaskId(t.id); }}
                    className="w-full text-left rounded px-1.5 py-0.5 text-[10px] leading-tight font-medium text-white truncate flex items-center gap-1 hover:brightness-110 transition-all"
                    style={{ backgroundColor: t.color }}
                    title={t.title}
                  >
                    <Flag className="h-2.5 w-2.5 flex-shrink-0" />
                    {t.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CreateDialog
        date={createDate}
        onClose={() => setCreateDate(null)}
        onCreated={handleCreated}
        workspaceId={workspaceId}
        currentUserId={currentUserId}
      />
      <DetailDialog
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
      <TaskDetailModal
        taskId={detailTaskId}
        onClose={() => setDetailTaskId(null)}
        onChanged={() => {
          supabase
            .from("workspace_tasks")
            .select("id, title, color, due_date, status, is_deadline, workspace_id, created_by, description, priority, position, created_at, updated_at")
            .eq("workspace_id", workspaceId)
            .not("due_date", "is", null)
            .then(({ data }) => { if (data) setTasks(data as WorkspaceTask[]); });
        }}
        workspaceId={workspaceId}
        currentUserId={currentUserId}
      />
    </div>
  );
}
