import { Router } from 'express';
import { loginSchema, registerSchema } from '../validation/taskSchemas';
import { loginUser, registerUser, getUserProfile } from '../services/authService';
import { sessionCookieOptions } from '../utils/cookies';
import { authMiddleware } from '../middleware/authMiddleware';
import { config } from '../config';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const payload = registerSchema.parse(req.body);
    const { user, token } = await registerUser(payload.name, payload.email, payload.password);
    res
      .cookie(config.cookieName, token, sessionCookieOptions())
      .status(201)
      .json({ user });
  } catch (error: any) {
    res.status(400).json({ error: error.message ?? 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const payload = loginSchema.parse(req.body);
    const { user, token } = await loginUser(payload.email, payload.password);
    res
      .cookie(config.cookieName, token, sessionCookieOptions())
      .json({ user });
  } catch (error: any) {
    res.status(400).json({ error: error.message ?? 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(config.cookieName, sessionCookieOptions());
  res.json({ success: true });
});

router.get('/me', authMiddleware, (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = getUserProfile(req.userId);
    res.json({ user });
  } catch (error: any) {
    res.status(404).json({ error: error.message ?? 'User not found' });
  }
});

export default router;
