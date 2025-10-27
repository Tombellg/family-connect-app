export type TaskStatus = 'open' | 'completed';

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface RecurrenceEndNever {
  type: 'never';
}

export interface RecurrenceEndAfter {
  type: 'afterOccurrences';
  occurrences: number;
}

export interface RecurrenceEndOnDate {
  type: 'onDate';
  date: string;
}

export type RecurrenceEnd = RecurrenceEndNever | RecurrenceEndAfter | RecurrenceEndOnDate;

export interface RecurrenceDaily {
  interval: number;
}

export interface RecurrenceWeekly {
  interval: number;
  days: Weekday[];
}

export interface RecurrenceMonthly {
  mode: 'dayOfMonth' | 'nthWeekday';
  interval: number;
  day?: number;
  nth?: number;
  weekday?: Weekday;
}

export interface RecurrenceYearly {
  mode: 'specificDate' | 'nthWeekdayOfMonth';
  interval: number;
  month: number;
  day?: number;
  nth?: number;
  weekday?: Weekday;
}

export type Recurrence =
  | {
      type: 'daily';
      daily: RecurrenceDaily;
      anchorDate: string;
      end?: RecurrenceEnd;
      lastOccurrence?: string;
      occurrenceCount: number;
    }
  | {
      type: 'weekly';
      weekly: RecurrenceWeekly;
      anchorDate: string;
      end?: RecurrenceEnd;
      lastOccurrence?: string;
      occurrenceCount: number;
    }
  | {
      type: 'monthly';
      monthly: RecurrenceMonthly;
      anchorDate: string;
      end?: RecurrenceEnd;
      lastOccurrence?: string;
      occurrenceCount: number;
    }
  | {
      type: 'yearly';
      yearly: RecurrenceYearly;
      anchorDate: string;
      end?: RecurrenceEnd;
      lastOccurrence?: string;
      occurrenceCount: number;
    };

export interface TaskHistoryEntry {
  occurrenceDate: string;
  completedAt: string;
  completedBy: string;
}

export interface Task {
  id: string;
  listId: string;
  title: string;
  description?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  dueAt?: string;
  status: TaskStatus;
  completedAt?: string;
  createdBy?: string;
  assignedTo?: string;
  recurrence?: Recurrence;
  history: TaskHistoryEntry[];
  starred?: boolean;
}

export interface TaskList {
  id: string;
  title: string;
  color?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  stats?: {
    total: number;
    open: number;
    completed: number;
  };
}

export type UserRole = 'user' | 'admin';

export type UserStatus = 'active' | 'pending' | 'suspended';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor?: string;
  createdAt: string;
  updatedAt: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string;
}

export interface TaskFilters {
  search: string;
  status: 'all' | 'open' | 'completed';
  showStarredOnly: boolean;
}

export interface TaskFormInput {
  id?: string;
  title: string;
  description?: string;
  notes?: string;
  dueAt?: string | null;
  listId?: string;
  listTitle?: string;
  starred?: boolean;
  recurrence?: RecurrenceFormState | null;
}

export type RecurrenceFormState =
  | ({ type: 'daily'; interval: number; endType: RecurrenceEnd['type']; occurrences?: number; untilDate?: string })
  | ({ type: 'weekly'; interval: number; days: Weekday[]; endType: RecurrenceEnd['type']; occurrences?: number; untilDate?: string })
  | ({ type: 'monthly'; interval: number; mode: 'dayOfMonth'; day: number; endType: RecurrenceEnd['type']; occurrences?: number; untilDate?: string })
  | ({ type: 'monthly'; interval: number; mode: 'nthWeekday'; nth: number; weekday: Weekday; endType: RecurrenceEnd['type']; occurrences?: number; untilDate?: string })
  | ({ type: 'yearly'; interval: number; mode: 'specificDate'; month: number; day: number; endType: RecurrenceEnd['type']; occurrences?: number; untilDate?: string })
  | ({ type: 'yearly'; interval: number; mode: 'nthWeekdayOfMonth'; month: number; nth: number; weekday: Weekday; endType: RecurrenceEnd['type']; occurrences?: number; untilDate?: string });
