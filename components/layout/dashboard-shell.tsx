"use client";

import { useState } from "react";
import { CheckSquare, Clock, Calendar, Video, Settings } from "lucide-react";
import type { Workspace, Profile } from "@/types/database";
import { PomodoroProvider } from "@/contexts/pomodoro-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { WorkspaceCalendar } from "@/components/workspace/WorkspaceCalendar";
import { WorkspaceTaskBoard } from "@/components/workspace/WorkspaceTaskBoard";
import { WorkspaceDeadlines } from "@/components/workspace/WorkspaceDeadlines";

interface PlaceholderTab {
  icon: React.ElementType;
  label: string;
  description: string;
}

const placeholderTabs: Record<string, PlaceholderTab> = {
  todos: {
    icon: CheckSquare,
    label: "To-Dos",
    description: "Shared task lists for your workspace. Assign, track, and complete tasks together.",
  },
  deadlines: {
    icon: Clock,
    label: "Deadlines",
    description: "Countdown timers for important milestones. Never miss a due date again.",
  },
  calendar: {
    icon: Calendar,
    label: "Calendar",
    description: "A shared calendar for team events, focus blocks, and scheduled sessions.",
  },
  motivation: {
    icon: Video,
    label: "Motivation Hub",
    description: "Curated videos and resources to keep your team inspired and energized.",
  },
  settings: {
    icon: Settings,
    label: "Settings",
    description: "Workspace settings, member management, and notification preferences.",
  },
};

interface Props {
  workspace: Workspace;
  workspaces: Workspace[];
  profile: Profile;
  userId: string;
  workspaceId: string;
  initialStatus: string;
  children: React.ReactNode;
}

export function DashboardShell({
  workspace,
  workspaces,
  profile,
  userId,
  workspaceId,
  initialStatus,
  children,
}: Props) {
  const [activeTab, setActiveTab] = useState("home");

  const implementedTabs = new Set(["home", "calendar", "todos", "deadlines"]);
  const placeholder = !implementedTabs.has(activeTab) ? placeholderTabs[activeTab] : null;

  return (
    <PomodoroProvider userId={userId} workspaceId={workspaceId}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          workspaces={workspaces}
          activeWorkspaceId={workspaceId}
          profile={profile}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar
            workspace={workspace}
            userId={userId}
            workspaceId={workspaceId}
            initialStatus={initialStatus}
          />

          <main className="flex-1 overflow-y-auto p-6">
            {/* Always mounted — CSS show/hide preserves state across tab switches */}
            <div className={activeTab === "home" ? "h-full" : "hidden"}>
              {children}
            </div>
            <div className={activeTab === "calendar" ? "h-full" : "hidden"}>
              <WorkspaceCalendar workspaceId={workspaceId} currentUserId={userId} />
            </div>
            <div className={activeTab === "todos" ? "h-full" : "hidden"}>
              <WorkspaceTaskBoard workspaceId={workspaceId} currentUserId={userId} />
            </div>
            <div className={activeTab === "deadlines" ? "h-full" : "hidden"}>
              <WorkspaceDeadlines workspaceId={workspaceId} currentUserId={userId} />
            </div>
            {placeholder && <ComingSoon tab={placeholder} />}
          </main>
        </div>
      </div>
    </PomodoroProvider>
  );
}

function ComingSoon({ tab }: { tab: PlaceholderTab }) {
  const Icon = tab.icon;
  return (
    <div className="flex h-full items-center justify-center animate-fade-in">
      <div className="text-center space-y-4 max-w-sm">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{tab.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tab.description}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Coming soon
        </div>
      </div>
    </div>
  );
}
