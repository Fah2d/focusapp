"use client";

import { useState } from "react";
import { Loader2, Users, Zap } from "lucide-react";

import { createWorkspace } from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { JoinWorkspaceModal } from "@/components/workspace/join-workspace-modal";

interface Props {
  userId: string;
}

export function CreateWorkspaceForm({ userId }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const { toast } = useToast();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const result = await createWorkspace(name.trim());

    if (result?.error) {
      toast({ variant: "destructive", title: "Error", description: result.error });
      setLoading(false);
    }
    // on success the server action calls redirect(), so no client-side navigation needed
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 mb-4">
          <Zap className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Create your first workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A workspace is a shared space for your team to focus together
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workspace-name">Workspace name</Label>
          <Input
            id="workspace-name"
            placeholder="e.g. Study Group, Dev Team..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Create workspace
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={() => setJoinOpen(true)}>
        <Users className="h-4 w-4" />
        Join a workspace
      </Button>

      <JoinWorkspaceModal
        open={joinOpen}
        onOpenChange={setJoinOpen}
        userId={userId}
      />
    </div>
  );
}
