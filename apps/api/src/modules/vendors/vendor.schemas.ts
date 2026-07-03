import { z } from 'zod';

const contactPhoneSchema = z
  .string()
  .trim()
  .regex(
    /^\+[1-9]\d{7,14}$/,
    'Phone number must use international format, for example +94771234567',
  );

const vendorSlugSchema = z
  .string()
  .trim()
  .min(1, 'Vendor slug is required')
  .max(160);

const availabilityDateTimeSchema = z.string().datetime({
  message: 'Date and time must be a valid ISO 8601 value',
});

const availabilityBlockStartSchema = z
  .string()
  .datetime({
    message: 'Block start must be a valid ISO 8601 date and time',
  })
  .refine((value) => new Date(value).getTime() > Date.now(), {
    message: 'Block start must be in the future',
  });

const availabilityBlockEndSchema = z.string().datetime({
  message: 'Block end must be a valid ISO 8601 date and time',
});

const availabilityRangeQuerySchema = z
  .object({
    from: availabilityDateTimeSchema,
    to: availabilityDateTimeSchema,
  })
  .superRefine((data, context) => {
    if (
      new Date(data.to).getTime() <=
      new Date(data.from).getTime()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: 'Availability range end must be after the start',
      });
    }
  });

export const publicVendorSortOptions = [
  'newest',
  'oldest',
  'name_asc',
  'name_desc',
] as const;

export const publicVendorReviewSortOptions = [
  'newest',
  'oldest',
  'rating_highest',
  'rating_lowest',
] as const;

export const getPublicVendorsSchema = z.object({
  query: z.object({
    search: z.string().trim().min(1).max(120).optional(),
    category: z.string().trim().min(1).max(120).optional(),
    location: z.string().trim().min(1).max(120).optional(),
    serviceArea: z.string().trim().min(1).max(80).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    sort: z.enum(publicVendorSortOptions).default('newest'),
  }),
});

export const getPublicVendorBySlugSchema = z.object({
  params: z.object({
    slug: vendorSlugSchema,
  }),
});

export const getPublicVendorReviewsSchema = z.object({
  params: z.object({
    slug: vendorSlugSchema,
  }),

  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    sort: z
      .enum(publicVendorReviewSortOptions)
      .default('newest'),
  }),
});

export const getPublicVendorAvailabilitySchema = z.object({
  params: z.object({
    slug: vendorSlugSchema,
  }),

  query: availabilityRangeQuerySchema,
});

export const getVendorAvailabilitySchema = z.object({
  query: availabilityRangeQuerySchema,
});

export const createVendorAvailabilityBlockSchema = z.object({
  body: z
    .object({
      startsAt: availabilityBlockStartSchema,

      endsAt: availabilityBlockEndSchema,

      reason: z
        .string()
        .trim()
        .min(3, 'Block reason must contain at least 3 characters')
        .max(500, 'Block reason must not exceed 500 characters')
        .nullable()
        .optional(),
    })
    .superRefine((data, context) => {
      if (
        new Date(data.endsAt).getTime() <=
        new Date(data.startsAt).getTime()
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endsAt'],
          message: 'Block end must be after the block start',
        });
      }
    }),
});

export const deleteVendorAvailabilityBlockSchema = z.object({
  params: z.object({
    blockId: z
      .string()
      .cuid('Availability block ID must be valid'),
  }),
});

export const updateVendorProfileSchema = z.object({
  body: z
    .object({
      businessName: z
        .string()
        .trim()
        .min(2)
        .max(120)
        .optional(),

      description: z
        .string()
        .trim()
        .min(20)
        .max(2000)
        .nullable()
        .optional(),

      contactPhone: contactPhoneSchema.nullable().optional(),

      website: z
        .string()
        .trim()
        .url()
        .max(255)
        .nullable()
        .optional(),

      baseLocation: z
        .string()
        .trim()
        .min(2)
        .max(120)
        .nullable()
        .optional(),

      serviceAreas: z
        .array(z.string().trim().min(2).max(80))
        .max(20)
        .optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one profile field must be provided',
    }),
});

export const updateVendorCategoriesSchema = z.object({
  body: z.object({
    categoryIds: z
      .array(z.string().cuid('Each category ID must be valid'))
      .min(1, 'At least one service category must be selected')
      .max(5, 'A vendor can select up to five service categories')
      .refine(
        (categoryIds) =>
          new Set(categoryIds).size === categoryIds.length,
        {
          message: 'Duplicate category IDs are not allowed',
        },
      ),
  }),
});

export type GetPublicVendorsQuery = z.infer<
  typeof getPublicVendorsSchema
>['query'];

export type GetPublicVendorBySlugParams = z.infer<
  typeof getPublicVendorBySlugSchema
>['params'];

export type GetPublicVendorReviewsParams = z.infer<
  typeof getPublicVendorReviewsSchema
>['params'];

export type GetPublicVendorReviewsQuery = z.infer<
  typeof getPublicVendorReviewsSchema
>['query'];

export type GetPublicVendorAvailabilityParams = z.infer<
  typeof getPublicVendorAvailabilitySchema
>['params'];

export type GetPublicVendorAvailabilityQuery = z.infer<
  typeof getPublicVendorAvailabilitySchema
>['query'];

export type GetVendorAvailabilityQuery = z.infer<
  typeof getVendorAvailabilitySchema
>['query'];

export type CreateVendorAvailabilityBlockInput = z.infer<
  typeof createVendorAvailabilityBlockSchema
>['body'];

export type DeleteVendorAvailabilityBlockParams = z.infer<
  typeof deleteVendorAvailabilityBlockSchema
>['params'];

export type UpdateVendorProfileInput = z.infer<
  typeof updateVendorProfileSchema
>['body'];

export type UpdateVendorCategoriesInput = z.infer<
  typeof updateVendorCategoriesSchema
>['body'];
