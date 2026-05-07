"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  workspaceId: string;
  initialStatus: string;
  compact?: boolean;
}

export function StatusInput({ userId, workspaceId, initialStatus, compact }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("user_status").upsert(
      {
        user_id: userId,
        workspace_id: workspaceId,
        status_text: draft.trim(),
        date: new Date().toISOString().split("T")[0],
      },
      { onConflict: "user_id,workspace_id,date" }
    );
    if (!error) setStatus(draft.trim());
    setSaving(false);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") {
      setDraft(status);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What are you working on?"
          className={cn(
            "rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary",
            compact ? "w-48" : "w-64"
          )}
          maxLength={100}
        />
        <button
          onClick={save}
          disabled={saving}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setDraft(status); setEditing(true); }}
      className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
    >
      <span className={cn(!status && "italic")}>
        {status || "Set your status..."}
      </span>
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
