export type TaskStatus = 'open' | 'in_progress' | 'completed';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatarColor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskList {
  id: string;
  title: string;
  color?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskHistoryEntry {
  id: string;
  userId: string;
  type: string;
  at: string;
  payload?: Record<string, unknown>;
}

export interface Task {
  id: string;
  listId: string;
  title: string;
  description?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  dueAt?: string | null;
  status: TaskStatus;
  completedAt?: string | null;
  createdBy: string;
  assignedTo?: string | null;
  recurrence?: Record<string, unknown> | null;
  history: TaskHistoryEntry[];
  starred: boolean;
}
