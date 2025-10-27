import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  createTaskHandler,
  deleteTaskHandler,
  listTaskListsHandler,
  listTasksHandler,
  toggleTaskHandler,
  updateTaskHandler,
} from './task.controller';

const router = Router();

router.use(authenticate);
router.get('/lists', listTaskListsHandler);
router.get('/', listTasksHandler);
router.post('/', createTaskHandler);
router.put('/:taskId', updateTaskHandler);
router.patch('/:taskId/toggle', toggleTaskHandler);
router.delete('/:taskId', deleteTaskHandler);

export default router;
