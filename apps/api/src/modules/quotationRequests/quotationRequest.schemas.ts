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

const quotationExpiresAtSchema = z
  .string()
  .datetime({
    message: 'Quotation expiry must be a valid ISO 8601 date and time',
  })
  .refine((value) => new Date(value).getTime() > Date.now(), {
    message: 'Quotation expiry must be in the future',
  });
const vendorQuotationFieldsSchema = z.object({
  proposedPrice: z.coerce
    .number()
    .positive('Proposed price must be greater than zero')
    .max(9999999999.99, 'Proposed price is too large'),

  depositAmount: z.coerce
    .number()
    .min(0, 'Deposit amount cannot be negative')
    .max(9999999999.99, 'Deposit amount is too large')
    .nullable()
    .optional(),

  inclusions: z.string().trim().min(10).max(5000),

  exclusions: z.string().trim().min(1).max(5000).nullable().optional(),

  terms: z.string().trim().min(1).max(5000).nullable().optional(),

  expiresAt: quotationExpiresAtSchema.nullable().optional(),
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

export const getVendorQuotationRequestsSchema = z.object({
  query: z.object({
    status: z.nativeEnum(QuotationRequestStatus).optional(),

    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(50).default(20),

    sort: z.enum(quotationRequestSortOptions).default('newest'),
  }),
});

export const getVendorQuotationRequestSchema = z.object({
  params: z.object({
    quotationRequestId: cuidSchema('Quotation request ID'),
  }),
});

export const markVendorQuotationRequestViewedSchema = z.object({
  params: z.object({
    quotationRequestId: cuidSchema('Quotation request ID'),
  }),
});

export const createVendorQuotationDraftSchema = z.object({
  params: z.object({
    quotationRequestId: cuidSchema('Quotation request ID'),
  }),

  body: vendorQuotationFieldsSchema.superRefine((data, context) => {
    if (
      data.depositAmount !== undefined &&
      data.depositAmount !== null &&
      data.depositAmount > data.proposedPrice
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['depositAmount'],
        message: 'Deposit amount cannot exceed the proposed price',
      });
    }
  }),
});

export const getVendorQuotationDraftSchema = z.object({
  params: z.object({
    quotationRequestId: cuidSchema('Quotation request ID'),
  }),
});

export const updateVendorQuotationDraftSchema = z.object({
  params: z.object({
    quotationRequestId: cuidSchema('Quotation request ID'),
  }),

  body: vendorQuotationFieldsSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one quotation field must be provided',
    })
    .superRefine((data, context) => {
      if (
        data.proposedPrice !== undefined &&
        data.depositAmount !== undefined &&
        data.depositAmount !== null &&
        data.depositAmount > data.proposedPrice
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['depositAmount'],
          message: 'Deposit amount cannot exceed the proposed price',
        });
      }
    }),
});

export const sendVendorQuotationDraftSchema = z.object({
  params: z.object({
    quotationRequestId: cuidSchema('Quotation request ID'),
  }),
});

export const getCustomerQuotationSchema = z.object({
  params: z.object({
    quotationRequestId: cuidSchema('Quotation request ID'),
  }),
});

export const acceptCustomerQuotationSchema = z.object({
  params: z.object({
    quotationRequestId: cuidSchema('Quotation request ID'),
    quotationId: cuidSchema('Quotation ID'),
  }),
});

export type CreateQuotationRequestInput = z.infer<
  typeof createQuotationRequestSchema
>['body'];

export type GetCustomerQuotationRequestsQuery = z.infer<
  typeof getCustomerQuotationRequestsSchema
>['query'];

export type CustomerQuotationRequestParams = z.infer<
  typeof getCustomerQuotationRequestSchema
>['params'];

export type GetVendorQuotationRequestsQuery = z.infer<
  typeof getVendorQuotationRequestsSchema
>['query'];

export type VendorQuotationRequestParams = z.infer<
  typeof getVendorQuotationRequestSchema
>['params'];

export type MarkVendorQuotationRequestViewedParams = z.infer<
  typeof markVendorQuotationRequestViewedSchema
>['params'];

export type CreateVendorQuotationDraftParams = z.infer<
  typeof createVendorQuotationDraftSchema
>['params'];

export type CreateVendorQuotationDraftInput = z.infer<
  typeof createVendorQuotationDraftSchema
>['body'];

export type GetVendorQuotationDraftParams = z.infer<
  typeof getVendorQuotationDraftSchema
>['params'];

export type UpdateVendorQuotationDraftParams = z.infer<
  typeof updateVendorQuotationDraftSchema
>['params'];

export type UpdateVendorQuotationDraftInput = z.infer<
  typeof updateVendorQuotationDraftSchema
>['body'];

export type SendVendorQuotationDraftParams = z.infer<
  typeof sendVendorQuotationDraftSchema
>['params'];

export type GetCustomerQuotationParams = z.infer<typeof getCustomerQuotationSchema>['params'];

export type AcceptCustomerQuotationParams = z.infer<typeof acceptCustomerQuotationSchema>['params'];
