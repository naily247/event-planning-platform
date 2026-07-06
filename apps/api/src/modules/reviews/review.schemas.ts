import { z } from 'zod';

const reviewIdSchema = z.string().trim().cuid('Review ID must be a valid CUID');

const vendorIdSchema = z.string().trim().cuid('Vendor ID must be a valid CUID');

const reviewRatingSchema = z
  .number()
  .int('Rating must be a whole number')
  .min(1, 'Rating must be at least 1')
  .max(5, 'Rating must not exceed 5');

const reviewCommentSchema = z
  .string()
  .trim()
  .min(3, 'Review comment must contain at least 3 characters')
  .max(2000, 'Review comment must not exceed 2000 characters');

export const reviewSortOptions = ['newest', 'oldest', 'rating_highest', 'rating_lowest'] as const;

export const getCustomerReviewsSchema = z.object({
  query: z.object({
    page: z.coerce
      .number()
      .int('Page must be a whole number')
      .min(1, 'Page must be at least 1')
      .default(1),

    limit: z.coerce
      .number()
      .int('Limit must be a whole number')
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit must not exceed 100')
      .default(20),

    vendorId: vendorIdSchema.optional(),

    overallRating: z.coerce
      .number()
      .int('Overall rating must be a whole number')
      .min(1, 'Overall rating must be at least 1')
      .max(5, 'Overall rating must not exceed 5')
      .optional(),

    sort: z.enum(reviewSortOptions).default('newest'),
  }),
});

export const getCustomerReviewSchema = z.object({
  params: z.object({
    reviewId: reviewIdSchema,
  }),
});

export const updateCustomerReviewSchema = z.object({
  params: z.object({
    reviewId: reviewIdSchema,
  }),

  body: z
    .object({
      overallRating: reviewRatingSchema.optional(),

      serviceRating: reviewRatingSchema.nullable().optional(),

      communicationRating: reviewRatingSchema.nullable().optional(),

      comment: reviewCommentSchema.nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, 'At least one review field must be provided'),
});

export const deleteCustomerReviewSchema = z.object({
  params: z.object({
    reviewId: reviewIdSchema,
  }),
});

export type GetCustomerReviewsQuery = z.infer<typeof getCustomerReviewsSchema>['query'];

export type CustomerReviewParams = z.infer<typeof getCustomerReviewSchema>['params'];

export type UpdateCustomerReviewInput = z.infer<typeof updateCustomerReviewSchema>['body'];
