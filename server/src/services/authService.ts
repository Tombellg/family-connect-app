import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { config } from '../config';
import { dataStore } from '../storage/dataStore';
import { PublicUser, toPublicUser } from '../utils/sanitize';
import { User } from '../types';
import { AppError } from '../utils/errors';
import { generateAvatarColor } from '../utils/avatar';

interface AuthTokenPayload {
  userId: string;
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ user: PublicUser; token: string }> {
  const existing = await dataStore.findUserByEmail(email);
  if (existing) {
    throw new AppError('Email already registered', {
      status: 409,
      code: 'EMAIL_ALREADY_REGISTERED',
      details: { email },
    });
  }

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(password, 10);
  const user: User = {
    id: nanoid(12),
    name,
    email,
    passwordHash,
    createdAt: now,
    updatedAt: now,
    avatarColor: generateAvatarColor(name),
    role: 'user',
    status: 'active',
    lastLoginAt: now,
  };

  try {
    await dataStore.saveUser(user);
  } catch (error) {
    throw new AppError('Failed to persist newly created user', {
      status: 500,
      code: 'USER_PERSISTENCE_ERROR',
      details: { email },
      cause: error,
    });
  }

  const token = issueToken(user.id);
  return { user: toPublicUser(user), token };
}

export async function loginUser(email: string, password: string): Promise<{ user: PublicUser; token: string }> {
  const user = await dataStore.findUserByEmail(email);
  if (!user) {
    throw new AppError('Invalid credentials', {
      status: 401,
      code: 'INVALID_CREDENTIALS',
      details: { email },
    });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new AppError('Invalid credentials', {
      status: 401,
      code: 'INVALID_CREDENTIALS',
      details: { email },
    });
  }

  if (user.status !== 'active') {
    throw new AppError('Account is not active', {
      status: 403,
      code: 'ACCOUNT_INACTIVE',
      details: { status: user.status },
    });
  }

  const token = issueToken(user.id);
  const loginAt = new Date().toISOString();
  await dataStore.updateUserLastLogin(user.id, loginAt);
  return { user: toPublicUser({ ...user, lastLoginAt: loginAt, updatedAt: loginAt }), token };
}

export function issueToken(userId: string): string {
  const payload: AuthTokenPayload = { userId };
  try {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  } catch (error) {
    throw new AppError('Failed to sign authentication token', {
      status: 500,
      code: 'TOKEN_SIGN_ERROR',
      details: { userId },
      cause: error,
    });
  }
}

export async function getUserProfile(userId: string): Promise<PublicUser> {
  const user = await dataStore.findUserById(userId);
  if (!user) {
    throw new AppError('User not found', {
      status: 404,
      code: 'USER_NOT_FOUND',
      details: { userId },
    });
  }
  return toPublicUser(user);
}
