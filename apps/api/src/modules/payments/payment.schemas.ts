import { PaymentMethod } from '@prisma/client';
import { z } from 'zod';

const bookingIdSchema = z.string().cuid('Booking ID must be valid');

const paymentIdSchema = z.string().cuid('Payment ID must be valid');

const referenceNumberSchema = z
  .string()
  .trim()
  .min(3, 'Payment reference number must contain at least 3 characters')
  .max(200, 'Payment reference number must not exceed 200 characters');

const rejectionReasonSchema = z
  .string()
  .trim()
  .min(10, 'Rejection reason must contain at least 10 characters')
  .max(500, 'Rejection reason must not exceed 500 characters');

export const paymentSortOptions = ['oldest', 'newest'] as const;

export const submitCustomerPaymentSchema = z.object({
  params: z.object({
    bookingId: bookingIdSchema,
  }),

  body: z.object({
    method: z.literal(PaymentMethod.BANK_TRANSFER),

    referenceNumber: referenceNumberSchema,
  }),
});

export const submitCustomerPaymentWithProofSchema = z.object({
  params: z.object({
    bookingId: bookingIdSchema,
  }),

  body: z.object({
    referenceNumber: referenceNumberSchema,
  }),
});

export const createStripeCheckoutSessionSchema = z.object({
  params: z.object({
    bookingId: bookingIdSchema,
  }),
});

export const getCustomerPaymentsSchema = z.object({
  params: z.object({
    bookingId: bookingIdSchema,
  }),
});

export const getPendingPaymentsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(50).default(20),

    sort: z.enum(paymentSortOptions).default('oldest'),
  }),
});

export const getAdminPaymentSchema = z.object({
  params: z.object({
    paymentId: paymentIdSchema,
  }),
});

export const verifyAdminPaymentSchema = z.object({
  params: z.object({
    paymentId: paymentIdSchema,
  }),
});

export const rejectAdminPaymentSchema = z.object({
  params: z.object({
    paymentId: paymentIdSchema,
  }),

  body: z.object({
    reason: rejectionReasonSchema,
  }),
});

export type SubmitCustomerPaymentInput = z.infer<typeof submitCustomerPaymentSchema>['body'];

export type SubmitCustomerPaymentWithProofInput = z.infer<
  typeof submitCustomerPaymentWithProofSchema
>['body'];

export type CustomerPaymentParams = z.infer<typeof getCustomerPaymentsSchema>['params'];

export type CreateStripeCheckoutSessionParams = z.infer<
  typeof createStripeCheckoutSessionSchema
>['params'];

export type GetPendingPaymentsQuery = z.infer<typeof getPendingPaymentsSchema>['query'];

export type AdminPaymentParams = z.infer<typeof getAdminPaymentSchema>['params'];

export type RejectAdminPaymentInput = z.infer<typeof rejectAdminPaymentSchema>['body'];
