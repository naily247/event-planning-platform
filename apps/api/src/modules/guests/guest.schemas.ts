import { GuestStatus } from '@prisma/client';
import { z } from 'zod';

const cuidSchema = z.string().trim().cuid('The provided ID must be a valid CUID');

const optionalNullableText = (fieldName: string, maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} cannot be empty`)
    .max(maxLength, `${fieldName} must not exceed ${maxLength} characters`)
    .nullable()
    .optional();

const optionalNullableEmail = z
  .string()
  .trim()
  .email('Email must be a valid email address')
  .max(255, 'Email must not exceed 255 characters')
  .nullable()
  .optional();

const optionalNullablePhone = z
  .string()
  .trim()
  .min(7, 'Phone number must contain at least 7 characters')
  .max(30, 'Phone number must not exceed 30 characters')
  .nullable()
  .optional();

export const guestEventParamsSchema = z.object({
  eventId: cuidSchema,
});

export const guestParamsSchema = z.object({
  eventId: cuidSchema,
  guestId: cuidSchema,
});

export const createGuestSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name must not exceed 100 characters'),

  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name must not exceed 100 characters'),

  email: optionalNullableEmail,

  phone: optionalNullablePhone,

  groupName: optionalNullableText('Group name', 100),

  status: z.nativeEnum(GuestStatus).optional(),

  partySize: z
    .number()
    .int('Party size must be a whole number')
    .min(1, 'Party size must be at least 1')
    .max(100, 'Party size must not exceed 100')
    .optional(),

  mealPreference: optionalNullableText('Meal preference', 255),

  dietaryRequirements: optionalNullableText('Dietary requirements', 1000),

  notes: optionalNullableText('Notes', 2000),
});

export const updateGuestSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, 'First name cannot be empty')
      .max(100, 'First name must not exceed 100 characters')
      .optional(),

    lastName: z
      .string()
      .trim()
      .min(1, 'Last name cannot be empty')
      .max(100, 'Last name must not exceed 100 characters')
      .optional(),

    email: optionalNullableEmail,

    phone: optionalNullablePhone,

    groupName: optionalNullableText('Group name', 100),

    partySize: z
      .number()
      .int('Party size must be a whole number')
      .min(1, 'Party size must be at least 1')
      .max(100, 'Party size must not exceed 100')
      .optional(),

    mealPreference: optionalNullableText('Meal preference', 255),

    dietaryRequirements: optionalNullableText('Dietary requirements', 1000),

    notes: optionalNullableText('Notes', 2000),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one guest field must be provided',
  });

export const updateGuestRsvpSchema = z.object({
  status: z.nativeEnum(GuestStatus),
});

export const listGuestsQuerySchema = z.object({
  status: z.nativeEnum(GuestStatus).optional(),

  groupName: z
    .string()
    .trim()
    .min(1, 'Group name cannot be empty')
    .max(100, 'Group name must not exceed 100 characters')
    .optional(),

  search: z
    .string()
    .trim()
    .min(1, 'Search cannot be empty')
    .max(100, 'Search must not exceed 100 characters')
    .optional(),

  sort: z
    .enum(['newest', 'oldest', 'name_asc', 'name_desc', 'party_size_highest', 'party_size_lowest'])
    .default('newest'),

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
});

export type GuestEventParams = z.infer<typeof guestEventParamsSchema>;

export type GuestParams = z.infer<typeof guestParamsSchema>;

export type CreateGuestInput = z.infer<typeof createGuestSchema>;

export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;

export type UpdateGuestRsvpInput = z.infer<typeof updateGuestRsvpSchema>;

export type ListGuestsQuery = z.infer<typeof listGuestsQuerySchema>;

export const createGuestRequestSchema = z.object({
  params: guestEventParamsSchema,
  body: createGuestSchema,
});

export const getEventGuestsRequestSchema = z.object({
  params: guestEventParamsSchema,
  query: listGuestsQuerySchema,
});

export const getGuestSummaryRequestSchema = z.object({
  params: guestEventParamsSchema,
});

export const getGuestByIdRequestSchema = z.object({
  params: guestParamsSchema,
});

export const updateGuestRequestSchema = z.object({
  params: guestParamsSchema,
  body: updateGuestSchema,
});

export const updateGuestRsvpRequestSchema = z.object({
  params: guestParamsSchema,
  body: updateGuestRsvpSchema,
});

export const deleteGuestRequestSchema = z.object({
  params: guestParamsSchema,
});
