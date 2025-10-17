import { Router } from 'express';
import authRoutes from './authRoutes';
import taskRoutes from './taskRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);

export default router;
