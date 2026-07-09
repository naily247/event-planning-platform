import { z } from 'zod';

export const getCustomerDashboardSchema = z.object({
  query: z
    .object({
      recentLimit: z.coerce.number().int().min(1).max(20).default(5),
    })
    .strict()
    .default({}),
});

export type GetCustomerDashboardQuery = z.infer<typeof getCustomerDashboardSchema>['query'];
