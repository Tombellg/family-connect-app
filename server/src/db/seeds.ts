import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { getPoolClient } from './connection';

const DEFAULT_PASSWORD = 'famille2024';

export const seedDatabase = async (): Promise<void> => {
  const client = await getPoolClient();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users');
    const userCount = Number(rows[0]?.count ?? 0);

    if (userCount > 0) {
      await client.query('COMMIT');
      return;
    }

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const userId = randomUUID();
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, avatar_color)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'Famille Reynard', 'contact@reynard.app', passwordHash, '#F97316']
    );

    const lists = [
      {
        id: randomUUID(),
        title: 'Maison',
        color: '#6366F1',
        description: 'Tout pour la maison et le quotidien',
      },
      {
        id: randomUUID(),
        title: 'Enfants',
        color: '#10B981',
        description: 'Rendez-vous, activités et fournitures',
      },
      {
        id: randomUUID(),
        title: 'Famille',
        color: '#EC4899',
        description: 'Moments en famille et projets communs',
      },
    ];

    for (const list of lists) {
      await client.query(
        `INSERT INTO task_lists (id, title, color, description)
         VALUES ($1, $2, $3, $4)`,
        [list.id, list.title, list.color, list.description]
      );
    }

    const now = new Date();
    const tasks = [
      {
        id: randomUUID(),
        listId: lists[0].id,
        title: 'Organiser le planning des courses',
        description: 'Lister les repas de la semaine et répartir les tâches',
        dueAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        id: randomUUID(),
        listId: lists[1].id,
        title: "Inscrire Léa au cours de danse",
        description: 'Vérifier les horaires et compléter l inscription',
        dueAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        id: randomUUID(),
        listId: lists[2].id,
        title: 'Préparer le repas du dimanche',
        description: 'Choisir le menu et répartir les préparatifs',
        dueAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const task of tasks) {
      await client.query(
        `INSERT INTO tasks (
          id, list_id, title, description, notes, due_at, status, created_by, history, starred
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'open', $7, $8, $9
        )`,
        [
          task.id,
          task.listId,
          task.title,
          task.description,
          null,
          task.dueAt.toISOString(),
          userId,
          JSON.stringify([
            {
              id: randomUUID(),
              userId,
              type: 'created',
              at: new Date().toISOString(),
              payload: { title: task.title },
            },
          ]),
          false,
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
};
