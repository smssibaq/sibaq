import { z } from 'zod';

/**
 * Standard Kalikkanundo Room Join Code Configuration.
 * The Supabase backend generates 16-character hexadecimal codes (e.g. 7A3F8B1C9E2D4F0A).
 * We maintain minimum length of 6 for backwards compatibility with any early demo codes.
 */
export const ROOM_CODE_DEFAULT_LENGTH = 16;
export const ROOM_CODE_MIN_LENGTH = 6;
export const ROOM_CODE_MAX_LENGTH = 16;
export const ROOM_CODE_REGEX = /^[A-Za-z0-9]+$/;

/**
 * Normalizes user-entered room code: trims surrounding whitespace and converts to uppercase.
 */
export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Validates that the input code contains valid alphanumeric/hexadecimal characters
 * and meets length requirements matching the Supabase database.
 */
export const joinByCodeSchema = z.object({
  code: z
    .string()
    .min(1, 'Please enter a squad room code')
    .refine((val) => val.trim().length >= ROOM_CODE_MIN_LENGTH, {
      message: `Room code is too short (must be at least ${ROOM_CODE_MIN_LENGTH} characters, standard is ${ROOM_CODE_DEFAULT_LENGTH} characters)`,
    })
    .refine((val) => val.trim().length <= ROOM_CODE_MAX_LENGTH, {
      message: `Room code cannot exceed ${ROOM_CODE_MAX_LENGTH} characters`,
    })
    .refine((val) => ROOM_CODE_REGEX.test(val.trim()), {
      message: 'Room code can only contain letters and numbers (0-9, A-Z)',
    }),
});

export type JoinByCodeFormData = z.infer<typeof joinByCodeSchema>;
