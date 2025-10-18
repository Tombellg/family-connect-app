import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { createTask, deleteTask, getTaskLists, getTasks, toggleTaskCompletion, updateTask } from '../services/taskService';

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

router.post('/', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const task = await createTask(req.body, req.userId);
    res.status(201).json({ task });
  } catch (error: any) {
    res.status(400).json({ error: error.message ?? 'Unable to create task' });
  }
});

router.put('/:taskId', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const task = await updateTask(req.params.taskId, req.body, req.userId);
    res.json({ task });
  } catch (error: any) {
    res.status(400).json({ error: error.message ?? 'Unable to update task' });
  }
});

router.patch('/:taskId/toggle', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const task = await toggleTaskCompletion(req.params.taskId, req.userId);
    res.json({ task });
  } catch (error: any) {
    res.status(400).json({ error: error.message ?? 'Unable to toggle task' });
  }
});

router.delete('/:taskId', async (req, res) => {
  try {
    await deleteTask(req.params.taskId);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message ?? 'Unable to delete task' });
  }
});

export default router;
