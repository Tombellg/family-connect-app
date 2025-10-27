import { Router } from 'express';
import authRouter from '../modules/auth/auth.router';
import taskRouter from '../modules/tasks/task.router';

const router = Router();

router.use('/auth', authRouter);
router.use('/tasks', taskRouter);

export default router;
