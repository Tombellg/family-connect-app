import { z } from 'zod';

export const createTaskSchema = z.object({
  listId: z.string().min(1),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
  status: z.enum(['open', 'in_progress', 'completed']).optional(),
  assignedTo: z.string().optional().nullable(),
  starred: z.boolean().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();
