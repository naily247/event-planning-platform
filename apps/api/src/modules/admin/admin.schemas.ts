import { AccountStatus, UserRole } from '@prisma/client';
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
  body: z
    .object({
      reason: z
        .string()
        .trim()
        .min(10, 'Rejection reason must be at least 10 characters long')
        .max(500, 'Rejection reason must not exceed 500 characters'),
    })
    .strict(),
});

export const getAdminUsersSchema = z.object({
  query: z
    .object({
      ...paginationQuerySchema,

      search: z
        .string()
        .trim()
        .min(1, 'Search must not be empty')
        .max(100, 'Search must not exceed 100 characters')
        .optional(),

      role: z.nativeEnum(UserRole).optional(),

      status: z.nativeEnum(AccountStatus).optional(),

      sort: z
        .enum(['newest', 'oldest', 'name_asc', 'name_desc', 'email_asc', 'email_desc'])
        .default('newest'),
    })
    .strict(),
});

export const getAdminUserByIdSchema = z.object({
  params: z
    .object({
      userId: cuidSchema,
    })
    .strict(),
});

export const updateAdminUserStatusSchema = z.object({
  params: z
    .object({
      userId: cuidSchema,
    })
    .strict(),

  body: z
    .object({
      status: z.enum([AccountStatus.ACTIVE, AccountStatus.SUSPENDED]),

      reason: z
        .string()
        .trim()
        .min(10, 'Status change reason must be at least 10 characters long')
        .max(500, 'Status change reason must not exceed 500 characters')
        .optional(),
    })
    .strict()
    .superRefine((body, ctx) => {
      if (body.status === AccountStatus.SUSPENDED && !body.reason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reason'],
          message: 'A reason is required when suspending an account',
        });
      }
    }),
});

export const getAdminReviewsSchema = z.object({
  query: z
    .object({
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
    })
    .strict(),
});

export const getAdminReviewByIdSchema = z.object({
  params: z
    .object({
      reviewId: cuidSchema,
    })
    .strict(),
});

export const moderateAdminReviewSchema = z.object({
  params: z
    .object({
      reviewId: cuidSchema,
    })
    .strict(),

  body: z
    .object({
      action: z.enum(['HIDE', 'RESTORE']),

      reason: z
        .string()
        .trim()
        .min(10, 'Moderation reason must be at least 10 characters long')
        .max(500, 'Moderation reason must not exceed 500 characters'),
    })
    .strict(),
});

export type RejectVendorApplicationInput = z.infer<typeof rejectVendorApplicationSchema>['body'];

export type GetAdminUsersQuery = z.infer<typeof getAdminUsersSchema>['query'];

export type GetAdminUserByIdParams = z.infer<typeof getAdminUserByIdSchema>['params'];

export type UpdateAdminUserStatusParams = z.infer<typeof updateAdminUserStatusSchema>['params'];

export type UpdateAdminUserStatusInput = z.infer<typeof updateAdminUserStatusSchema>['body'];

export type GetAdminReviewsQuery = z.infer<typeof getAdminReviewsSchema>['query'];

export type GetAdminReviewByIdParams = z.infer<typeof getAdminReviewByIdSchema>['params'];

export type ModerateAdminReviewParams = z.infer<typeof moderateAdminReviewSchema>['params'];

export type ModerateAdminReviewInput = z.infer<typeof moderateAdminReviewSchema>['body'];
