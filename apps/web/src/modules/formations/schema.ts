import { z } from 'zod';

export const GOALKEEPER_DUPLICATE_MESSAGE =
  'This team already has a goalkeeper. Only one goalkeeper is allowed per team.';

export const saveFormationSchema = z
  .object({
    teamId: z.string().uuid(),
    formation: z.string().min(1),
    expectedRevision: z.number().int().nonnegative(),
    positions: z.array(
      z.object({
        userId: z.string().uuid(),
        positionLabel: z.string().min(1).max(10),
        isSubstitute: z.boolean(),
        pitchX: z.number().min(0).max(1).nullable(),
        pitchY: z.number().min(0).max(1).nullable(),
      })
    ),
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

export type SaveFormationFormData = z.infer<typeof saveFormationSchema>;
