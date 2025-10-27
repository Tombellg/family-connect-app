import bcrypt from 'bcryptjs';
import { AppError } from '../../utils/appError';
import { createSessionToken } from '../../utils/jwt';
import type { User } from '../../types';
import { createUser, findUserByEmail, findUserById } from './auth.repository';

const sanitizeUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatarColor: user.avatarColor,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const register = async (params: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: ReturnType<typeof sanitizeUser>; token: string }> => {
  const existing = await findUserByEmail(params.email);
  if (existing) {
    throw new AppError('Email already in use', {
      status: 409,
      code: 'EMAIL_IN_USE',
    });
  }

  const passwordHash = await bcrypt.hash(params.password, 12);
  const user = await createUser({
    name: params.name,
    email: params.email,
    passwordHash,
    avatarColor: '#0EA5E9',
  });

  const token = createSessionToken(user.id);
  return { user: sanitizeUser(user), token };
};

export const login = async (params: {
  email: string;
  password: string;
}): Promise<{ user: ReturnType<typeof sanitizeUser>; token: string }> => {
  const user = await findUserByEmail(params.email);

  if (!user) {
    throw new AppError('Invalid credentials', {
      status: 401,
      code: 'INVALID_CREDENTIALS',
    });
  }

  const valid = await bcrypt.compare(params.password, user.passwordHash);

  if (!valid) {
    throw new AppError('Invalid credentials', {
      status: 401,
      code: 'INVALID_CREDENTIALS',
    });
  }

  const token = createSessionToken(user.id);
  return { user: sanitizeUser(user), token };
};

export const getProfile = async (userId: string) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError('User not found', {
      status: 404,
      code: 'USER_NOT_FOUND',
    });
  }

  return sanitizeUser(user);
};
