import { z } from 'zod';
import { trimmedString } from '../../lib/validation';

export const sampleItemFormSchema = z.object({
  title: trimmedString(2, 100, 'Title'),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters.').optional(),
  status: z.enum(['draft', 'active', 'archived'] as const, {
    required_error: 'Please select a status.',
  }),
});

export type SampleItemFormData = z.infer<typeof sampleItemFormSchema>;

