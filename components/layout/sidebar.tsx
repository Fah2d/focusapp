"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  CheckSquare,
  Clock,
  Calendar,
  Video,
  Settings,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Workspace, Profile } from "@/types/database";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, getInitials } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface NavItem {
  icon: React.ElementType;
  label: string;
  tab: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Home", tab: "home" },
  { icon: CheckSquare, label: "To-Dos", tab: "todos" },
  { icon: Clock, label: "Deadlines", tab: "deadlines" },
  { icon: Calendar, label: "Calendar", tab: "calendar" },
  { icon: Video, label: "Motivation", tab: "motivation" },
  { icon: Settings, label: "Settings", tab: "settings" },
];

interface Props {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  profile: Profile;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ workspaces, activeWorkspaceId, profile, activeTab, onTabChange }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  async function handleLogout() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      router.push("/auth/login");
      router.refresh();
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <aside className="flex h-full w-16 flex-col items-center gap-4 border-r border-border bg-card py-4">
        {/* Workspace switcher */}
        <WorkspaceSwitcher
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
        />

        <div className="mx-auto w-8 border-t border-border" />

        {/* Navigation */}
        <nav className="flex flex-col items-center gap-1 flex-1">
          {navItems.map(({ icon: Icon, label, tab }) => (
            <Tooltip key={tab}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onTabChange(tab)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                    activeTab === tab
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>

        {/* Bottom: avatar + logout */}
        <div className="flex flex-col items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-border hover:ring-primary transition-all">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.name} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="right">{profile.name}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Log out</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
