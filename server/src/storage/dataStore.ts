import { promises as fs } from 'fs';
import path from 'path';
import { StoreData, Task, TaskList, User } from '../types';
import { buildDefaultStore } from '../seed/buildDefaultStore';

const ROOT = path.join(process.cwd(), 'server');

export class DataStore {
  private data: StoreData | null = null;
  private filePath: string;
  private saving: Promise<void> | null = null;

  constructor(filePath: string) {
    this.filePath = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  }

  async initialize(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const exists = await this.exists(this.filePath);
    if (!exists) {
      this.data = buildDefaultStore();
      await this.persist();
    } else {
      const raw = await fs.readFile(this.filePath, 'utf8');
      this.data = JSON.parse(raw) as StoreData;
    }
  }

  private async exists(target: string): Promise<boolean> {
    try {
      await fs.access(target);
      return true;
    } catch {
      return false;
    }
  }

  private assertLoaded(): StoreData {
    if (!this.data) {
      throw new Error('Data store not initialized');
    }
    return this.data;
  }

  private async persist(): Promise<void> {
    const json = JSON.stringify(this.assertLoaded(), null, 2);
    const write = fs.writeFile(this.filePath, json, 'utf8');
    this.saving = write
      .catch((err) => {
        console.error('Failed to persist store', err);
        throw err;
      })
      .finally(() => {
        this.saving = null;
      });
    await this.saving;
  }

  async flush(): Promise<void> {
    if (this.saving) {
      await this.saving;
    }
  }

  getUsers(): User[] {
    return [...this.assertLoaded().users];
  }

  findUserByEmail(email: string): User | undefined {
    return this.assertLoaded().users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id: string): User | undefined {
    return this.assertLoaded().users.find((user) => user.id === id);
  }

  async saveUser(user: User): Promise<void> {
    const store = this.assertLoaded();
    const index = store.users.findIndex((item) => item.id === user.id);
    if (index === -1) {
      store.users.push(user);
    } else {
      store.users[index] = user;
    }
    await this.touch();
  }

  getTaskLists(): TaskList[] {
    return [...this.assertLoaded().taskLists];
  }

  findTaskListById(id: string): TaskList | undefined {
    return this.assertLoaded().taskLists.find((list) => list.id === id);
  }

  async addTaskList(list: TaskList): Promise<void> {
    const store = this.assertLoaded();
    store.taskLists.push(list);
    await this.touch();
  }

  async saveTaskList(list: TaskList): Promise<void> {
    const store = this.assertLoaded();
    const index = store.taskLists.findIndex((item) => item.id === list.id);
    if (index === -1) {
      store.taskLists.push(list);
    } else {
      store.taskLists[index] = list;
    }
    await this.touch();
  }

  getTasks(): Task[] {
    return [...this.assertLoaded().tasks];
  }

  findTaskById(id: string): Task | undefined {
    return this.assertLoaded().tasks.find((task) => task.id === id);
  }

  async saveTask(task: Task): Promise<void> {
    const store = this.assertLoaded();
    const index = store.tasks.findIndex((item) => item.id === task.id);
    if (index === -1) {
      store.tasks.push(task);
    } else {
      store.tasks[index] = task;
    }
    await this.touch();
  }

  async removeTask(id: string): Promise<void> {
    const store = this.assertLoaded();
    store.tasks = store.tasks.filter((task) => task.id !== id);
    await this.touch();
  }

  private async touch(): Promise<void> {
    const store = this.assertLoaded();
    store.meta.updatedAt = new Date().toISOString();
    await this.persist();
  }
}

export const dataStore = new DataStore('data/store.json');
