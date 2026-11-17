import { z } from 'zod';
import type { KeralaTurfPreset } from './types';

export const KERALA_TURF_PRESETS: KeralaTurfPreset[] = [
  { name: 'Decathlon Turf Arena, Kalamassery', city: 'Kochi', district: 'Ernakulam' },
  { name: 'United Turf Arena, Infopark Phase 2, Kakkanad', city: 'Kochi', district: 'Ernakulam' },
  { name: 'Kickoff Turf Club, Mavoor Road', city: 'Kozhikode', district: 'Kozhikode' },
  { name: 'Metro Turf Ground, Round North', city: 'Thrissur', district: 'Thrissur' },
  { name: 'Lulu Turf Arena, Edappally', city: 'Kochi', district: 'Ernakulam' },
  { name: 'Champions Football Turf, Kowdiar', city: 'Thiruvananthapuram', district: 'Thiruvananthapuram' },
  { name: 'Cruzeiro Football Turf, Panampilly Nagar', city: 'Kochi', district: 'Ernakulam' },
  { name: 'Greenfield Mini Turf, Kariavattom', city: 'Thiruvananthapuram', district: 'Thiruvananthapuram' },
  { name: 'Malabar Turf Club, Down Hill', city: 'Malappuram', district: 'Malappuram' },
  { name: 'Score Turf Arena, Meenangadi', city: 'Sulthan Bathery', district: 'Wayanad' },
];

export const createMatchSchema = z
  .object({
    squadId: z.string().uuid('Please select a valid squad'),
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(80, 'Title must be under 80 characters')
      .trim(),
    mode: z.enum(['single', 'friendly'] as const, {
      errorMap: () => ({ message: 'Please select a valid match mode' }),
    }),
    turfName: z
      .string()
      .min(2, 'Turf venue name required')
      .max(100, 'Turf name must be under 100 characters')
      .trim(),
    locationDescription: z
      .string()
      .max(200, 'Location notes must be under 200 characters')
      .optional()
      .or(z.literal('')),
    date: z
      .string()
      .min(1, 'Match date is required')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    kickoffTime: z
      .string()
      .min(1, 'Kickoff time is required')
      .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format'),
    playersPerTeam: z
      .number({ invalid_type_error: 'Players per team must be a number' })
      .int('Must be a whole number')
      .min(3, 'Minimum 3 players per side')
      .max(11, 'Maximum 11 players per side')
      .default(7),
    rsvpDeadlineDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .optional()
      .or(z.literal('')),
    rsvpDeadlineTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) => {
      try {
        const istIso = `${data.date}T${data.kickoffTime}:00+05:30`;
        const kickoffTime = new Date(istIso).getTime();
        return kickoffTime > Date.now();
      } catch {
        return false;
      }
    },
    {
      message: 'Match kickoff time must be scheduled in the future',
      path: ['date'],
    }
  )
  .refine(
    (data) => {
      if (!data.rsvpDeadlineDate || !data.rsvpDeadlineTime) return true;
      try {
        const istIso = `${data.date}T${data.kickoffTime}:00+05:30`;
        const deadlineIso = `${data.rsvpDeadlineDate}T${data.rsvpDeadlineTime}:00+05:30`;
        const kickoffTime = new Date(istIso).getTime();
        const deadlineTime = new Date(deadlineIso).getTime();
        return deadlineTime < kickoffTime;
      } catch {
        return false;
      }
    },
    {
      message: 'RSVP deadline must be scheduled strictly before match kickoff',
      path: ['rsvpDeadlineDate'],
    }
  )
  .refine(
    (data) => {
      if (!data.rsvpDeadlineDate || !data.rsvpDeadlineTime) return true;
      try {
        const deadlineIso = `${data.rsvpDeadlineDate}T${data.rsvpDeadlineTime}:00+05:30`;
        const deadlineTime = new Date(deadlineIso).getTime();
        return deadlineTime > Date.now();
      } catch {
        return false;
      }
    },
    {
      message: 'RSVP deadline must be in the future',
      path: ['rsvpDeadlineDate'],
    }
  );

export type CreateMatchFormData = z.infer<typeof createMatchSchema>;

export const updateMatchSchema = z
  .object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(80, 'Title must be under 80 characters')
      .trim(),
    turfName: z
      .string()
      .min(2, 'Turf name required')
      .max(100, 'Turf name must be under 100 characters')
      .trim(),
    date: z
      .string()
      .min(1, 'Date required')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    kickoffTime: z
      .string()
      .min(1, 'Kickoff time required')
      .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format'),
    rsvpDeadlineDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .optional()
      .or(z.literal('')),
    rsvpDeadlineTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format')
      .optional()
      .or(z.literal('')),
    status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled'] as const),
  })
  .refine(
    (data) => {
      if (!data.rsvpDeadlineDate || !data.rsvpDeadlineTime) return true;
      try {
        const istIso = `${data.date}T${data.kickoffTime}:00+05:30`;
        const deadlineIso = `${data.rsvpDeadlineDate}T${data.rsvpDeadlineTime}:00+05:30`;
        const kickoffTime = new Date(istIso).getTime();
        const deadlineTime = new Date(deadlineIso).getTime();
        return deadlineTime < kickoffTime;
      } catch {
        return false;
      }
    },
    {
      message: 'RSVP deadline must be before kickoff',
      path: ['rsvpDeadlineDate'],
    }
  );

export type UpdateMatchFormData = z.infer<typeof updateMatchSchema>;
