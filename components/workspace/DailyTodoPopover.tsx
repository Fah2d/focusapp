"use client";

import { useState, useEffect, useRef } from "react";
import { ListTodo, X, Plus, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { awardXP } from "@/lib/xp-engine";

interface Todo {
  id: string;
  task_text: string;
  completed: boolean;
}

interface Props {
  memberId: string;
  memberName: string;
  workspaceId: string;
  isOwner: boolean;
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DailyTodoPopover({ memberId, memberName, workspaceId, isOwner }: Props) {
  const [open, setOpen] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!open) return;
    fetchTodos();
  }, [open]);

  async function fetchTodos() {
    setLoading(true);
    const { data } = await supabase
      .from("daily_todos")
      .select("id, task_text, completed")
      .eq("user_id", memberId)
      .eq("workspace_id", workspaceId)
      .eq("date", todayUTC())
      .order("created_at", { ascending: true });
    setTodos(data ?? []);
    setLoading(false);
  }

  async function addTodo() {
    const text = inputValue.trim();
    if (!text || adding) return;
    setAdding(true);
    const { data } = await supabase
      .from("daily_todos")
      .insert({ user_id: memberId, workspace_id: workspaceId, task_text: text, date: todayUTC() })
      .select("id, task_text, completed")
      .single();
    if (data) setTodos((prev) => [...prev, data]);
    setInputValue("");
    setAdding(false);
    inputRef.current?.focus();
  }

  async function toggleTodo(id: string, completed: boolean) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t)));
    await supabase.from("daily_todos").update({ completed: !completed }).eq("id", id);
    if (!completed) {
      await awardXP(supabase, memberId, workspaceId, 15, "daily_todo_complete", { todo_id: id });
    }
  }

  async function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("daily_todos").delete().eq("id", id);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") addTodo();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          title={`${memberName}'s daily tasks`}
        >
          <ListTodo className="size-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-72 p-0 bg-card border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-sm font-medium leading-none">{memberName}&apos;s Tasks</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Today</p>
          </div>

          {/* Task list */}
          <div className="max-h-64 overflow-y-auto px-2 py-2 flex flex-col gap-0.5">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : todos.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-4">
                No tasks for today
              </p>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className="group/item flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/40"
                >
                  <button
                    onClick={() => isOwner && toggleTodo(todo.id, todo.completed)}
                    disabled={!isOwner}
                    className="flex-shrink-0 size-4 rounded border border-border flex items-center justify-center transition-colors disabled:cursor-default"
                    style={
                      todo.completed
                        ? { backgroundColor: "rgb(244 63 94 / 0.8)", borderColor: "rgb(244 63 94 / 0.8)" }
                        : undefined
                    }
                  >
                    {todo.completed && (
                      <svg className="size-2.5 text-white" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`flex-1 text-xs leading-tight ${
                      todo.completed ? "line-through text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {todo.task_text}
                  </span>
                  {isOwner && (
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="opacity-0 group-hover/item:opacity-60 hover:!opacity-100 transition-opacity flex-shrink-0"
                    >
                      <X className="size-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add task input — owner only */}
          {isOwner && (
            <div className="border-t border-border px-2 py-2 flex items-center gap-1.5">
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a task…"
                className="flex-1 bg-transparent text-xs placeholder:text-muted-foreground/60 outline-none"
              />
              <button
                onClick={addTodo}
                disabled={!inputValue.trim() || adding}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
