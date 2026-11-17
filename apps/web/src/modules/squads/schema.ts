import { z } from 'zod';

export const createSquadSchema = z.object({
  name: z
    .string()
    .min(3, 'Squad name must be at least 3 characters')
    .max(50, 'Squad name must be under 50 characters')
    .trim(),
  description: z
    .string()
    .max(250, 'Description must be under 250 characters')
    .optional(),
});

export const updateSquadSettingsSchema = z.object({
  name: z
    .string()
    .min(3, 'Squad name must be at least 3 characters')
    .max(50, 'Squad name must be under 50 characters')
    .trim(),
  description: z
    .string()
    .max(250, 'Description must be under 250 characters')
    .optional(),
});

export type CreateSquadFormData = z.infer<typeof createSquadSchema>;
export type UpdateSquadSettingsFormData = z.infer<typeof updateSquadSettingsSchema>;
