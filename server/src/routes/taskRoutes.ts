import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { createTask, deleteTask, getTaskLists, getTasks, toggleTaskCompletion, updateTask } from '../services/taskService';
import { AppError } from '../utils/errors';

const router = Router();

router.use(authMiddleware);

router.get('/lists', async (_req, res, next) => {
  try {
    const lists = await getTaskLists();
    res.json({ lists });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { listId, status } = req.query;
    const tasks = await getTasks({
      listId: typeof listId === 'string' ? listId : undefined,
      status: typeof status === 'string' ? (status as any) : undefined,
    });
    res.json({ tasks });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AppError('Not authenticated', { status: 401, code: 'AUTHENTICATION_REQUIRED' });
    }
    const task = await createTask(req.body, req.userId);
    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

router.put('/:taskId', async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AppError('Not authenticated', { status: 401, code: 'AUTHENTICATION_REQUIRED' });
    }
    const task = await updateTask(req.params.taskId, req.body, req.userId);
    res.json({ task });
  } catch (error) {
    next(error);
  }
});

router.patch('/:taskId/toggle', async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AppError('Not authenticated', { status: 401, code: 'AUTHENTICATION_REQUIRED' });
    }
    const task = await toggleTaskCompletion(req.params.taskId, req.userId);
    res.json({ task });
  } catch (error) {
    next(error);
  }
});

router.delete('/:taskId', async (req, res, next) => {
  try {
    await deleteTask(req.params.taskId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
