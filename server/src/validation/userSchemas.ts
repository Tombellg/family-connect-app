import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Adresse e-mail manquante')
  .email('Adresse e-mail invalide');

export const passwordSchema = z
  .string()
  .min(1, 'Mot de passe manquant')
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères.');

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Le nom est requis.')
  .max(100, 'Le nom ne peut pas dépasser 100 caractères.');

export const userRoleSchema = z.enum(['user', 'admin']);

export const userStatusSchema = z.enum(['active', 'pending', 'suspended']);

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const adminCreateUserSchema = registerSchema.extend({
  role: userRoleSchema.default('user'),
  status: userStatusSchema.default('active'),
});

export const adminUpdateUserSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    role: userRoleSchema.optional(),
    status: userStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Aucune modification fournie',
    path: [],
  });

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
