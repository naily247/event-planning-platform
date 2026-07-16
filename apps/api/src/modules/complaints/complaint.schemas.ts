import { ComplaintStatus, ComplaintType, ComplaintPriority } from '@prisma/client';
import { z } from 'zod';

const complaintIdSchema = z.string().trim().cuid('Complaint ID must be a valid CUID');

const bookingIdSchema = z.string().trim().cuid('Booking ID must be a valid CUID');

const paymentIdSchema = z.string().trim().cuid('Payment ID must be a valid CUID');

const reviewIdSchema = z.string().trim().cuid('Review ID must be a valid CUID');

const eventIdSchema = z.string().trim().cuid('Event ID must be a valid CUID');

const quotationRequestIdSchema = z
  .string()
  .trim()
  .cuid('Quotation request ID must be a valid CUID');

const respondentIdSchema = z.string().trim().cuid('Respondent ID must be a valid CUID');

const complaintSubjectSchema = z
  .string()
  .trim()
  .min(5, 'Complaint subject must contain at least 5 characters')
  .max(150, 'Complaint subject must not exceed 150 characters');

const complaintDescriptionSchema = z
  .string()
  .trim()
  .min(20, 'Complaint description must contain at least 20 characters')
  .max(5000, 'Complaint description must not exceed 5000 characters');

const complaintMessageBodySchema = z
  .string()
  .trim()
  .min(1, 'Complaint message must contain at least 1 character')
  .max(5000, 'Complaint message must not exceed 5000 characters');

const complaintCloseReasonSchema = z
  .string()
  .trim()
  .min(5, 'Close reason must contain at least 5 characters')
  .max(500, 'Close reason must not exceed 500 characters');

const complaintAdminStatusReasonSchema = z
  .string()
  .trim()
  .min(5, 'Status-change reason must contain at least 5 characters')
  .max(1000, 'Status-change reason must not exceed 1000 characters');

const complaintAdminAssignmentReasonSchema = z
  .string()
  .trim()
  .min(5, 'Assignment reason must contain at least 5 characters')
  .max(1000, 'Assignment reason must not exceed 1000 characters');

const complaintAdminPriorityReasonSchema = z
  .string()
  .trim()
  .min(5, 'Priority-change reason must contain at least 5 characters')
  .max(1000, 'Priority-change reason must not exceed 1000 characters');

const complaintAdminReopenReasonSchema = z
  .string()
  .trim()
  .min(5, 'Reopening reason must contain at least 5 characters')
  .max(1000, 'Reopening reason must not exceed 1000 characters');

const commonComplaintFields = {
  subject: complaintSubjectSchema,
  description: complaintDescriptionSchema,
};

const bookingComplaintSchema = z
  .object({
    type: z.literal(ComplaintType.BOOKING),
    ...commonComplaintFields,
    bookingId: bookingIdSchema,
  })
  .strict();

const paymentComplaintSchema = z
  .object({
    type: z.literal(ComplaintType.PAYMENT),
    ...commonComplaintFields,
    paymentId: paymentIdSchema,
  })
  .strict();

const reviewComplaintSchema = z
  .object({
    type: z.literal(ComplaintType.REVIEW),
    ...commonComplaintFields,
    reviewId: reviewIdSchema,
  })
  .strict();

const quotationComplaintSchema = z
  .object({
    type: z.literal(ComplaintType.QUOTATION),
    ...commonComplaintFields,
    quotationRequestId: quotationRequestIdSchema,
  })
  .strict();

const userConductComplaintSchema = z
  .object({
    type: z.literal(ComplaintType.USER_CONDUCT),
    ...commonComplaintFields,
    respondentId: respondentIdSchema,
  })
  .strict();

const platformComplaintSchema = z
  .object({
    type: z.literal(ComplaintType.PLATFORM),
    ...commonComplaintFields,
  })
  .strict();

const otherComplaintSchema = z
  .object({
    type: z.literal(ComplaintType.OTHER),
    ...commonComplaintFields,
    respondentId: respondentIdSchema.optional(),
  })
  .strict();

export const createComplaintSchema = z.object({
  body: z.discriminatedUnion('type', [
    bookingComplaintSchema,
    paymentComplaintSchema,
    reviewComplaintSchema,
    quotationComplaintSchema,
    userConductComplaintSchema,
    platformComplaintSchema,
    otherComplaintSchema,
  ]),
});

export const complaintSortOptions = [
  'newest',
  'oldest',
  'priority_highest',
  'priority_lowest',
] as const;

export const adminComplaintSortOptions = [
  'newest',
  'oldest',
  'recently_updated',
  'priority_highest',
  'priority_lowest',
] as const;

export const getMyComplaintsSchema = z.object({
  query: z.object({
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

    eventId: eventIdSchema.optional(),

    status: z.nativeEnum(ComplaintStatus).optional(),

    type: z.nativeEnum(ComplaintType).optional(),

    sort: z.enum(complaintSortOptions).default('newest'),
  }),
});

