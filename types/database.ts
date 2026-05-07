export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          invite_code?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey";
            columns: ["owner_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: "owner" | "member";
          joined_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: "owner" | "member";
          joined_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: "owner" | "member";
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workspace_members_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      user_status: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          status_text: string;
          date: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          status_text?: string;
          date?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string;
          status_text?: string;
          date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_status_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_status_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      pomodoro_sessions: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          started_at: string;
          ended_at: string | null;
          duration_minutes: number;
          completed: boolean | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          started_at: string;
          ended_at?: string | null;
          duration_minutes?: number;
          completed?: boolean | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string;
          started_at?: string;
          ended_at?: string | null;
          duration_minutes?: number;
          completed?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "pomodoro_sessions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pomodoro_sessions_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type WorkspaceMember =
  Database["public"]["Tables"]["workspace_members"]["Row"];
export type UserStatus = Database["public"]["Tables"]["user_status"]["Row"];
export type PomodoroSession =
  Database["public"]["Tables"]["pomodoro_sessions"]["Row"];

export type WorkspaceMemberWithProfile = WorkspaceMember & {
  profiles: Profile;
};

export interface CalendarEvent {
  id: string;
  workspace_id: string;
  created_by: string;
  title: string;
  description: string | null;
  event_date: string; // YYYY-MM-DD
  color: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

export type TimerMode = "pomodoro" | "short_break" | "long_break";

export interface PomodoroState {
  user_id: string;
  is_running: boolean;
  paused: boolean;
  paused_seconds_left: number | null;
  started_at: string | null;
  duration_minutes: number;
  mode: TimerMode;
  session_count: number;
}
