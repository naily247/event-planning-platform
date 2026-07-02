import { BookingStatus } from '@prisma/client';
import { z } from 'zod';

const bookingIdSchema = z.string().cuid('Booking ID must be valid');

const quotationIdSchema = z.string().cuid('Quotation ID must be valid');

const serviceStartSchema = z
  .string()
  .datetime({
    message: 'Service start must be a valid ISO 8601 date and time',
  })
  .refine((value) => new Date(value).getTime() > Date.now(), {
    message: 'Service start must be in the future',
  });

const serviceEndSchema = z
  .string()
  .datetime({
    message: 'Service end must be a valid ISO 8601 date and time',
  })
  .nullable()
  .optional();

const vendorResponseNoteSchema = z.string().trim().min(3).max(2000);

const customerCancellationReasonSchema = z
  .string()
  .trim()
  .min(
    10,
    'Cancellation reason must contain at least 10 characters',
  )
  .max(2000);

export const bookingSortOptions = [
  'newest',
  'oldest',
  'service_soonest',
  'service_latest',
] as const;

const bookingListQuerySchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(50).default(20),

  sort: z.enum(bookingSortOptions).default('newest'),
});

export const createCustomerBookingSchema = z.object({
  body: z
    .object({
      quotationId: quotationIdSchema,

      serviceStart: serviceStartSchema,

      serviceEnd: serviceEndSchema,
    })
    .superRefine((data, context) => {
      if (
        data.serviceEnd !== undefined &&
        data.serviceEnd !== null &&
        new Date(data.serviceEnd).getTime() <=
          new Date(data.serviceStart).getTime()
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['serviceEnd'],
          message: 'Service end must be after the service start',
        });
      }
    }),
});

export const getCustomerBookingsSchema = z.object({
  query: bookingListQuerySchema,
});

export const getCustomerBookingSchema = z.object({
  params: z.object({
    bookingId: bookingIdSchema,
  }),
});

export const cancelCustomerBookingSchema = z.object({
  params: z.object({
    bookingId: bookingIdSchema,
  }),

  body: z.object({
    reason: customerCancellationReasonSchema,
  }),
});

export const getVendorBookingsSchema = z.object({
  query: bookingListQuerySchema,
});

export const getVendorBookingSchema = z.object({
  params: z.object({
    bookingId: bookingIdSchema,
  }),
});

export const confirmVendorBookingSchema = z.object({
  params: z.object({
    bookingId: bookingIdSchema,
  }),

  body: z.object({
    note: vendorResponseNoteSchema.nullable().optional(),
  }),
});

export const rejectVendorBookingSchema = z.object({
  params: z.object({
    bookingId: bookingIdSchema,
  }),

  body: z.object({
    reason: z
      .string()
      .trim()
      .min(
        10,
        'Rejection reason must contain at least 10 characters',
      )
      .max(2000),
  }),
});

export type CreateCustomerBookingInput = z.infer<
  typeof createCustomerBookingSchema
>['body'];

export type GetCustomerBookingsQuery = z.infer<
  typeof getCustomerBookingsSchema
>['query'];

export type CustomerBookingParams = z.infer<
  typeof getCustomerBookingSchema
>['params'];

export type CancelCustomerBookingInput = z.infer<
  typeof cancelCustomerBookingSchema
>['body'];

export type GetVendorBookingsQuery = z.infer<
  typeof getVendorBookingsSchema
>['query'];

export type VendorBookingParams = z.infer<
  typeof getVendorBookingSchema
>['params'];

export type ConfirmVendorBookingInput = z.infer<
  typeof confirmVendorBookingSchema
>['body'];

export type RejectVendorBookingInput = z.infer<
  typeof rejectVendorBookingSchema
>['body'];