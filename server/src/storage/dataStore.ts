import { Client, Pool } from 'pg';
import type { PoolConfig } from 'pg';
import { buildDefaultStore } from '../seed/buildDefaultStore';
import { config } from '../config';
import { Task, TaskHistoryEntry, TaskList, TaskStatus, User } from '../types';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar_color: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface TaskListRow {
  id: string;
  title: string;
  color: string | null;
  description: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface TaskRow {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  notes: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  due_at: string | Date | null;
  status: TaskStatus;
  completed_at: string | Date | null;
  created_by: string;
  assigned_to: string | null;
  recurrence: any;
  history: TaskHistoryEntry[] | string | null;
  starred: boolean | null;
}

interface TaskCountsRow {
  list_id: string;
  total: string;
  open: string;
  completed: string;
}

const mapTimestamp = (value: string | Date | null | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
};

export class DataStore {
  private pool: Pool;
  private readonly db = config.database;

  constructor() {
    if (!this.db.connectionString && !this.db.host) {
      throw new Error(
        'Database connection is not configured. Set DATABASE_URL/POSTGRES_URL or PGHOST/PGDATABASE/PGUSER/PGPASSWORD.'
      );
    }

    this.pool = new Pool(this.buildConnectionConfig());
  }

  private buildConnectionConfig(useUnpooled = false): PoolConfig {
    const connectionString =
      useUnpooled && this.db.unpooledConnectionString
        ? this.db.unpooledConnectionString
        : this.db.connectionString;

    const connectionConfig: PoolConfig = {};

    if (connectionString) {
      connectionConfig.connectionString = connectionString;
    } else {
      if (this.db.host) {
        connectionConfig.host = this.db.host;
      }
      if (this.db.port) {
        connectionConfig.port = this.db.port;
      }
      if (this.db.database) {
        connectionConfig.database = this.db.database;
      }
      if (this.db.user) {
        connectionConfig.user = this.db.user;
      }
      if (this.db.password) {
        connectionConfig.password = this.db.password;
      }
    }

    if (this.db.ssl) {
      connectionConfig.ssl = { rejectUnauthorized: false };
    }
    if (this.db.applicationName) {
      connectionConfig.application_name = this.db.applicationName;
    }
    if (!useUnpooled) {
      if (this.db.poolMax) {
        connectionConfig.max = this.db.poolMax;
      }
      if (this.db.poolMin) {
        connectionConfig.min = this.db.poolMin;
      }
      if (this.db.idleTimeoutMs) {
        connectionConfig.idleTimeoutMillis = this.db.idleTimeoutMs;
      }
      if (this.db.connectionTimeoutMs) {
        connectionConfig.connectionTimeoutMillis = this.db.connectionTimeoutMs;
      }
    }

    return connectionConfig;
  }

  async initialize(): Promise<void> {
    await this.runMigrations();
    await this.seedDefaults();
  }

  private async runMigrations(): Promise<void> {
    const statements = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_color TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users ((LOWER(email)));`,
      `CREATE TABLE IF NOT EXISTS task_lists (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        color TEXT,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        list_id TEXT NOT NULL REFERENCES task_lists (id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        due_at TIMESTAMPTZ,
        status TEXT NOT NULL,
        completed_at TIMESTAMPTZ,
        created_by TEXT NOT NULL REFERENCES users (id) ON DELETE SET NULL,
        assigned_to TEXT REFERENCES users (id) ON DELETE SET NULL,
        recurrence JSONB,
        history JSONB NOT NULL DEFAULT '[]'::jsonb,
        starred BOOLEAN DEFAULT FALSE
      );`,
      `CREATE INDEX IF NOT EXISTS tasks_list_id_idx ON tasks (list_id);`,
      `CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks (status);`,
    ];

    const runStatements = async (client: { query: (sql: string) => Promise<unknown> }) => {
      for (const statement of statements) {
        await client.query(statement);
      }
    };

    if (this.db.unpooledConnectionString) {
      const client = new Client(this.buildConnectionConfig(true));
      await client.connect();
      try {
        await runStatements(client);
      } finally {
        await client.end();
      }
      return;
    }

    const pooledClient = await this.pool.connect();
    try {
      await runStatements(pooledClient);
    } finally {
      pooledClient.release();
    }
  }

  private async seedDefaults(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query<{ count: string }>('SELECT COUNT(*) AS count FROM users');
      const count = Number(rows[0]?.count ?? 0);
      if (count > 0) {
        await client.query('COMMIT');
        return;
      }

      const seed = buildDefaultStore();

      for (const user of seed.users) {
        await client.query(
          `INSERT INTO users (id, name, email, password_hash, avatar_color, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [user.id, user.name, user.email, user.passwordHash, user.avatarColor ?? null, user.createdAt, user.updatedAt]
        );
      }

      for (const list of seed.taskLists) {
        await client.query(
          `INSERT INTO task_lists (id, title, color, description, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [list.id, list.title, list.color ?? null, list.description ?? null, list.createdAt, list.updatedAt]
        );
      }

      for (const task of seed.tasks) {
        await client.query(
          `INSERT INTO tasks (
            id, list_id, title, description, notes, created_at, updated_at, due_at, status, completed_at,
            created_by, assigned_to, recurrence, history, starred
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15
          )`,
          [
            task.id,
            task.listId,
            task.title,
            task.description ?? null,
            task.notes ?? null,
            task.createdAt,
            task.updatedAt,
            task.dueAt ?? null,
            task.status,
            task.completedAt ?? null,
            task.createdBy,
            task.assignedTo ?? null,
            task.recurrence ? JSON.stringify(task.recurrence) : null,
            JSON.stringify(task.history ?? []),
            task.starred ?? false,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getUsers(): Promise<User[]> {
    const { rows } = await this.pool.query<UserRow>('SELECT * FROM users ORDER BY created_at ASC');
    return rows.map((row) => this.mapUser(row));
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    const { rows } = await this.pool.query<UserRow>('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
    if (rows.length === 0) {
      return undefined;
    }
    return this.mapUser(rows[0]);
  }

  async findUserById(id: string): Promise<User | undefined> {
    const { rows } = await this.pool.query<UserRow>('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    if (rows.length === 0) {
      return undefined;
    }
    return this.mapUser(rows[0]);
  }

  async saveUser(user: User): Promise<void> {
    await this.pool.query(
      `INSERT INTO users (id, name, email, password_hash, avatar_color, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         avatar_color = EXCLUDED.avatar_color,
         updated_at = EXCLUDED.updated_at`
        ,
      [user.id, user.name, user.email, user.passwordHash, user.avatarColor ?? null, user.createdAt, user.updatedAt]
    );
  }

  async getTaskLists(): Promise<TaskList[]> {
    const { rows } = await this.pool.query<TaskListRow>('SELECT * FROM task_lists ORDER BY created_at ASC');
    return rows.map((row) => this.mapTaskList(row));
  }

  async findTaskListById(id: string): Promise<TaskList | undefined> {
    const { rows } = await this.pool.query<TaskListRow>('SELECT * FROM task_lists WHERE id = $1 LIMIT 1', [id]);
    if (rows.length === 0) {
      return undefined;
    }
    return this.mapTaskList(rows[0]);
  }

  async addTaskList(list: TaskList): Promise<void> {
    await this.saveTaskList(list);
  }

  async saveTaskList(list: TaskList): Promise<void> {
    await this.pool.query(
      `INSERT INTO task_lists (id, title, color, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         color = EXCLUDED.color,
         description = EXCLUDED.description,
         updated_at = EXCLUDED.updated_at`,
      [list.id, list.title, list.color ?? null, list.description ?? null, list.createdAt, list.updatedAt]
    );
  }

  async getTasks(): Promise<Task[]> {
    const { rows } = await this.pool.query<TaskRow>('SELECT * FROM tasks');
    return rows.map((row) => this.mapTask(row));
  }

  async findTaskById(id: string): Promise<Task | undefined> {
    const { rows } = await this.pool.query<TaskRow>('SELECT * FROM tasks WHERE id = $1 LIMIT 1', [id]);
    if (rows.length === 0) {
      return undefined;
    }
    return this.mapTask(rows[0]);
  }

  async saveTask(task: Task): Promise<void> {
    await this.pool.query(
      `INSERT INTO tasks (
        id, list_id, title, description, notes, created_at, updated_at, due_at, status, completed_at,
        created_by, assigned_to, recurrence, history, starred
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15
      )
      ON CONFLICT (id) DO UPDATE SET
        list_id = EXCLUDED.list_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at,
        due_at = EXCLUDED.due_at,
        status = EXCLUDED.status,
        completed_at = EXCLUDED.completed_at,
        assigned_to = EXCLUDED.assigned_to,
        recurrence = EXCLUDED.recurrence,
        history = EXCLUDED.history,
        starred = EXCLUDED.starred`,
      [
        task.id,
        task.listId,
        task.title,
        task.description ?? null,
        task.notes ?? null,
        task.createdAt,
        task.updatedAt,
        task.dueAt ?? null,
        task.status,
        task.completedAt ?? null,
        task.createdBy,
        task.assignedTo ?? null,
        task.recurrence ? JSON.stringify(task.recurrence) : null,
        JSON.stringify(task.history ?? []),
        task.starred ?? false,
      ]
    );
  }

  async removeTask(id: string): Promise<void> {
    await this.pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  }

  async getTaskCountsByList(): Promise<Record<string, { total: number; open: number; completed: number }>> {
    const { rows } = await this.pool.query<TaskCountsRow>(
      `SELECT list_id, COUNT(*)::text AS total,
              SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END)::text AS open,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::text AS completed
       FROM tasks
       GROUP BY list_id`
    );

    return rows.reduce<Record<string, { total: number; open: number; completed: number }>>((acc, row: TaskCountsRow) => {
      acc[row.list_id] = {
        total: Number(row.total ?? 0),
        open: Number(row.open ?? 0),
        completed: Number(row.completed ?? 0),
      };
      return acc;
    }, {});
  }

  private mapUser(row: UserRow): User {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      passwordHash: row.password_hash,
      avatarColor: row.avatar_color ?? undefined,
      createdAt: mapTimestamp(row.created_at)!,
      updatedAt: mapTimestamp(row.updated_at)!,
    };
  }

  private mapTaskList(row: TaskListRow): TaskList {
    return {
      id: row.id,
      title: row.title,
      color: row.color ?? undefined,
      description: row.description ?? undefined,
      createdAt: mapTimestamp(row.created_at)!,
      updatedAt: mapTimestamp(row.updated_at)!,
    };
  }

  private mapTask(row: TaskRow): Task {
    const history: TaskHistoryEntry[] = Array.isArray(row.history)
      ? row.history
      : row.history
        ? JSON.parse(row.history)
        : [];

    const recurrence = row.recurrence
      ? typeof row.recurrence === 'string'
        ? JSON.parse(row.recurrence)
        : row.recurrence
      : undefined;

    return {
      id: row.id,
      listId: row.list_id,
      title: row.title,
      description: row.description ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: mapTimestamp(row.created_at)!,
      updatedAt: mapTimestamp(row.updated_at)!,
      dueAt: mapTimestamp(row.due_at),
      status: row.status as TaskStatus,
      completedAt: mapTimestamp(row.completed_at),
      createdBy: row.created_by,
      assignedTo: row.assigned_to ?? undefined,
      recurrence,
      history,
      starred: row.starred ?? false,
    };
  }
}

export const dataStore = new DataStore();
