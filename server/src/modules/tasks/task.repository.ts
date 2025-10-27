import { randomUUID } from 'crypto';
import { getPool } from '../../db/connection';
import type { Task, TaskHistoryEntry, TaskList, TaskStatus } from '../../types';

interface TaskListRow {
  id: string;
  title: string;
  color: string | null;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

interface TaskRow {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  due_at: Date | null;
  status: string;
  completed_at: Date | null;
  created_by: string;
  assigned_to: string | null;
  recurrence: unknown;
  history: unknown;
  starred: boolean | null;
}

const mapList = (row: TaskListRow): TaskList => ({
  id: row.id,
  title: row.title,
  color: row.color,
  description: row.description,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const normalizeHistory = (value: unknown): TaskHistoryEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry !== 'object' || entry === null) {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const id = typeof record.id === 'string' ? record.id : randomUUID();
      const userId = typeof record.userId === 'string' ? record.userId : 'unknown';
      const type = typeof record.type === 'string' ? record.type : 'update';
      const at = typeof record.at === 'string' ? record.at : new Date().toISOString();
      const payload =
        typeof record.payload === 'object' && record.payload !== null
          ? (record.payload as Record<string, unknown>)
          : undefined;

      const historyEntry: TaskHistoryEntry = { id, userId, type, at, payload };
      return historyEntry;
    })
    .filter((entry): entry is TaskHistoryEntry => entry !== null);
};

const mapTask = (row: TaskRow): Task => ({
  id: row.id,
  listId: row.list_id,
  title: row.title,
  description: row.description,
  notes: row.notes,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  dueAt: row.due_at ? row.due_at.toISOString() : null,
  status: row.status as TaskStatus,
  completedAt: row.completed_at ? row.completed_at.toISOString() : null,
  createdBy: row.created_by,
  assignedTo: row.assigned_to,
  recurrence: (typeof row.recurrence === 'object' && row.recurrence !== null) || row.recurrence === null
    ? (row.recurrence as Record<string, unknown> | null)
    : null,
  history: normalizeHistory(row.history),
  starred: Boolean(row.starred),
});

export const fetchTaskLists = async (): Promise<TaskList[]> => {
  const pool = getPool();
  const { rows } = await pool.query<TaskListRow>(`SELECT * FROM task_lists ORDER BY created_at ASC`);
  return rows.map(mapList);
};

export const fetchTasks = async (params: {
  listId?: string;
  status?: TaskStatus;
}): Promise<Task[]> => {
  const pool = getPool();
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.listId) {
    conditions.push(`list_id = $${conditions.length + 1}`);
    values.push(params.listId);
  }

  if (params.status) {
    conditions.push(`status = $${conditions.length + 1}`);
    values.push(params.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query<TaskRow>(
    `SELECT * FROM tasks ${where} ORDER BY created_at DESC`,
    values
  );
  return rows.map(mapTask);
};

export const insertTask = async (params: {
  listId: string;
  title: string;
  description?: string | null;
  notes?: string | null;
  dueAt?: string | null;
  status?: TaskStatus;
  createdBy: string;
  assignedTo?: string | null;
  starred?: boolean;
}): Promise<Task> => {
  const pool = getPool();
  const id = randomUUID();
  const now = new Date();
  const dueAt = params.dueAt ? new Date(params.dueAt) : null;
  const historyEntry: TaskHistoryEntry = {
    id: randomUUID(),
    userId: params.createdBy,
    type: 'created',
    at: now.toISOString(),
    payload: { title: params.title },
  };

  await pool.query(
    `INSERT INTO tasks (
      id, list_id, title, description, notes, created_at, updated_at, due_at, status,
      completed_at, created_by, assigned_to, recurrence, history, starred
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13, $14, $15
    )`,
    [
      id,
      params.listId,
      params.title,
      params.description ?? null,
      params.notes ?? null,
      now,
      now,
      dueAt,
      params.status ?? 'open',
      null,
      params.createdBy,
      params.assignedTo ?? null,
      null,
      JSON.stringify([historyEntry]),
      params.starred ?? false,
    ]
  );

  return {
    id,
    listId: params.listId,
    title: params.title,
    description: params.description ?? null,
    notes: params.notes ?? null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    dueAt: dueAt ? dueAt.toISOString() : null,
    status: (params.status ?? 'open') as TaskStatus,
    completedAt: null,
    createdBy: params.createdBy,
    assignedTo: params.assignedTo ?? null,
    recurrence: null,
    history: [historyEntry],
    starred: params.starred ?? false,
  };
};

export const updateTaskRow = async (
  taskId: string,
  params: {
    listId?: string;
    title?: string;
    description?: string | null;
    notes?: string | null;
    dueAt?: string | null;
    status?: TaskStatus;
    assignedTo?: string | null;
    starred?: boolean;
  }
): Promise<Task | null> => {
  const pool = getPool();
  const existing = await fetchTaskById(taskId);
  if (!existing) {
    return null;
  }

  const now = new Date();

  const updatedTask = {
    ...existing,
    listId: params.listId ?? existing.listId,
    title: params.title ?? existing.title,
    description: params.description ?? existing.description,
    notes: params.notes ?? existing.notes,
    dueAt: params.dueAt ?? existing.dueAt,
    status: params.status ?? existing.status,
    assignedTo: params.assignedTo ?? existing.assignedTo,
    starred: params.starred ?? existing.starred,
    updatedAt: now.toISOString(),
  };

  await pool.query(
    `UPDATE tasks SET
      list_id = $2,
      title = $3,
      description = $4,
      notes = $5,
      updated_at = $6,
      due_at = $7,
      status = $8,
      assigned_to = $9,
      starred = $10
     WHERE id = $1`,
    [
      taskId,
      updatedTask.listId,
      updatedTask.title,
      updatedTask.description ?? null,
      updatedTask.notes ?? null,
      now,
      updatedTask.dueAt ? new Date(updatedTask.dueAt) : null,
      updatedTask.status,
      updatedTask.assignedTo ?? null,
      updatedTask.starred,
    ]
  );

  return updatedTask;
};

export const fetchTaskById = async (taskId: string): Promise<Task | null> => {
  const pool = getPool();
  const { rows } = await pool.query<TaskRow>(`SELECT * FROM tasks WHERE id = $1 LIMIT 1`, [taskId]);

  if (rows.length === 0) {
    return null;
  }

  return mapTask(rows[0]);
};

export const toggleTask = async (taskId: string): Promise<Task | null> => {
  const pool = getPool();
  const existing = await fetchTaskById(taskId);
  if (!existing) {
    return null;
  }

  const now = new Date();
  const isCompleted = existing.status === 'completed';
  const status: TaskStatus = isCompleted ? 'open' : 'completed';
  const completedAt = isCompleted ? null : now.toISOString();

  await pool.query(
    `UPDATE tasks SET status = $2, completed_at = $3, updated_at = $4 WHERE id = $1`,
    [taskId, status, completedAt ? new Date(completedAt) : null, now]
  );

  return {
    ...existing,
    status,
    completedAt,
    updatedAt: now.toISOString(),
  };
};

export const deleteTask = async (taskId: string): Promise<void> => {
  const pool = getPool();
  await pool.query(`DELETE FROM tasks WHERE id = $1`, [taskId]);
};
