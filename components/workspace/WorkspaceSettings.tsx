"use client";

import { useState, useEffect, useRef } from "react";
import { User, Building2, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workspace, Profile } from "@/types/database";
import { ProfileSettings } from "./settings/ProfileSettings";
import { WorkspaceSettingsPanel } from "./settings/WorkspaceSettingsPanel";
import { AppearanceSettings } from "./settings/AppearanceSettings";

interface NavSection {
  id: string;
  label: string;
  icon: React.ElementType;
}

const navSections: NavSection[] = [
  { id: "profile",    label: "Profile",    icon: User },
  { id: "workspace",  label: "Workspace",  icon: Building2 },
  { id: "appearance", label: "Appearance", icon: Palette },
];

interface Props {
  workspace: Workspace;
  profile: Profile;
  userId: string;
  userEmail: string;
}

export function WorkspaceSettings({ workspace, profile, userId, userEmail }: Props) {
  const [activeSection, setActiveSection] = useState("profile");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  function scrollToSection(id: string) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  }

  useEffect(() => {
    const refs = sectionRefs.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-section");
            if (id) setActiveSection(id);
          }
        }
      },
      { rootMargin: "0px 0px -65% 0px", threshold: 0 }
    );
    Object.values(refs).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex gap-8 pb-16">
      {/* Left nav — sticky within the scrolling main container */}
      <nav className="sticky top-0 self-start w-44 flex-shrink-0 pt-1 hidden sm:block">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-3">
          Settings
        </p>
        <div className="space-y-0.5">
          {navSections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              className={cn(
                "flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm transition-colors text-left",
                activeSection === id
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile section tabs */}
      <div className="sm:hidden flex gap-1 mb-6 flex-wrap">
        {navSections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollToSection(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors border",
              activeSection === id
                ? "border-primary bg-primary/15 text-primary font-medium"
                : "border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Right content */}
      <div className="flex-1 min-w-0 max-w-2xl space-y-14">
        {navSections.map(({ id, label }) => (
          <section
            key={id}
            data-section={id}
            ref={(el) => { sectionRefs.current[id] = el; }}
          >
            <div className="mb-6">
              <h2 className="text-base font-semibold">{label}</h2>
              <div className="mt-2 h-px bg-border" />
            </div>

            {id === "profile" && (
              <ProfileSettings profile={profile} userEmail={userEmail} userId={userId} />
            )}
            {id === "workspace" && (
              <WorkspaceSettingsPanel workspace={workspace} userId={userId} />
            )}
            {id === "appearance" && (
              <AppearanceSettings />
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
