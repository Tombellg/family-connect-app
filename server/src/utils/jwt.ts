import jwt from 'jsonwebtoken';
import { config } from '../config';

interface SessionPayload {
  sub: string;
}

export const createSessionToken = (userId: string): string => {
  const payload: SessionPayload = { sub: userId };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
};

export const verifySessionToken = (token: string): SessionPayload => {
  return jwt.verify(token, config.jwtSecret) as SessionPayload;
};
