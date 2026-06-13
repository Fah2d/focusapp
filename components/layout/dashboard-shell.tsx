"use client";

import { useState, useEffect } from "react";
import type { Workspace, Profile } from "@/types/database";
import { PomodoroProvider } from "@/contexts/pomodoro-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { WorkspaceCalendar } from "@/components/workspace/WorkspaceCalendar";
import { WorkspaceTaskBoard } from "@/components/workspace/WorkspaceTaskBoard";
import { WorkspaceDeadlines } from "@/components/workspace/WorkspaceDeadlines";
import { WorkspaceSettings } from "@/components/workspace/WorkspaceSettings";
import { RewardsHub } from "@/components/workspace/RewardsHub";
import { WorkspaceLinks } from "@/components/workspace/WorkspaceLinks";
import { XPGainAnimation } from "@/components/feedback/XPGainAnimation";
import { LevelUpModal } from "@/components/feedback/LevelUpModal";
import { AchievementUnlockToast } from "@/components/feedback/AchievementUnlockToast";


interface Props {
  workspace: Workspace;
  workspaces: Workspace[];
  profile: Profile;
  userId: string;
  userEmail: string;
  workspaceId: string;
  initialStatus: string;
  children: React.ReactNode;
}

export function DashboardShell({
  workspace,
  workspaces,
  profile,
  userId,
  userEmail,
  workspaceId,
  initialStatus,
  children,
}: Props) {
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    function onTabEvent(e: Event) {
      const tab = (e as CustomEvent<string>).detail;
      if (tab) setActiveTab(tab);
    }
    window.addEventListener("focusapp:tab", onTabEvent);
    return () => window.removeEventListener("focusapp:tab", onTabEvent);
  }, []);

  return (
    <PomodoroProvider userId={userId} workspaceId={workspaceId}>
      <XPGainAnimation userId={userId} workspaceId={workspaceId} />
      <LevelUpModal userId={userId} workspaceId={workspaceId} />
      <AchievementUnlockToast userId={userId} workspaceId={workspaceId} />
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          workspaces={workspaces}
          activeWorkspaceId={workspaceId}
          profile={profile}
          userEmail={userEmail}
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
            <div className={activeTab === "links" ? "h-full" : "hidden"}>
              <WorkspaceLinks workspaceId={workspaceId} currentUserId={userId} />
            </div>
            <div className={activeTab === "settings" ? "animate-fade-in" : "hidden"}>
              <WorkspaceSettings
                workspace={workspace}
                profile={profile}
                userId={userId}
                userEmail={userEmail}
              />
            </div>
            <div className={activeTab === "rewards" ? "animate-fade-in" : "hidden"}>
              <RewardsHub userId={userId} workspaceId={workspaceId} />
            </div>
          </main>
        </div>
      </div>
    </PomodoroProvider>
  );
}

