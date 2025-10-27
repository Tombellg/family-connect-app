import { randomUUID } from 'crypto';
import { getPool } from '../../db/connection';
import type { User } from '../../types';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar_color: string | null;
  created_at: Date;
  updated_at: Date;
}

const mapUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  passwordHash: row.password_hash,
  avatarColor: row.avatar_color ?? undefined,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

export const createUser = async (params: {
  name: string;
  email: string;
  passwordHash: string;
  avatarColor?: string | null;
}): Promise<User> => {
  const pool = getPool();
  const id = randomUUID();
  const now = new Date();

  await pool.query(
    `INSERT INTO users (id, name, email, password_hash, avatar_color, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, params.name, params.email, params.passwordHash, params.avatarColor ?? null, now, now]
  );

  return {
    id,
    name: params.name,
    email: params.email,
    passwordHash: params.passwordHash,
    avatarColor: params.avatarColor ?? undefined,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const pool = getPool();
  const { rows } = await pool.query<UserRow>(
    `SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email]
  );

  if (rows.length === 0) {
    return null;
  }

  return mapUser(rows[0]);
};

export const findUserById = async (id: string): Promise<User | null> => {
  const pool = getPool();
  const { rows } = await pool.query<UserRow>(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);

  if (rows.length === 0) {
    return null;
  }

  return mapUser(rows[0]);
};
