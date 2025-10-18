import { NextFunction, Router } from 'express';
import { loginSchema, registerSchema } from '../validation/taskSchemas';
import { loginUser, registerUser, getUserProfile } from '../services/authService';
import { sessionCookieOptions } from '../utils/cookies';
import { authMiddleware } from '../middleware/authMiddleware';
import { config } from '../config';
import { AppError } from '../utils/errors';

const router = Router();

router.post('/register', async (req, res, next: NextFunction) => {
  try {
    const payload = registerSchema.parse(req.body);
    const { user, token } = await registerUser(payload.name, payload.email, payload.password);
    res
      .cookie(config.cookieName, token, sessionCookieOptions())
      .status(201)
      .json({ user });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next: NextFunction) => {
  try {
    const payload = loginSchema.parse(req.body);
    const { user, token } = await loginUser(payload.email, payload.password);
    res
      .cookie(config.cookieName, token, sessionCookieOptions())
      .json({ user });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(config.cookieName, sessionCookieOptions({ maxAge: undefined }));
  res.json({ success: true });
});

router.get('/me', authMiddleware, (req, res, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError('Not authenticated', {
        status: 401,
        code: 'AUTHENTICATION_REQUIRED',
      });
    }
    const user = getUserProfile(req.userId);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;
