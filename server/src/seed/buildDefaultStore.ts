import { nanoid } from 'nanoid';
import { addDays } from 'date-fns';
import { googleTaskSeed } from './googleTasks';
import { StoreData, Task, TaskList, User } from '../types';
import bcrypt from 'bcryptjs';

function randomColor(index: number): string {
  const palette = ['#38bdf8', '#a855f7', '#10b981', '#f97316', '#facc15'];
  return palette[index % palette.length];
}

export function buildDefaultStore(): StoreData {
  const now = new Date().toISOString();
  const demoPassword = bcrypt.hashSync('famille123', 10);
  const users: User[] = [
    {
      id: nanoid(12),
      name: 'Alice Dupont',
      email: 'alice@example.com',
      avatarColor: '#f97316',
      passwordHash: demoPassword,
      createdAt: now,
      updatedAt: now,
      role: 'admin',
      status: 'active',
      lastLoginAt: now,
    },
    {
      id: nanoid(12),
      name: 'Benjamin Dupont',
      email: 'benjamin@example.com',
      avatarColor: '#38bdf8',
      passwordHash: demoPassword,
      createdAt: now,
      updatedAt: now,
      role: 'user',
      status: 'active',
      lastLoginAt: now,
    },
  ];

  const taskLists: TaskList[] = [];
  const tasks: Task[] = [];

  googleTaskSeed.forEach((listSeed, index) => {
    const listId = listSeed.listId || nanoid(10);
    const list: TaskList = {
      id: listId,
      title: listSeed.title,
      color: randomColor(index),
      createdAt: now,
      updatedAt: now,
    };
    taskLists.push(list);

    listSeed.tasks.forEach((taskSeed) => {
      const taskId = taskSeed.id || nanoid(14);
      const task: Task = {
        id: taskId,
        listId,
        title: taskSeed.title,
        status: taskSeed.status === 'completed' ? 'completed' : 'open',
        createdAt: taskSeed.created ?? now,
        updatedAt: taskSeed.updated ?? now,
        createdBy: users[0].id,
        history: [],
        starred: taskSeed.starred,
      };
      if (taskSeed.scheduled) {
        const dueDate = new Date(taskSeed.scheduled);
        if (task.status === 'completed') {
          task.dueAt = taskSeed.scheduled;
          task.completedAt = taskSeed.completed ?? addDays(dueDate, 0).toISOString();
        } else {
          task.dueAt = taskSeed.scheduled;
        }
      }
      if (taskSeed.completed && task.status === 'completed') {
        task.completedAt = taskSeed.completed;
      }
      if (taskSeed.notes) {
        task.notes = taskSeed.notes;
      }
      tasks.push(task);
    });
  });

  return {
    meta: { updatedAt: now },
    users,
    taskLists,
    tasks,
  };
}
