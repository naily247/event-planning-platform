
import { z } from 'zod'; // Store phone numbers in E.164 format so international numbers
import {
  parsePhoneNumberFromString,
  type CountryCode, 
} from 'libphonenumber-js';   // remain consistent across profiles, quotations and bookings.
const emailSchema = z
  .string()
  .trim()
  .email('Enter a valid email address')
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, 'Password must contain at least 10 characters')
  .max(20, 'Password must not exceed 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[^A-Za-z0-9]/,
    'Password must contain at least one special character',
  );

const nameSchema = z.string().trim().min(1).max(60);

const phoneSchema = z
  .object({
    country: z.string().trim().length(2),
    number: z.string().trim().min(1, 'Phone number is required'),
  })
  .transform(({ country, number }, ctx) => {
    const parsedPhone = parsePhoneNumberFromString(
      number,
      country.toUpperCase() as CountryCode,
    );

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

export type RegisterCustomerInput =
  z.infer<typeof registerCustomerSchema>['body'];

export type RegisterVendorInput =
  z.infer<typeof registerVendorSchema>['body'];

export type LoginInput = z.infer<typeof loginSchema>['body'];
