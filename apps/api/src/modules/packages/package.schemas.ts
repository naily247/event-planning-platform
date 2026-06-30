import { z } from 'zod';

const packageIdSchema = z.string().cuid('Package ID must be valid');

const categoryIdSchema = z.string().cuid('Category ID must be valid');

const basePriceSchema = z.coerce
  .number()
  .positive('Base price must be greater than zero')
  .max(9_999_999_999.99, 'Base price is too large')
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < Number.EPSILON * 100, {
    message: 'Base price can contain no more than two decimal places',
  });

export const createServicePackageSchema = z.object({
  body: z.object({
    categoryId: categoryIdSchema,
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(20).max(2000).nullable().optional(),
    basePrice: basePriceSchema.nullable().optional(),
    isActive: z.boolean().optional().default(false),
  }),
});

export const getVendorPackagesSchema = z.object({
  query: z.object({
    isActive: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  }),
});

export const getServicePackageSchema = z.object({
  params: z.object({
    packageId: packageIdSchema,
  }),
});

export const updateServicePackageSchema = z.object({
  params: z.object({
    packageId: packageIdSchema,
  }),

  body: z
    .object({
      categoryId: categoryIdSchema.optional(),
      title: z.string().trim().min(3).max(120).optional(),
      description: z.string().trim().min(20).max(2000).nullable().optional(),
      basePrice: basePriceSchema.nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one package field must be provided',
    }),
});

export const updateServicePackageStatusSchema = z.object({
  params: z.object({
    packageId: packageIdSchema,
  }),

  body: z.object({
    isActive: z.boolean(),
  }),
});

export const deleteServicePackageSchema = getServicePackageSchema;

export type CreateServicePackageInput = z.infer<typeof createServicePackageSchema>['body'];

export type GetVendorPackagesQuery = z.infer<typeof getVendorPackagesSchema>['query'];

export type ServicePackageParams = z.infer<typeof getServicePackageSchema>['params'];

export type UpdateServicePackageInput = z.infer<typeof updateServicePackageSchema>['body'];

export type UpdateServicePackageStatusInput = z.infer<
  typeof updateServicePackageStatusSchema
>['body'];
