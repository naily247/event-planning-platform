import { z } from 'zod';

const dashboardQuerySchema = z
  .object({
    recentLimit: z.coerce.number().int().min(1).max(20).default(5),
  })
  .strict()
  .default({});

export const getCustomerDashboardSchema = z.object({
  query: dashboardQuerySchema,
});

export const getVendorDashboardSchema = z.object({
  query: dashboardQuerySchema,
});

export type GetCustomerDashboardQuery = z.infer<typeof getCustomerDashboardSchema>['query'];
export type GetVendorDashboardQuery = z.infer<typeof getVendorDashboardSchema>['query'];
