export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface WorkspaceTask {
  id: string;
  workspace_id: string;
  created_by: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  is_deadline: boolean;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
  assignees?: string[];
  subtasks?: TaskSubtask[];
}

export interface TaskSubtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface TaskAssignee {
  task_id: string;
  user_id: string;
}

export function formatTimeLeft(dueDateISO: string | null): string {
  if (!dueDateISO) return "";
  const [y, m, d] = dueDateISO.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((due.getTime() - nowDay.getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 7) return `${diff}d left`;
  if (diff < 30) return `${Math.round(diff / 7)}w left`;
  return `${Math.round(diff / 30)}mo left`;
}

export function isOverdue(dueDateISO: string | null): boolean {
  if (!dueDateISO) return false;
  const [y, m, d] = dueDateISO.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  return due < new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
