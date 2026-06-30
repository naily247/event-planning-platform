import { EventStatus } from '@prisma/client';
import { z } from 'zod';

const eventIdSchema = z.string().cuid('Event ID must be valid');

const plannedBudgetSchema = z.coerce
  .number()
  .positive('Planned budget must be greater than zero')
  .max(9_999_999_999.99, 'Planned budget is too large')
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < Number.EPSILON * 100, {
    message: 'Planned budget can contain no more than two decimal places',
  });

const eventDateSchema = z
  .string()
  .datetime({
    message: 'Event date must be a valid ISO 8601 date and time',
  })
  .refine((value) => new Date(value).getTime() > Date.now(), {
    message: 'Event date must be in the future',
  });

export const eventSortOptions = ['upcoming', 'newest', 'oldest'] as const;

export const createEventSchema = z.object({
  body: z.object({
    name: z.string().trim().min(3).max(120),

    eventType: z.string().trim().min(2).max(80),

    eventDate: eventDateSchema,

    location: z.string().trim().min(2).max(200),

    guestCount: z.coerce
      .number()
      .int('Guest count must be a whole number')
      .positive('Guest count must be greater than zero')
      .max(1_000_000, 'Guest count is too large')
      .nullable()
      .optional(),

    plannedBudget: plannedBudgetSchema.nullable().optional(),

    theme: z.string().trim().min(2).max(200).nullable().optional(),

    requirements: z.string().trim().min(10).max(5000).nullable().optional(),
  }),
});

export const getCustomerEventsSchema = z.object({
  query: z.object({
    status: z.nativeEnum(EventStatus).optional(),

    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(50).default(20),

    sort: z.enum(eventSortOptions).default('upcoming'),
  }),
});

export const getCustomerEventSchema = z.object({
  params: z.object({
    eventId: eventIdSchema,
  }),
});

export const updateCustomerEventSchema = z.object({
  params: z.object({
    eventId: eventIdSchema,
  }),

  body: z
    .object({
      name: z.string().trim().min(3).max(120).optional(),

      eventType: z.string().trim().min(2).max(80).optional(),

      eventDate: eventDateSchema.optional(),

      location: z.string().trim().min(2).max(200).optional(),

      guestCount: z.coerce
        .number()
        .int('Guest count must be a whole number')
        .positive('Guest count must be greater than zero')
        .max(1_000_000, 'Guest count is too large')
        .nullable()
        .optional(),

      plannedBudget: plannedBudgetSchema.nullable().optional(),

      theme: z.string().trim().min(2).max(200).nullable().optional(),

      requirements: z.string().trim().min(10).max(5000).nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one event field must be provided',
    }),
});

export const updateCustomerEventStatusSchema = z.object({
  params: z.object({
    eventId: eventIdSchema,
  }),

  body: z.object({
    status: z.nativeEnum(EventStatus),
  }),
});

export const deleteCustomerEventSchema = getCustomerEventSchema;

export type CreateEventInput = z.infer<typeof createEventSchema>['body'];

export type GetCustomerEventsQuery = z.infer<typeof getCustomerEventsSchema>['query'];

export type CustomerEventParams = z.infer<typeof getCustomerEventSchema>['params'];

export type UpdateCustomerEventInput = z.infer<typeof updateCustomerEventSchema>['body'];

export type UpdateCustomerEventStatusInput = z.infer<
  typeof updateCustomerEventStatusSchema
>['body'];
