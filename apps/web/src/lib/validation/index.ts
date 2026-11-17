import { z } from 'zod';

/**
 * Reusable text validator with automatic trimming and length constraints.
 */
export const trimmedString = (min = 1, max = 255, fieldName = 'Field') =>
  z
    .string()
    .trim()
    .min(min, { message: `${fieldName} must be at least ${min} character${min === 1 ? '' : 's'}.` })
    .max(max, { message: `${fieldName} cannot exceed ${max} characters.` });

/**
 * Robust email validator.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: 'Please enter a valid email address.' })
  .max(255, { message: 'Email address cannot exceed 255 characters.' });

/**
 * Secure HTTP/HTTPS URL validator.
 */
export const urlSchema = z
  .string()
  .trim()
  .url({ message: 'Please enter a valid URL (e.g. https://example.com).' })
  .refine((url) => url.startsWith('http://') || url.startsWith('https://'), {
    message: 'URL must begin with http:// or https://',
  });

/**
 * Numeric range validator.
 */
export const numberRange = (min: number, max: number, fieldName = 'Value') =>
  z
    .number({ invalid_type_error: `${fieldName} must be a valid number.` })
    .min(min, { message: `${fieldName} must be at least ${min}.` })
    .max(max, { message: `${fieldName} cannot exceed ${max}.` });

/**
 * Coerced integer validator.
 */
export const integerSchema = (min = 0, max = 1000000, fieldName = 'Value') =>
  z.coerce
    .number({ invalid_type_error: `${fieldName} must be an integer.` })
    .int({ message: `${fieldName} must be a whole number.` })
    .min(min, { message: `${fieldName} cannot be less than ${min}.` })
    .max(max, { message: `${fieldName} cannot exceed ${max}.` });

/**
 * File validator ensuring MIME type and size boundaries.
 */
export const fileUploadSchema = (
  maxBytes = 5 * 1024 * 1024,
  allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) =>
  z
    .custom<File>((val) => val instanceof File, { message: 'A file is required.' })
    .refine((file) => file.size <= maxBytes, {
      message: `File size cannot exceed ${Math.round(maxBytes / (1024 * 1024))}MB.`,
    })
    .refine((file) => allowedMimeTypes.includes(file.type), {
      message: `Unsupported file type. Allowed: ${allowedMimeTypes.join(', ')}`,
    });

/**
 * Date range schema ensuring end date is after or equal to start date.
 */
export const dateRangeSchema = z
  .object({
    startDate: z.string().min(1, 'Start date is required.'),
    endDate: z.string().min(1, 'End date is required.'),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate).getTime();
      const end = new Date(data.endDate).getTime();
      return !isNaN(start) && !isNaN(end) && start <= end;
    },
    {
      message: 'End date must be on or after start date.',
      path: ['endDate'],
    }
  );
