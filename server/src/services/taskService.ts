import { nanoid } from 'nanoid';
import { isValid, parseISO } from 'date-fns';
import { z } from 'zod';
import { dataStore } from '../storage/dataStore';
import { Recurrence, Task, TaskList, TaskStatus } from '../types';
import { advanceRecurrence } from '../utils/recurrence';
import { toPublicTask } from '../utils/sanitize';
import { createTaskSchema, recurrenceSchema, updateTaskSchema } from '../validation/taskSchemas';

const listPalette = ['#38bdf8', '#a855f7', '#14b8a6', '#f97316', '#facc15'];

type RecurrenceInput = z.infer<typeof recurrenceSchema>;

function pickListColor(index: number): string {
  return listPalette[index % listPalette.length];
}

function ensureIsoDate(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const date = parseISO(value);
  if (!isValid(date)) {
    throw new Error('Invalid date format, expected ISO 8601 string');
  }
  return date.toISOString();
}

function buildRecurrence(raw: RecurrenceInput, anchorDate: string): Recurrence {
  switch (raw.type) {
    case 'daily':
      return {
        type: 'daily',
        daily: { interval: raw.interval },
        anchorDate,
        occurrenceCount: 0,
        end: raw.end,
      };
    case 'weekly':
      return {
        type: 'weekly',
        weekly: { interval: raw.interval, days: raw.days },
        anchorDate,
        occurrenceCount: 0,
        end: raw.end,
      };
    case 'monthly':
      return {
        type: 'monthly',
        monthly: {
          mode: raw.mode,
          interval: raw.interval,
          day: raw.day,
          nth: raw.nth,
          weekday: raw.weekday,
        },
        anchorDate,
        occurrenceCount: 0,
        end: raw.end,
      };
    case 'yearly':
      return {
        type: 'yearly',
        yearly: {
          mode: raw.mode,
          interval: raw.interval,
          month: raw.month,
          day: raw.day,
          nth: raw.nth,
          weekday: raw.weekday,
        },
        anchorDate,
        occurrenceCount: 0,
        end: raw.end,
      };
    default:
      throw new Error('Unsupported recurrence type');
  }
}

async function ensureList(listId: string | undefined, listTitle: string | undefined): Promise<TaskList> {
  if (listId) {
    const existing = await dataStore.findTaskListById(listId);
    if (existing) {
      return existing;
    }
  }

  const fallbackTitle = listTitle?.trim();
  if (!fallbackTitle) {
    throw new Error('Task list is required');
  }

  const lists = await dataStore.getTaskLists();
  const now = new Date().toISOString();
  const newList: TaskList = {
    id: listId ?? nanoid(10),
    title: fallbackTitle,
    color: pickListColor(lists.length),
    createdAt: now,
    updatedAt: now,
  };

  await dataStore.addTaskList(newList);
  return newList;
}

export async function getTaskLists(): Promise<TaskList[]> {
  const lists = await dataStore.getTaskLists();
  const stats = await dataStore.getTaskCountsByList();
  return lists.map((list, index) => ({
    ...list,
    color: list.color ?? pickListColor(index),
    stats: stats[list.id] ?? { total: 0, open: 0, completed: 0 },
  }));
}

