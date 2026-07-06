import { z } from 'zod';

const cuidSchema = z.string().cuid('Invalid ID format');

const paginationQuerySchema = {
  page: z.coerce
    .number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(1),

  limit: z.coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must not exceed 100')
    .default(20),
};

export const rejectVendorApplicationSchema = z.object({
  body: z.object({
    reason: z
      .string()
      .trim()
      .min(10, 'Rejection reason must be at least 10 characters long')
      .max(500, 'Rejection reason must not exceed 500 characters'),
  }),
});

export const getAdminReviewsSchema = z.object({
  query: z.object({
    ...paginationQuerySchema,

    vendorId: cuidSchema.optional(),
    customerId: cuidSchema.optional(),

    overallRating: z.coerce
      .number()
      .int('Overall rating must be an integer')
      .min(1, 'Overall rating must be at least 1')
      .max(5, 'Overall rating must not exceed 5')
      .optional(),

    visibility: z.enum(['all', 'visible', 'hidden']).default('all'),

    sort: z
      .enum(['newest', 'oldest', 'rating_highest', 'rating_lowest', 'recently_moderated'])
      .default('newest'),
  }),
});

export const getAdminReviewByIdSchema = z.object({
  params: z.object({
    reviewId: cuidSchema,
  }),
});

export const moderateAdminReviewSchema = z.object({
  params: z.object({
    reviewId: cuidSchema,
  }),

  body: z.object({
    action: z.enum(['HIDE', 'RESTORE']),

    reason: z
      .string()
      .trim()
      .min(10, 'Moderation reason must be at least 10 characters long')
      .max(500, 'Moderation reason must not exceed 500 characters'),
  }),
});

export type RejectVendorApplicationInput = z.infer<typeof rejectVendorApplicationSchema>['body'];

export type GetAdminReviewsQuery = z.infer<typeof getAdminReviewsSchema>['query'];

export type GetAdminReviewByIdParams = z.infer<typeof getAdminReviewByIdSchema>['params'];

export type ModerateAdminReviewParams = z.infer<typeof moderateAdminReviewSchema>['params'];

export type ModerateAdminReviewInput = z.infer<typeof moderateAdminReviewSchema>['body'];
