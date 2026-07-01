import { QuotationRequestStatus } from '@prisma/client';
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

export const quotationRequestSortOptions = ['newest', 'oldest'] as const;

export const createQuotationRequestSchema = z.object({
  body: z.object({
    eventId: cuidSchema('Event ID'),

    packageId: cuidSchema('Package ID'),

    requirements: z.string().trim().min(10).max(5000),

    responseDueAt: responseDueAtSchema.nullable().optional(),
  }),
});

export const getCustomerQuotationRequestsSchema = z.object({
  query: z.object({
    status: z.nativeEnum(QuotationRequestStatus).optional(),

    eventId: cuidSchema('Event ID').optional(),

    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(50).default(20),

    sort: z.enum(quotationRequestSortOptions).default('newest'),
  }),
});

export const getCustomerQuotationRequestSchema = z.object({
  params: z.object({
    quotationRequestId: cuidSchema('Quotation request ID'),
  }),
});

export type CreateQuotationRequestInput = z.infer<typeof createQuotationRequestSchema>['body'];

export type GetCustomerQuotationRequestsQuery = z.infer<
  typeof getCustomerQuotationRequestsSchema
>['query'];

export type CustomerQuotationRequestParams = z.infer<
  typeof getCustomerQuotationRequestSchema
>['params'];
