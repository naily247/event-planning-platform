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

export type UpdateVendorProfileInput = z.infer<
  typeof updateVendorProfileSchema
>['body'];
