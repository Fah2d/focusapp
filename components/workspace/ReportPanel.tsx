"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Clock,
  CalendarDays,
  Flame,
  ChevronLeft,
  ChevronRight,
  Lock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportPanelProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  workspaceId: string;
}

interface SessionRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  completed: boolean | null;
}

interface MemberQueryRow {
  user_id: string;
  profiles: { name: string } | null;
}

interface AllSessionRow {
  id: string;
  user_id: string;
  duration_minutes: number;
  completed: boolean | null;
}

interface ProcessedMember {
  userId: string;
  name: string;
}

interface ChartPoint {
  label: string;
  hours: number;
}

interface ChartResult {
  data: ChartPoint[];
  label: string;
  isCurrentPeriod: boolean;
}

// ─── Date utilities ───────────────────────────────────────────────────────────

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const LONG_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function utcDateStr(isoStr: string): string {
  return new Date(isoStr).toISOString().split("T")[0];
}

function weekMonday(d: Date): Date {
  const base = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  const dow = base.getUTCDay();
  base.setUTCDate(base.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return base;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

// ─── Stat calculators ─────────────────────────────────────────────────────────

function calcTotalMinutes(sessions: SessionRow[]): number {
  return sessions.reduce((s, r) => s + r.duration_minutes, 0);
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function calcDays(sessions: SessionRow[]): number {
  return new Set(sessions.map(s => utcDateStr(s.started_at))).size;
}

function calcStreak(sessions: SessionRow[]): number {
  if (sessions.length === 0) return 0;
  const dates = new Set(sessions.map(s => utcDateStr(s.started_at)));

  const prev = (ds: string): string => {
    const d = new Date(ds + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().split("T")[0];
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const yestStr = prev(todayStr);

  let cur: string;
  if (dates.has(todayStr)) {
    cur = todayStr;
  } else if (dates.has(yestStr)) {
    cur = yestStr;
  } else {
    return 0;
  }

  let streak = 0;
  while (dates.has(cur)) {
    streak++;
    cur = prev(cur);
  }
  return streak;
}

// ─── Chart builders ───────────────────────────────────────────────────────────

function buildWeekChart(sessions: SessionRow[], offset: number): ChartResult {
  const now = new Date();
  const mon = addDays(weekMonday(now), offset * 7);
  const sun = addDays(mon, 6);

  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const data: ChartPoint[] = DAY_LABELS.map((label, i) => {
    const day = addDays(mon, i).toISOString().split("T")[0];
    const hours = sessions
      .filter(s => utcDateStr(s.started_at) === day)
      .reduce((sum, s) => sum + s.duration_minutes / 60, 0);
    return { label, hours: Math.round(hours * 10) / 10 };
  });

  const fmt = (d: Date) =>
    `${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return {
    data,
    label: `${fmt(mon)} – ${fmt(sun)}`,
    isCurrentPeriod: offset === 0,
  };
}

function buildMonthChart(sessions: SessionRow[], offset: number): ChartResult {
  const now = new Date();
  const target = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1)
  );
  const yr = target.getUTCFullYear();
  const mo = target.getUTCMonth();
  const firstDay = new Date(Date.UTC(yr, mo, 1));
  const lastDay = new Date(Date.UTC(yr, mo + 1, 0));

  const data: ChartPoint[] = [];
  let ws = weekMonday(firstDay);

  while (ws <= lastDay) {
    const we = addDays(ws, 6);
    const wsStr = ws.toISOString().split("T")[0];
    const weStr = we.toISOString().split("T")[0];
    const hours = sessions
      .filter(s => {
        const d = utcDateStr(s.started_at);
        return d >= wsStr && d <= weStr;
      })
      .reduce((sum, s) => sum + s.duration_minutes / 60, 0);
    data.push({
      label: `${SHORT_MONTHS[ws.getUTCMonth()]}-${ws.getUTCDate()}`,
      hours: Math.round(hours * 10) / 10,
    });
    ws = addDays(ws, 7);
  }

  return {
    data,
    label: `${LONG_MONTHS[mo]} ${yr}`,
    isCurrentPeriod: offset === 0,
  };
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl bg-rose-50 p-3 border border-rose-100">
      <div className="text-rose-400">{icon}</div>
      <span className="text-lg font-bold text-rose-600">{value}</span>
      <span className="text-[11px] text-rose-400 text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

// ─── ReportPanel ──────────────────────────────────────────────────────────────

export function ReportPanel({
  isOpen,
  onClose,
  memberId,
  memberName,
  workspaceId,
}: ReportPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [allSessions, setAllSessions] = useState<AllSessionRow[]>([]);
  const [members, setMembers] = useState<ProcessedMember[]>([]);
  const [mounted, setMounted] = useState(false);

  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSessions([]);
    setAllSessions([]);

    const supabase = createClient();

    const [sessRes, membRes, allSessRes] = await Promise.all([
      supabase
        .from("pomodoro_sessions")
        .select("id, started_at, ended_at, duration_minutes, completed")
        .eq("user_id", memberId)
        .eq("workspace_id", workspaceId)
        .eq("completed", true),
      supabase
        .from("workspace_members")
        .select("user_id, profiles(name)")
        .eq("workspace_id", workspaceId),
      supabase
        .from("pomodoro_sessions")
        .select("id, user_id, duration_minutes, completed")
        .eq("workspace_id", workspaceId)
        .eq("completed", true),
    ]);

    if (sessRes.error || membRes.error || allSessRes.error) {
      setError("Could not load stats. Please try again.");
      setLoading(false);
      return;
    }

    setSessions((sessRes.data as SessionRow[]) ?? []);
    setAllSessions((allSessRes.data as AllSessionRow[]) ?? []);

    const rawMembers = (membRes.data as unknown as MemberQueryRow[]) ?? [];
    setMembers(
      rawMembers.map(m => ({
        userId: m.user_id,
        name: m.profiles?.name ?? "Unknown",
      }))
    );

    setLoading(false);
  }, [memberId, workspaceId]);

  // Fetch on open; explicit memberId dep ensures re-fetch if member somehow changes
  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen, memberId, workspaceId, fetchData]);

  // Realtime — no server-side filter (can silently fail); filter in JS instead
  useEffect(() => {
    if (!isOpen) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`report:${memberId}:${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pomodoro_sessions" },
        (payload) => {
          console.log("REALTIME EVENT", payload);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const session = payload.new as any;
          if (!session) return;
          if (session.workspace_id !== workspaceId) return;
          if (!session.completed) return;

          // Summary stats — only this member's sessions
          if (session.user_id === memberId) {
            setSessions(prev => {
              const exists = prev.find(s => s.id === session.id);
              if (exists) return prev.map(s => s.id === session.id ? session : s);
              return [...prev, session];
            });
          }

          // Ranking — all members' sessions (single source of truth)
          setAllSessions(prev => {
            const exists = prev.find(s => s.id === session.id);
            if (exists) return prev.map(s => s.id === session.id ? session : s);
            return [...prev, session];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isOpen, memberId, workspaceId]);

  // Derived stats
  const totalMinutesFocused = useMemo(() => calcTotalMinutes(sessions), [sessions]);
  const daysAccessed = useMemo(() => calcDays(sessions), [sessions]);
  const streak = useMemo(() => calcStreak(sessions), [sessions]);

  // Chart
  const weekChart = useMemo(
    () => buildWeekChart(sessions, weekOffset),
    [sessions, weekOffset]
  );
  const monthChart = useMemo(
    () => buildMonthChart(sessions, monthOffset),
    [sessions, monthOffset]
  );
  const chart = viewMode === "week" ? weekChart : monthChart;
  const atCurrent =
    viewMode === "week" ? weekOffset === 0 : monthOffset === 0;

  const yMax = useMemo(() => {
    const max = Math.max(...chart.data.map(p => p.hours), 0);
    return max + 0.5;
  }, [chart.data]);

  const handlePrev = () => {
    if (viewMode === "week") setWeekOffset(o => o - 1);
    else setMonthOffset(o => o - 1);
  };

  const handleNext = () => {
    if (viewMode === "week" && weekOffset < 0) setWeekOffset(o => o + 1);
    else if (viewMode === "month" && monthOffset < 0) setMonthOffset(o => o + 1);
  };

  // Ranking — derived from allSessions (same realtime source as summary)
  const ranked = useMemo(() => {
    const totals: Record<string, number> = {};
    allSessions
      .filter(s => s.completed)
      .forEach(s => { totals[s.user_id] = (totals[s.user_id] || 0) + s.duration_minutes; });
    return members
      .map(m => ({ userId: m.userId, name: m.name, totalMinutes: totals[m.userId] || 0 }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .map((m, i) => ({ ...m, rank: i + 1 }));
  }, [allSessions, members]);

  const medal = (rank: number): string => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return String(rank);
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="w-full max-w-md flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 pr-12 border-b border-rose-100 flex-shrink-0">
          <SheetTitle className="text-base">{memberName}</SheetTitle>
          <SheetDescription className="text-rose-400 text-xs font-medium">
            Focus Report
          </SheetDescription>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 text-rose-400 animate-spin" />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
              <button
                onClick={fetchData}
                className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-700 transition-colors"
              >
                <RefreshCw className="size-3" />
                Retry
              </button>
            </div>
          )}

          {/* Content */}
          {!loading && !error && (
            <Tabs defaultValue="summary">
              <TabsList className="w-full rounded-none bg-transparent border-b border-rose-100 p-0 h-auto mb-4">
                <TabsTrigger
                  value="summary"
                  className="flex-1 rounded-none border-b-2 border-transparent pb-2 pt-0 text-sm font-medium text-muted-foreground data-[state=active]:border-rose-400 data-[state=active]:text-rose-600 data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                >
                  Summary
                </TabsTrigger>
                <TabsTrigger
                  value="ranking"
                  className="flex-1 rounded-none border-b-2 border-transparent pb-2 pt-0 text-sm font-medium text-muted-foreground data-[state=active]:border-rose-400 data-[state=active]:text-rose-600 data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                >
                  Ranking
                </TabsTrigger>
              </TabsList>

              {/* ── Summary tab ── */}
              <TabsContent value="summary" className="space-y-4 mt-0">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  <StatCard
                    icon={<Clock className="size-4" />}
                    label="hrs focused"
                    value={formatDuration(totalMinutesFocused)}
                  />
                  <StatCard
                    icon={<CalendarDays className="size-4" />}
                    label="Days Accessed"
                    value={String(daysAccessed)}
                  />
                  <StatCard
                    icon={<Flame className="size-4" />}
                    label="Day Streak"
                    value={String(streak)}
                  />
                </div>

                {/* Empty state */}
                {sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <span className="text-3xl">🎯</span>
                    <p className="text-sm text-muted-foreground">
                      No focus sessions recorded yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* View mode selector */}
                    <div className="flex items-center gap-1 border-b border-rose-100 pb-2">
                      {(["week", "month"] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setViewMode(mode)}
                          className={cn(
                            "px-3 py-1 text-xs rounded-md capitalize transition-colors",
                            viewMode === mode
                              ? "bg-rose-100 text-rose-600 font-medium"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
                      ))}
                      <div className="flex items-center gap-1 cursor-not-allowed px-3 py-1 text-muted-foreground/40">
                        <Lock className="size-3" />
                        <span className="text-xs">Year</span>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handlePrev}
                        className="p-1 rounded hover:bg-rose-50 text-muted-foreground hover:text-rose-500 transition-colors"
                        aria-label="Previous period"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <span className="text-xs font-medium">{chart.label}</span>
                      <button
                        onClick={handleNext}
                        disabled={atCurrent}
                        className="p-1 rounded hover:bg-rose-50 text-muted-foreground hover:text-rose-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                        aria-label="Next period"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>

                    {/* Bar chart */}
                    {mounted && (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart
                          data={chart.data}
                          margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#fce7f3"
                          />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10, fill: "#9ca3af" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: "#9ca3af" }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, yMax]}
                            tickFormatter={(v) =>
                              formatDuration(Math.round(Number(v) * 60))
                            }
                          />
                          <Tooltip
                            formatter={(value) => {
                              const hrs = Array.isArray(value)
                                ? Number(value[0])
                                : Number(value ?? 0);
                              return [formatDuration(Math.round(hrs * 60)), ""] as [string, string];
                            }}
                            contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid #fce7f3",
                              fontSize: "12px",
                            }}
                            cursor={{ fill: "rgba(253,164,175,0.08)" }}
                          />
                          <Bar
                            dataKey="hours"
                            fill="#fda4af"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={32}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* ── Ranking tab ── */}
              <TabsContent value="ranking" className="mt-0 space-y-1">
                {ranked.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <span className="text-3xl">🏆</span>
                    <p className="text-sm text-muted-foreground">
                      No members found
                    </p>
                  </div>
                ) : (
                  ranked.map(m => {
                    const isTarget = m.userId === memberId;
                    return (
                      <div
                        key={m.userId}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                          isTarget
                            ? "bg-rose-50 border border-rose-100"
                            : "hover:bg-muted/40"
                        )}
                      >
                        <span className="text-base w-6 text-center flex-shrink-0">
                          {medal(m.rank)}
                        </span>
                        <span
                          className={cn(
                            "flex-1 text-sm",
                            isTarget
                              ? "font-semibold text-rose-700"
                              : "text-foreground"
                          )}
                        >
                          {m.name}
                        </span>
                        <span
                          className={cn(
                            "text-sm tabular-nums",
                            isTarget
                              ? "text-rose-600 font-medium"
                              : "text-muted-foreground"
                          )}
                        >
                          {formatDuration(m.totalMinutes)}
                        </span>
                      </div>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
