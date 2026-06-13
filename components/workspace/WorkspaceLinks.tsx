"use client";

import { useState, useEffect, useRef } from "react";
import { ExternalLink, Plus, Pencil, Trash2, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface WorkspaceLink {
  id: string;
  workspace_id: string;
  name: string;
  url: string;
  note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  profiles?: { name: string } | null;
}

interface Props {
  workspaceId: string;
  currentUserId: string;
}

function normalizeUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
}

export function WorkspaceLinks({ workspaceId, currentUserId }: Props) {
  const supabase = createClient();
  const [links, setLinks] = useState<WorkspaceLink[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editName, setEditName] = useState("");
  const [editNote, setEditNote] = useState("");
  const [saving, setSaving] = useState(false);

  const mutatedRef = useRef<Set<string>>(new Set());

  async function loadLinks() {
    const { data } = await supabase
      .from("workspace_links")
      .select("*, profiles(name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (data) setLinks(data as WorkspaceLink[]);
    setLoading(false);
  }

  useEffect(() => {
    loadLinks();

    const channel = supabase
      .channel(`links:${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "workspace_links" }, (payload) => {
        const row = payload.new as WorkspaceLink | undefined;
        const oldRow = payload.old as { id: string } | undefined;

        if (payload.eventType === "DELETE") {
          const id = oldRow?.id;
          if (!id) return;
          setLinks((prev) => prev.filter((l) => l.id !== id));
          return;
        }
        if (!row) return;
        if (row.workspace_id !== workspaceId) return;
        if (mutatedRef.current.has(row.id)) {
          mutatedRef.current.delete(row.id);
          return;
        }

        if (payload.eventType === "INSERT") {
          setLinks((prev) => {
            if (prev.find((l) => l.id === row.id)) return prev;
            return [row, ...prev];
          });
        } else {
          setLinks((prev) => prev.map((l) => (l.id === row.id ? row : l)));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function handleAdd() {
    const url = normalizeUrl(newUrl);
    if (!url) return;
    const name = newName.trim() || url;

    setAdding(true);
    const { data } = await supabase
      .from("workspace_links")
      .insert({
        workspace_id: workspaceId,
        created_by: currentUserId,
        name,
        url,
        note: newNote.trim() || null,
      })
      .select("*, profiles(name)")
      .single();

    if (data) {
      mutatedRef.current.add((data as WorkspaceLink).id);
      setLinks((prev) => [data as WorkspaceLink, ...prev]);
    }

    setNewUrl("");
    setNewName("");
    setNewNote("");
    setShowAdd(false);
    setAdding(false);
  }

  function startEdit(link: WorkspaceLink) {
    setEditingId(link.id);
    setEditName(link.name);
    setEditUrl(link.url);
    setEditNote(link.note ?? "");
  }

  async function handleSaveEdit(id: string) {
    const url = normalizeUrl(editUrl);
    if (!url) return;
    const name = editName.trim() || url;

    setSaving(true);
    await supabase
      .from("workspace_links")
      .update({ name, url, note: editNote.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", id);

    mutatedRef.current.add(id);
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, name, url, note: editNote.trim() || null } : l))
    );
    setEditingId(null);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    mutatedRef.current.add(id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
    await supabase.from("workspace_links").delete().eq("id", id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Links</h2>
          <p className="text-sm text-muted-foreground">Shared links for everyone in this workspace.</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Link
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="URL *"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
            <Input
              placeholder="Name (defaults to URL)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <Input
            placeholder="Note (optional)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowAdd(false); setNewUrl(""); setNewName(""); setNewNote(""); }}
            >
              Cancel
            </Button>
            <Button size="sm" disabled={!newUrl.trim() || adding} onClick={handleAdd}>
              {adding ? "Adding…" : "Add"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          Loading…
        </div>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Link2 className="h-10 w-10 opacity-20" />
          <p className="text-sm">No links yet. Add one to share with the workspace.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) =>
            editingId === link.id ? (
              <div key={link.id} className="rounded-lg border border-primary/40 bg-card p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL *" autoFocus />
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                </div>
                <Input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Note (optional)" />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                  <Button size="sm" disabled={!editUrl.trim() || saving} onClick={() => handleSaveEdit(link.id)}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              <div
                key={link.id}
                className={cn(
                  "group rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow flex items-start gap-3"
                )}
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline truncate block"
                  >
                    {link.name}
                  </a>
                  <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                  {link.note && (
                    <p className="text-xs text-muted-foreground/80 mt-1">{link.note}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground/60 pt-0.5">
                    Added by {link.profiles?.name ?? "a member"}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => startEdit(link)}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
