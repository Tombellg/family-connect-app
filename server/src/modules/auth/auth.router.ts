import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { loginHandler, logoutHandler, meHandler, registerHandler } from './auth.controller';

const router = Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/logout', logoutHandler);
router.get('/me', authenticate, meHandler);

export default router;