export async function getTasks(filter?: { listId?: string; status?: TaskStatus | 'all' }): Promise<Task[]> {
  let tasks = await dataStore.getTasks();
  if (filter?.listId) {
    tasks = tasks.filter((task) => task.listId === filter.listId);
  }
  if (filter?.status && filter.status !== 'all') {
    tasks = tasks.filter((task) => task.status === filter.status);
  }
  return tasks
    .map((task) => toPublicTask(task))
    .sort((a, b) => {
      if (a.dueAt && b.dueAt) {
        return a.dueAt.localeCompare(b.dueAt);
      }
      if (a.dueAt) {
        return -1;
      }
      if (b.dueAt) {
        return 1;
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}

export async function createTask(input: unknown, userId: string): Promise<Task> {
  const parsed = createTaskSchema.parse(input);
  const now = new Date().toISOString();
  const list = await ensureList(parsed.listId, parsed.listTitle);
  const rawDueAt = ensureIsoDate(parsed.dueAt);
  const anchor = rawDueAt ?? (parsed.recurrence ? now : undefined);
  const recurrence = parsed.recurrence ? buildRecurrence(parsed.recurrence, anchor ?? now) : undefined;

  const task: Task = {
    id: nanoid(14),
    listId: list.id,
    title: parsed.title.trim(),
    createdAt: now,
    updatedAt: now,
    status: 'open',
    createdBy: userId,
    history: [],
    starred: parsed.starred ?? false,
  };

  if (parsed.description !== undefined) {
    const value = parsed.description.trim();
    if (value) {
      task.description = value;
    }
  }

  if (parsed.notes !== undefined) {
    const value = parsed.notes.trim();
    if (value) {
      task.notes = value;
    }
  }

  if (anchor) {
    task.dueAt = anchor;
  }

  if (recurrence) {
    task.recurrence = recurrence;
  }

  await dataStore.saveTask(task);
  return toPublicTask(task);
}

export async function updateTask(taskId: string, input: unknown, userId: string): Promise<Task> {
  const parsed = updateTaskSchema.parse(input);
  const task = await dataStore.findTaskById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  if (parsed.title !== undefined) {
    task.title = parsed.title.trim();
  }

  if (parsed.description !== undefined) {
    const value = parsed.description.trim();
    if (value) {
      task.description = value;
    } else {
      delete task.description;
    }
  }

  if (parsed.notes !== undefined) {
    const value = parsed.notes.trim();
    if (value) {
      task.notes = value;
    } else {
      delete task.notes;
    }
  }

  if (parsed.dueAt !== undefined) {
    if (parsed.dueAt === null) {
      delete task.dueAt;
    } else {
      task.dueAt = ensureIsoDate(parsed.dueAt);
    }
  }

  if (parsed.starred !== undefined) {
    task.starred = parsed.starred;
  }

  if (parsed.status !== undefined) {
    task.status = parsed.status;
    if (parsed.status === 'open') {
      delete task.completedAt;
    } else {
      task.completedAt = new Date().toISOString();
    }
  }

  const sanitizedListId = parsed.listId && parsed.listId !== '__new__' ? parsed.listId : undefined;
  const sanitizedListTitle = parsed.listTitle?.trim();
  if (sanitizedListId || sanitizedListTitle) {
    const list = await ensureList(sanitizedListId, sanitizedListTitle);
    task.listId = list.id;
  }

  if (parsed.recurrence === null) {
    delete task.recurrence;
  } else if (parsed.recurrence) {
    const anchor = task.dueAt ?? new Date().toISOString();
    task.recurrence = buildRecurrence(parsed.recurrence, anchor);
  }

  task.updatedAt = new Date().toISOString();
  await dataStore.saveTask(task);
  return toPublicTask(task);
}

export async function toggleTaskCompletion(taskId: string, userId: string): Promise<Task> {
  const task = await dataStore.findTaskById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  const now = new Date().toISOString();

  if (!Array.isArray(task.history)) {
    task.history = [];
  }

  if (task.recurrence) {
    const currentDue = task.dueAt ?? now;
    const { updatedRecurrence, nextOccurrence } = advanceRecurrence(task.recurrence, currentDue);
    task.history.push({ occurrenceDate: currentDue, completedAt: now, completedBy: userId });
    if (nextOccurrence) {
      task.dueAt = nextOccurrence;
      task.recurrence = updatedRecurrence;
      task.status = 'open';
      delete task.completedAt;
    } else {
      delete task.recurrence;
      task.status = 'completed';
      task.completedAt = now;
    }
  } else {
    const isCompleted = task.status === 'completed';
    task.status = isCompleted ? 'open' : 'completed';
    if (task.status === 'completed') {
      task.completedAt = now;
    } else {
      delete task.completedAt;
    }
  }

  task.updatedAt = now;
  await dataStore.saveTask(task);
  return toPublicTask(task);
}

export async function deleteTask(taskId: string): Promise<void> {
  await dataStore.removeTask(taskId);
}

export async function getTaskCountsByList(): Promise<Record<string, { total: number; open: number; completed: number }>> {
  return dataStore.getTaskCountsByList();
}
