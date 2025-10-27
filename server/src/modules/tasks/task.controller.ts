import type { Request, Response, NextFunction } from 'express';
import { createTaskSchema, updateTaskSchema } from './task.validators';
import {
  createTask,
  listTaskLists,
  listTasks,
  removeTask,
  toggleTaskCompletion,
  updateTask,
} from './task.service';

export const listTaskListsHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const lists = await listTaskLists();
    res.json({ lists });
  } catch (error) {
    next(error);
  }
};

export const listTasksHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listId, status } = req.query;
    const tasks = await listTasks({
      listId: typeof listId === 'string' ? listId : undefined,
      status: typeof status === 'string' ? (status as any) : undefined,
    });
    res.json({ tasks });
  } catch (error) {
    next(error);
  }
};

export const createTaskHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const payload = createTaskSchema.parse(req.body);
    const task = await createTask(payload, req.userId);
    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
};

export const updateTaskHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const payload = updateTaskSchema.parse(req.body);
    const task = await updateTask(req.params.taskId, payload);
    res.json({ task });
  } catch (error) {
    next(error);
  }
};

export const toggleTaskHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const task = await toggleTaskCompletion(req.params.taskId);
    res.json({ task });
  } catch (error) {
    next(error);
  }
};

export const deleteTaskHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await removeTask(req.params.taskId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
