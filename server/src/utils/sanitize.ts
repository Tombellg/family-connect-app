import type { Task, TaskList, User } from '../types';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  avatarColor?: string;
  createdAt: string;
  updatedAt: string;
}

export function toPublicUser(user: User): PublicUser {
  const { passwordHash, ...rest } = user;
  return rest;
}

export function toPublicTask(task: Task): Task {
  return JSON.parse(JSON.stringify(task));
}

export function toPublicList(list: TaskList): TaskList {
  return { ...list };
}
