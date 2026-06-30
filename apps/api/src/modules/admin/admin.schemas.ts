import { z } from 'zod';

export const rejectVendorApplicationSchema = z.object({
  body: z.object({
    reason: z
      .string()
      .trim()
      .min(10, 'Rejection reason must be at least 10 characters long')
      .max(500, 'Rejection reason must not exceed 500 characters'),
  }),
});

export type RejectVendorApplicationInput = z.infer<typeof rejectVendorApplicationSchema>['body'];
