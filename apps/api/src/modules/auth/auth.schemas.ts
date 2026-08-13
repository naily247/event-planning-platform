import { z } from 'zod';
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

const emailSchema = z
  .string()
  .trim()
  .email('Enter a valid email address')
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, 'Password must contain at least 8 characters')
  .max(72, 'Password must not exceed 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(60, 'Name must not exceed 60 characters');

const phoneSchema = z
  .object({
    country: z.string().trim().length(2),
    number: z.string().trim().min(1, 'Phone number is required'),
  })
  .transform(({ country, number }, ctx) => {
    const parsedPhone = parsePhoneNumberFromString(number, country.toUpperCase() as CountryCode);

    if (!parsedPhone?.isValid()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid phone number for the selected country',
      });

      return z.NEVER;
    }

    return parsedPhone.number;
  });

export const registerCustomerSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    phone: phoneSchema.optional(),
  }),
});

export const registerVendorSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    businessName: z.string().trim().min(2).max(120),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
  }),
});

export const updateCurrentUserSchema = z.object({
  body: z
    .object({
      firstName: nameSchema.optional(),
      lastName: nameSchema.optional(),
      phone: phoneSchema.nullable().optional(),
    })
    .refine(
      (body) =>
        body.firstName !== undefined || body.lastName !== undefined || body.phone !== undefined,
      {
        message: 'Provide at least one profile field to update',
      },
    ),
});

export type RegisterCustomerInput = z.infer<typeof registerCustomerSchema>['body'];

export type RegisterVendorInput = z.infer<typeof registerVendorSchema>['body'];

export type LoginInput = z.infer<typeof loginSchema>['body'];

export type UpdateCurrentUserInput = z.infer<typeof updateCurrentUserSchema>['body'];
