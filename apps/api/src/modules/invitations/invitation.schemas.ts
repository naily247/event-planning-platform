import { GuestStatus } from '@prisma/client';
import { z } from 'zod';

const cuidSchema = z.string().trim().cuid('Invalid identifier');

const invitationTokenSchema = z
  .string()
  .trim()
  .min(32, 'Invitation token is invalid')
  .max(256, 'Invitation token is invalid');

const expiresInDaysSchema = z.coerce
  .number()
  .int('Expiry duration must be a whole number')
  .min(1, 'Expiry duration must be at least 1 day')
  .max(30, 'Expiry duration cannot exceed 30 days');

const nullableOptionalTextSchema = (fieldName: string, maxLength: number) =>
  z
    .union([
      z.string().trim().max(maxLength, `${fieldName} cannot exceed ${maxLength} characters`),
      z.null(),
    ])
    .optional();

export const invitationEventParamsSchema = z.object({
  eventId: cuidSchema,
});

export const invitationGuestParamsSchema = z.object({
  eventId: cuidSchema,
  guestId: cuidSchema,
});

export const invitationTokenParamsSchema = z.object({
  token: invitationTokenSchema,
});

export const createInvitationBodySchema = z
  .object({
    expiresInDays: expiresInDaysSchema.optional(),
  })
  .strict();

export const regenerateInvitationBodySchema = z
  .object({
    expiresInDays: expiresInDaysSchema.optional(),
  })
  .strict();

export const invitationListQuerySchema = z
  .object({
    status: z.enum(['active', 'expired', 'revoked', 'responded', 'unresponded']).optional(),

    search: z
      .string()
      .trim()
      .min(1, 'Search value cannot be empty')
      .max(100, 'Search value cannot exceed 100 characters')
      .optional(),

    page: z.coerce
      .number()
      .int('Page must be a whole number')
      .min(1, 'Page must be at least 1')
      .default(1),

    limit: z.coerce
      .number()
      .int('Limit must be a whole number')
      .min(1, 'Limit must be at least 1')
      .max(50, 'Limit cannot exceed 50')
      .default(10),

    sort: z
      .enum(['newest', 'oldest', 'expires_soon', 'guest_name_asc', 'guest_name_desc'])
      .default('newest'),
  })
  .strict();

export const publicRsvpBodySchema = z
  .object({
    status: z.enum([GuestStatus.CONFIRMED, GuestStatus.DECLINED, GuestStatus.MAYBE]),

    partySize: z.coerce
      .number()
      .int('Party size must be a whole number')
      .min(1, 'Party size must be at least 1')
      .max(100, 'Party size cannot exceed 100'),

    mealPreference: nullableOptionalTextSchema('Meal preference', 100),

    dietaryRequirements: nullableOptionalTextSchema('Dietary requirements', 500),
  })
  .strict();

export const createInvitationRequestSchema = z.object({
  params: invitationGuestParamsSchema,
  body: createInvitationBodySchema,
});

export const regenerateInvitationRequestSchema = z.object({
  params: invitationGuestParamsSchema,
  body: regenerateInvitationBodySchema,
});

export const revokeInvitationRequestSchema = z.object({
  params: invitationGuestParamsSchema,
});

export const getInvitationRequestSchema = z.object({
  params: invitationGuestParamsSchema,
});

export const getEventInvitationsRequestSchema = z.object({
  params: invitationEventParamsSchema,
  query: invitationListQuerySchema,
});

export const getPublicInvitationRequestSchema = z.object({
  params: invitationTokenParamsSchema,
});

export const submitPublicRsvpRequestSchema = z.object({
  params: invitationTokenParamsSchema,
  body: publicRsvpBodySchema,
});

export type InvitationEventParams = z.infer<typeof invitationEventParamsSchema>;

export type InvitationGuestParams = z.infer<typeof invitationGuestParamsSchema>;

export type InvitationTokenParams = z.infer<typeof invitationTokenParamsSchema>;

export type CreateInvitationBody = z.infer<typeof createInvitationBodySchema>;

export type RegenerateInvitationBody = z.infer<typeof regenerateInvitationBodySchema>;

export type InvitationListQuery = z.infer<typeof invitationListQuerySchema>;

export type PublicRsvpBody = z.infer<typeof publicRsvpBodySchema>;
