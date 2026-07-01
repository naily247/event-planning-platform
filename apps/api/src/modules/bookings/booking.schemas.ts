import { z } from 'zod';

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
        new Date(data.serviceEnd).getTime() <= new Date(data.serviceStart).getTime()
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['serviceEnd'],
          message: 'Service end must be after the service start',
        });
      }
    }),
});

export type CreateCustomerBookingInput = z.infer<typeof createCustomerBookingSchema>['body'];
