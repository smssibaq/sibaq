import { z } from 'zod';

export const setAttendanceSchema = z.object({
  matchId: z.string().uuid('Invalid match ID'),
  status: z.enum(['playing', 'maybe', 'not_playing'] as const, {
    errorMap: () => ({ message: 'Attendance status must be playing, maybe, or not_playing' }),
  }),
});

export type SetAttendanceFormData = z.infer<typeof setAttendanceSchema>;
