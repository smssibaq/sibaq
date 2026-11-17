import { z } from 'zod';

export const pitchCoordinateSchema = z.object({
  x: z.number().min(0).max(100, 'X coordinate must be within 0-100%'),
  y: z.number().min(0).max(100, 'Y coordinate must be within 0-100%'),
});

export const assignPlayerSchema = z.object({
  teamId: z.string().uuid('Valid team ID required'),
  userId: z.string().uuid('Valid user ID required'),
  positionLabel: z.string().min(1, 'Position required').max(10),
  isSubstitute: z.boolean().default(false),
});

export const GOALKEEPER_DUPLICATE_MESSAGE =
  'This team already has a goalkeeper. Only one goalkeeper is allowed per team.';

export const formationPositionSchema = z.object({
  userId: z.string().uuid('Valid user ID required'),
  positionLabel: z.string().min(1, 'Position label required').max(10),
  isSubstitute: z.boolean(),
  pitchX: z.number().min(0).max(1).nullable(),
  pitchY: z.number().min(0).max(1).nullable(),
});

export const saveFormationSchema = z
  .object({
    teamId: z.string().uuid('Valid team ID required'),
    formation: z.string().min(1, 'Formation name required').max(50),
    expectedRevision: z.number().int().min(0, 'Revision must be positive'),
    positions: z.array(formationPositionSchema),
  })
  .refine(
    (data) => {
      const gkCount = data.positions.filter(
        (p) => p.positionLabel?.trim().toUpperCase() === 'GK'
      ).length;
      return gkCount <= 1;
    },
    {
      message: GOALKEEPER_DUPLICATE_MESSAGE,
      path: ['positions'],
    }
  );

export const updatePlayerPositionSchema = z.object({
  teamId: z.string().uuid('Valid team ID required'),
  userId: z.string().uuid('Valid user ID required'),
  positionLabel: z.string().min(1, 'Position label required').max(10),
});

export type PitchCoordinateData = z.infer<typeof pitchCoordinateSchema>;
export type AssignPlayerFormData = z.infer<typeof assignPlayerSchema>;
export type SaveFormationFormData = z.infer<typeof saveFormationSchema>;
export type UpdatePlayerPositionFormData = z.infer<typeof updatePlayerPositionSchema>;
