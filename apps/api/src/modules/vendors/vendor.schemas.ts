import { z } from 'zod';

const contactPhoneSchema = z
  .string()
  .trim()
  .regex(
    /^\+[1-9]\d{7,14}$/,
    'Phone number must use international format, for example +94771234567',
  );

export const updateVendorProfileSchema = z.object({
  body: z
    .object({
      businessName: z.string().trim().min(2).max(120).optional(),
      description: z.string().trim().min(20).max(2000).nullable().optional(),
      contactPhone: contactPhoneSchema.nullable().optional(),
      website: z.string().trim().url().max(255).nullable().optional(),
      baseLocation: z.string().trim().min(2).max(120).nullable().optional(),
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
        (categoryIds) => new Set(categoryIds).size === categoryIds.length,
        {
          message: 'Duplicate category IDs are not allowed',
        },
      ),
  }),
});

export type UpdateVendorProfileInput = z.infer<
  typeof updateVendorProfileSchema
>['body'];

export type UpdateVendorCategoriesInput = z.infer<
  typeof updateVendorCategoriesSchema
>['body'];