import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { dataStore } from '../storage/dataStore';
import { AppError } from '../utils/errors';
import { generateAvatarColor } from '../utils/avatar';
import { PublicUser, toPublicUser } from '../utils/sanitize';
import type { AdminCreateUserInput, AdminUpdateUserInput } from '../validation/userSchemas';
import type { User } from '../types';

export async function listUsers(): Promise<PublicUser[]> {
  const users = await dataStore.getUsers();
  return users.map((user) => toPublicUser(user));
}

export async function createUser(input: AdminCreateUserInput): Promise<PublicUser> {
  const existing = await dataStore.findUserByEmail(input.email);
  if (existing) {
    throw new AppError('Email already registered', {
      status: 409,
      code: 'EMAIL_ALREADY_REGISTERED',
      details: { email: input.email },
    });
  }

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(input.password, 10);

  const user: User = {
    id: nanoid(12),
    name: input.name,
    email: input.email,
    passwordHash,
    avatarColor: generateAvatarColor(input.name),
    createdAt: now,
    updatedAt: now,
    role: input.role ?? 'user',
    status: input.status ?? 'active',
  };

  await dataStore.saveUser(user);
  return toPublicUser(user);
}

export async function updateUser(userId: string, input: AdminUpdateUserInput): Promise<PublicUser> {
  const user = await dataStore.findUserById(userId);
  if (!user) {
    throw new AppError('User not found', {
      status: 404,
      code: 'USER_NOT_FOUND',
      details: { userId },
    });
  }

  const now = new Date().toISOString();
  const updated: User = { ...user, updatedAt: now };

  if (input.email && input.email !== user.email) {
    const existing = await dataStore.findUserByEmail(input.email);
    if (existing && existing.id !== user.id) {
      throw new AppError('Email already registered', {
        status: 409,
        code: 'EMAIL_ALREADY_REGISTERED',
        details: { email: input.email },
      });
    }
    updated.email = input.email;
  }

  if (input.name && input.name !== user.name) {
    updated.name = input.name;
    updated.avatarColor = generateAvatarColor(input.name);
  }

  if (input.role && input.role !== user.role) {
    if (user.role === 'admin' && input.role !== 'admin') {
      const remainingAdmins = await dataStore.countAdmins(user.id);
      if (remainingAdmins === 0) {
        throw new AppError('Impossible de retirer le dernier administrateur', {
          status: 400,
          code: 'LAST_ADMIN_RESTRICTION',
        });
      }
    }
    updated.role = input.role;
  }

  if (input.status && input.status !== user.status) {
    updated.status = input.status;
  }

  if (input.password) {
    updated.passwordHash = await bcrypt.hash(input.password, 10);
  }

  await dataStore.saveUser(updated);
  return toPublicUser(updated);
}

export async function deleteUser(userId: string): Promise<void> {
  const user = await dataStore.findUserById(userId);
  if (!user) {
    throw new AppError('User not found', {
      status: 404,
      code: 'USER_NOT_FOUND',
      details: { userId },
    });
  }

  if (user.role === 'admin') {
    const remainingAdmins = await dataStore.countAdmins(user.id);
    if (remainingAdmins === 0) {
      throw new AppError('Impossible de supprimer le dernier administrateur', {
        status: 400,
        code: 'LAST_ADMIN_RESTRICTION',
      });
    }
  }

  await dataStore.deleteUser(userId);
}
