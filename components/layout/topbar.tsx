"use client";

import { useState } from "react";
import type { Workspace, UserStatus } from "@/types/database";
import { InviteButton } from "@/components/workspace/invite-button";
import { StatusInput } from "@/components/status/status-input";

interface Props {
  workspace: Workspace;
  userId: string;
  workspaceId: string;
  initialStatus: string;
}

export function Topbar({ workspace, userId, workspaceId, initialStatus }: Props) {
  const [editingStatus, setEditingStatus] = useState(false);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        <h1 className="font-semibold text-foreground">{workspace.name}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* My status */}
        <StatusInput
          userId={userId}
          workspaceId={workspaceId}
          initialStatus={initialStatus}
          compact
        />

        <InviteButton inviteCode={workspace.invite_code} />
      </div>
    </header>
  );
}
