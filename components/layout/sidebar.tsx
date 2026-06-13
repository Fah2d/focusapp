"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  CheckSquare,
  Clock,
  Calendar,
  Trophy,
  Settings,
  LogOut,
  Loader2,
  Link2,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  { icon: Link2, label: "Links", tab: "links" },
  { icon: Trophy, label: "Rewards", tab: "rewards" },
  { icon: Settings, label: "Settings", tab: "settings" },
];

interface Props {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  profile: Profile;
  userEmail: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ workspaces, activeWorkspaceId, profile, userEmail, activeTab, onTabChange }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setSigningOut(false);
    } else {
      router.push("/auth/login");
      router.refresh();
    }
  }

  function handleTabAndClose(tab: string) {
    onTabChange(tab);
    setPopoverOpen(false);
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
                      ? "bg-primary/20 text-primary ring-1 ring-inset ring-primary/30 shadow-sm"
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

        {/* Bottom: avatar with popover */}
        <div className="flex flex-col items-center">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-border hover:ring-primary transition-all">
                    <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.name} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                      {getInitials(profile.name)}
                    </AvatarFallback>
                  </Avatar>
                </PopoverTrigger>
              </TooltipTrigger>
              {!popoverOpen && (
                <TooltipContent side="right">{profile.name}</TooltipContent>
              )}
            </Tooltip>

            <PopoverContent
              side="top"
              align="start"
              sideOffset={12}
              className="w-56 p-0 overflow-hidden bg-popover border border-border shadow-lg"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-3 py-3 border-b border-border">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.name} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate leading-tight">{profile.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate leading-tight">{userEmail}</p>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => handleTabAndClose("settings")}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-left"
                >
                  <span>⚙️</span>
                  <span>Settings</span>
                </button>
                <button
                  onClick={() => handleTabAndClose("rewards")}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-left"
                >
                  <span>🏆</span>
                  <span>Rewards Hub</span>
                </button>
              </div>

              <div className="border-t border-border py-1">
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors text-left disabled:opacity-60"
                >
                  {signingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                  ) : (
                    <span>🚪</span>
                  )}
                  <span>{signingOut ? "Signing out…" : "Sign Out"}</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </aside>
    </TooltipProvider>
  );
}
