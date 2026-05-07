"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { Workspace } from "@/types/database";
import { cn, getInitials } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  workspaces: Workspace[];
  activeWorkspaceId: string;
}

export function WorkspaceSwitcher({ workspaces, activeWorkspaceId }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      {workspaces.map((ws) => (
        <Tooltip key={ws.id}>
          <TooltipTrigger asChild>
            <Link
              href={`/dashboard/${ws.id}`}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition-all",
                ws.id === activeWorkspaceId
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {getInitials(ws.name)}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{ws.name}</TooltipContent>
        </Tooltip>
      ))}

      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">New workspace</TooltipContent>
      </Tooltip>
    </div>
  );
}
