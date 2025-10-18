CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_color TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users ((LOWER(email)));

CREATE TABLE IF NOT EXISTS task_lists (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  color TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
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
);

CREATE INDEX IF NOT EXISTS tasks_list_id_idx ON tasks (list_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks (status);