export const getAdminComplaintsSchema = z.object({
  query: z
    .object({
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

      search: z
        .string()
        .trim()
        .min(1, 'Search must contain at least 1 character')
        .max(150, 'Search must not exceed 150 characters')
        .optional(),

      status: z.nativeEnum(ComplaintStatus).optional(),

      type: z.nativeEnum(ComplaintType).optional(),

      priority: z.nativeEnum(ComplaintPriority).optional(),

      assignment: z.enum(['all', 'assigned', 'unassigned']).default('all'),

      assignedAdminId: z
        .string()
        .trim()
        .cuid('Assigned administrator ID must be a valid CUID')
        .optional(),

      sort: z.enum(adminComplaintSortOptions).default('newest'),
    })
    .superRefine((query, context) => {
      if (query.assignment === 'unassigned' && query.assignedAdminId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['assignedAdminId'],
          message:
            'Assigned administrator ID cannot be used when filtering for unassigned complaints',
        });
      }
    }),
});

export const updateAdminComplaintStatusSchema = z.object({
  params: z.object({
    complaintId: complaintIdSchema,
  }),

  body: z
    .object({
      status: z.enum([
        ComplaintStatus.UNDER_REVIEW,
        ComplaintStatus.UNDER_INVESTIGATION,
        ComplaintStatus.AWAITING_CUSTOMER_RESPONSE,
        ComplaintStatus.AWAITING_VENDOR_RESPONSE,
        ComplaintStatus.RESOLVED,
        ComplaintStatus.DISMISSED,
      ]),
      reason: complaintAdminStatusReasonSchema,
      resolutionSummary: z
        .string()
        .trim()
        .min(10, 'Resolution summary must contain at least 10 characters')
        .max(2000, 'Resolution summary must not exceed 2000 characters')
        .optional(),
    })
    .strict()
    .superRefine((body, context) => {
      if (body.status === ComplaintStatus.RESOLVED && !body.resolutionSummary) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['resolutionSummary'],
          message: 'Resolution summary is required when resolving a complaint',
        });
      }

      if (body.status !== ComplaintStatus.RESOLVED && body.resolutionSummary) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['resolutionSummary'],
          message: 'Resolution summary can only be provided when resolving a complaint',
        });
      }
    }),
});

export const updateAdminComplaintAssignmentSchema = z.object({
  params: z.object({
    complaintId: complaintIdSchema,
  }),

  body: z
    .object({
      assignedAdminId: z
        .string()
        .trim()
        .cuid('Assigned administrator ID must be a valid CUID')
        .nullable(),

      reason: complaintAdminAssignmentReasonSchema,
    })
    .strict(),
});

export const updateAdminComplaintPrioritySchema = z.object({
  params: z.object({
    complaintId: complaintIdSchema,
  }),

  body: z
    .object({
      priority: z.nativeEnum(ComplaintPriority),
      reason: complaintAdminPriorityReasonSchema,
    })
    .strict(),
});

export const reopenAdminComplaintSchema = z.object({
  params: z.object({
    complaintId: complaintIdSchema,
  }),

  body: z
    .object({
      reason: complaintAdminReopenReasonSchema,
    })
    .strict(),
});

export const getComplaintSchema = z.object({
  params: z.object({
    complaintId: complaintIdSchema,
  }),
});

export const getAdminComplaintSchema = z.object({
  params: z.object({
    complaintId: complaintIdSchema,
  }),
});

export const addComplaintMessageSchema = z.object({
  params: z.object({
    complaintId: complaintIdSchema,
  }),

  body: z
    .object({
      body: complaintMessageBodySchema,
    })
    .strict(),
});

export const closeComplaintSchema = z.object({
  params: z.object({
    complaintId: complaintIdSchema,
  }),

  body: z
    .object({
      reason: complaintCloseReasonSchema.optional(),
    })
    .strict(),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>['body'];

export type GetMyComplaintsQuery = z.infer<typeof getMyComplaintsSchema>['query'];

export type ComplaintParams = z.infer<typeof getComplaintSchema>['params'];

export type AddComplaintMessageInput = z.infer<typeof addComplaintMessageSchema>['body'];

export type CloseComplaintInput = z.infer<typeof closeComplaintSchema>['body'];

export type GetAdminComplaintsQuery = z.infer<typeof getAdminComplaintsSchema>['query'];

export type AdminComplaintParams = z.infer<typeof getAdminComplaintSchema>['params'];

export type UpdateAdminComplaintStatusInput = z.infer<
  typeof updateAdminComplaintStatusSchema
>['body'];

export type UpdateAdminComplaintAssignmentInput = z.infer<
  typeof updateAdminComplaintAssignmentSchema
>['body'];

export type UpdateAdminComplaintPriorityInput = z.infer<
  typeof updateAdminComplaintPrioritySchema
>['body'];

export type ReopenAdminComplaintInput = z.infer<typeof reopenAdminComplaintSchema>['body'];
