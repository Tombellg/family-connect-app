import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/requireAdmin';
import { adminCreateUserSchema, adminUpdateUserSchema } from '../validation/userSchemas';
import { createUser, deleteUser, listUsers, updateUser } from '../services/adminUserService';

const router = Router();

router.use(authMiddleware, requireAdmin);

router.get('/users', async (_req, res, next) => {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.post('/users', async (req, res, next) => {
  try {
    const payload = adminCreateUserSchema.parse(req.body);
    const user = await createUser(payload);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:userId', async (req, res, next) => {
  try {
    const payload = adminUpdateUserSchema.parse(req.body);
    const user = await updateUser(req.params.userId, payload);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:userId', async (req, res, next) => {
  try {
    await deleteUser(req.params.userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
