import { z } from 'zod';

const cuidSchema = (label: string) => z.string().cuid(`${label} must be valid`);

const responseDueAtSchema = z
  .string()
  .datetime({
    message: 'Response deadline must be a valid ISO 8601 date and time',
  })
  .refine((value) => new Date(value).getTime() > Date.now(), {
    message: 'Response deadline must be in the future',
  });

export const createQuotationRequestSchema = z.object({
  body: z.object({
    eventId: cuidSchema('Event ID'),

    packageId: cuidSchema('Package ID'),

    requirements: z.string().trim().min(10).max(5000),

    responseDueAt: responseDueAtSchema.nullable().optional(),
  }),
});

export type CreateQuotationRequestInput = z.infer<typeof createQuotationRequestSchema>['body'];
