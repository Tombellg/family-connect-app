import { AppError } from '../../utils/appError';
import type { TaskStatus } from '../../types';
import {
  deleteTask as deleteTaskRow,
  fetchTaskById,
  fetchTaskLists,
  fetchTasks,
  insertTask,
  toggleTask,
  updateTaskRow,
} from './task.repository';

export const listTaskLists = async () => {
  return fetchTaskLists();
};

export const listTasks = async (params: { listId?: string; status?: TaskStatus }) => {
  return fetchTasks(params);
};

export const createTask = async (
  input: {
    listId: string;
    title: string;
    description?: string | null;
    notes?: string | null;
    dueAt?: string | null;
    status?: TaskStatus;
    assignedTo?: string | null;
    starred?: boolean;
  },
  userId: string
) => {
  return insertTask({ ...input, createdBy: userId });
};

export const updateTask = async (
  taskId: string,
  updates: {
    listId?: string;
    title?: string;
    description?: string | null;
    notes?: string | null;
    dueAt?: string | null;
    status?: TaskStatus;
    assignedTo?: string | null;
    starred?: boolean;
  }
) => {
  const task = await updateTaskRow(taskId, updates);
  if (!task) {
    throw new AppError('Task not found', { status: 404, code: 'TASK_NOT_FOUND' });
  }
  return task;
};

export const toggleTaskCompletion = async (taskId: string) => {
  const task = await toggleTask(taskId);
  if (!task) {
    throw new AppError('Task not found', { status: 404, code: 'TASK_NOT_FOUND' });
  }
  return task;
};

export const removeTask = async (taskId: string) => {
  const existing = await fetchTaskById(taskId);
  if (!existing) {
    throw new AppError('Task not found', { status: 404, code: 'TASK_NOT_FOUND' });
  }
  await deleteTaskRow(taskId);
};
