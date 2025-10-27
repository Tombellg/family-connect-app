import { z } from 'zod';

export const weekdaySchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

const recurrenceEndSchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('never') }),
    z.object({ type: z.literal('afterOccurrences'), occurrences: z.number().int().positive() }),
    z.object({ type: z.literal('onDate'), date: z.string().datetime() }),
  ])
  .optional();

const dailyRecurrenceSchema = z.object({
  type: z.literal('daily'),
  interval: z.number().int().positive().default(1),
  end: recurrenceEndSchema,
});

const weeklyRecurrenceSchema = z.object({
  type: z.literal('weekly'),
  interval: z.number().int().positive().default(1),
  days: z.array(weekdaySchema).min(1),
  end: recurrenceEndSchema,
});

const monthlyRecurrenceSchema = z
  .object({
    type: z.literal('monthly'),
    interval: z.number().int().positive().default(1),
    mode: z.union([z.literal('dayOfMonth'), z.literal('nthWeekday')]),
    day: z.number().int().min(1).max(31).optional(),
    nth: z.number().int().min(-5).max(5).optional(),
    weekday: weekdaySchema.optional(),
    end: recurrenceEndSchema,
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'dayOfMonth' && !value.day) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'day is required when mode is dayOfMonth',
        path: ['day'],
      });
    }
    if (value.mode === 'nthWeekday' && (value.nth === undefined || !value.weekday)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'nth and weekday are required when mode is nthWeekday',
        path: ['nth'],
      });
    }
  });

const yearlyRecurrenceSchema = z
  .object({
    type: z.literal('yearly'),
    interval: z.number().int().positive().default(1),
    mode: z.union([z.literal('specificDate'), z.literal('nthWeekdayOfMonth')]),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31).optional(),
    nth: z.number().int().min(-5).max(5).optional(),
    weekday: weekdaySchema.optional(),
    end: recurrenceEndSchema,
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'specificDate' && !value.day) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'day is required for specificDate',
        path: ['day'],
      });
    }
    if (value.mode === 'nthWeekdayOfMonth' && (value.nth === undefined || !value.weekday)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'nth and weekday are required for nthWeekdayOfMonth',
        path: ['nth'],
      });
    }
  });

export const recurrenceSchema = z.discriminatedUnion('type', [
  dailyRecurrenceSchema,
  weeklyRecurrenceSchema,
  monthlyRecurrenceSchema,
  yearlyRecurrenceSchema,
]);

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  notes: z.string().optional(),
  dueAt: z.string().datetime().optional(),
  listId: z.string().optional(),
  listTitle: z.string().optional(),
  starred: z.boolean().optional(),
  recurrence: recurrenceSchema.optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  dueAt: z.string().datetime().optional().nullable(),
  listId: z.string().optional(),
  listTitle: z.string().optional(),
  starred: z.boolean().optional(),
  recurrence: recurrenceSchema.optional().nullable(),
  status: z.enum(['open', 'completed']).optional(),
});
