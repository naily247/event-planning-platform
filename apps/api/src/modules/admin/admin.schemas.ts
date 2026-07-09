import {
  AccountStatus,
  BookingStatus,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintType,
  EventStatus,
  PaymentMethod,
  PaymentStatus,
  ReviewModerationActionType,
  UserRole,
  VendorVerificationStatus,
} from '@prisma/client';
import { z } from 'zod';

const cuidSchema = z.string().cuid();

const optionalTrimmedSearchSchema = z.string().trim().min(1).max(100).optional();

const paginationQuerySchema = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const dateRangeQuerySchema = {
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
};

const validateDateRange = (
  query: {
    from?: Date;
    to?: Date;
  },
  ctx: z.RefinementCtx,
) => {
  if (query.from && query.to && query.from > query.to) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['to'],
      message: 'The end date must be after or equal to the start date',
    });
  }
};

export const getAdminUsersSchema = z.object({
  query: z
    .object({
      ...paginationQuerySchema,
      search: optionalTrimmedSearchSchema,
      role: z.nativeEnum(UserRole).optional(),
      status: z.nativeEnum(AccountStatus).optional(),
      sort: z
        .enum(['newest', 'oldest', 'name_asc', 'name_desc', 'email_asc', 'email_desc'])
        .default('newest'),
    })
    .strict(),
});

export const getAdminUserByIdSchema = z.object({
  params: z
    .object({
      userId: cuidSchema,
    })
    .strict(),
});

export const updateAdminUserStatusSchema = z.object({
  params: z
    .object({
      userId: cuidSchema,
    })
    .strict(),

  body: z
    .object({
      status: z.enum([AccountStatus.ACTIVE, AccountStatus.SUSPENDED]),
      reason: z.string().trim().min(10).max(500).optional(),
    })
    .strict()
    .superRefine((body, ctx) => {
      if (body.status === AccountStatus.SUSPENDED && !body.reason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reason'],
          message: 'Suspension reason is required',
        });
      }
    }),
});

export const getAdminDashboardSummarySchema = z.object({
  query: z
    .object({
      recentLimit: z.coerce.number().int().min(1).max(20).default(5),
    })
    .strict()
    .default({}),
});

export const getAdminUserReportSchema = z.object({
  query: z
    .object({
      ...dateRangeQuerySchema,
      role: z.nativeEnum(UserRole).optional(),
      status: z.nativeEnum(AccountStatus).optional(),
      groupBy: z.enum(['day', 'month']).default('day'),
      recentLimit: z.coerce.number().int().min(1).max(20).default(10),
    })
    .strict()
    .default({})
    .superRefine(validateDateRange),
});

export const getAdminEventReportSchema = z.object({
  query: z
    .object({
      ...dateRangeQuerySchema,
      status: z.nativeEnum(EventStatus).optional(),
      ownerId: cuidSchema.optional(),
      eventType: z.string().trim().min(1).max(100).optional(),
      location: z.string().trim().min(1).max(150).optional(),
      groupBy: z.enum(['day', 'month']).default('day'),
      recentLimit: z.coerce.number().int().min(1).max(20).default(10),
    })
    .strict()
    .default({})
    .superRefine(validateDateRange),
});

export const getAdminVendorReportSchema = z.object({
  query: z
    .object({
      ...dateRangeQuerySchema,
      verificationStatus: z.nativeEnum(VendorVerificationStatus).optional(),
      accountStatus: z.nativeEnum(AccountStatus).optional(),
      categoryId: cuidSchema.optional(),
      groupBy: z.enum(['day', 'month']).default('day'),
      recentLimit: z.coerce.number().int().min(1).max(20).default(10),
    })
    .strict()
    .default({})
    .superRefine(validateDateRange),
});

export const getAdminBookingReportSchema = z.object({
  query: z
    .object({
      ...dateRangeQuerySchema,
      status: z.nativeEnum(BookingStatus).optional(),
      vendorId: cuidSchema.optional(),
      customerId: cuidSchema.optional(),
      eventId: cuidSchema.optional(),
      groupBy: z.enum(['day', 'month']).default('day'),
      recentLimit: z.coerce.number().int().min(1).max(20).default(10),
    })
    .strict()
    .default({})
    .superRefine(validateDateRange),
});

export const getAdminPaymentReportSchema = z.object({
  query: z
    .object({
      ...dateRangeQuerySchema,
      status: z.nativeEnum(PaymentStatus).optional(),
      method: z.nativeEnum(PaymentMethod).optional(),
      vendorId: cuidSchema.optional(),
      customerId: cuidSchema.optional(),
      bookingId: cuidSchema.optional(),
      groupBy: z.enum(['day', 'month']).default('day'),
      recentLimit: z.coerce.number().int().min(1).max(20).default(10),
    })
    .strict()
    .default({})
    .superRefine(validateDateRange),
});

export const getAdminRevenueReportSchema = z.object({
  query: z
    .object({
      ...dateRangeQuerySchema,
      method: z.nativeEnum(PaymentMethod).optional(),
      vendorId: cuidSchema.optional(),
      customerId: cuidSchema.optional(),
      bookingId: cuidSchema.optional(),
      groupBy: z.enum(['day', 'month']).default('day'),
      recentLimit: z.coerce.number().int().min(1).max(20).default(10),
    })
    .strict()
    .default({})
    .superRefine(validateDateRange),
});

export const getAdminComplaintReportSchema = z.object({
  query: z
    .object({
      ...dateRangeQuerySchema,
      status: z.nativeEnum(ComplaintStatus).optional(),
      type: z.nativeEnum(ComplaintType).optional(),
      priority: z.nativeEnum(ComplaintPriority).optional(),
      complainantId: cuidSchema.optional(),
      respondentId: cuidSchema.optional(),
      assignedAdminId: cuidSchema.optional(),
      assignment: z.enum(['all', 'assigned', 'unassigned']).default('all'),
      groupBy: z.enum(['day', 'month']).default('day'),
      recentLimit: z.coerce.number().int().min(1).max(20).default(10),
    })
    .strict()
    .default({})
    .superRefine(validateDateRange),
});

export const getPendingVendorApplicationsSchema = z.object({
  query: z.object({}).strict().default({}),
});

export const getVendorApplicationSchema = z.object({
  params: z
    .object({
      vendorId: z.string().trim().min(1),
    })
    .strict(),
});

export const getVendorApplicationByIdSchema = getVendorApplicationSchema;

export const approveVendorApplicationSchema = z.object({
  params: z
    .object({
      vendorId: z.string().trim().min(1),
    })
    .strict(),
});

export const rejectVendorApplicationSchema = z.object({
  params: z
    .object({
      vendorId: z.string().trim().min(1),
    })
    .strict(),

  body: z
    .object({
      reason: z.string().trim().min(10).max(1000),
    })
    .strict(),
});

export const getAdminPendingPaymentsSchema = z.object({
  query: z
    .object({
      ...paginationQuerySchema,
      status: z.nativeEnum(PaymentStatus).optional(),
      sort: z.enum(['newest', 'oldest', 'amount_highest']).default('newest'),
    })
    .strict(),
});

export const getAdminPaymentByIdSchema = z.object({
  params: z
    .object({
      paymentId: cuidSchema,
    })
    .strict(),
});

export const verifyAdminPaymentSchema = z.object({
  params: z
    .object({
      paymentId: cuidSchema,
    })
    .strict(),
});

export const rejectAdminPaymentSchema = z.object({
  params: z
    .object({
      paymentId: cuidSchema,
    })
    .strict(),

  body: z
    .object({
      reason: z.string().trim().min(10).max(1000),
    })
    .strict(),
});

export const getAdminReviewsSchema = z.object({
  query: z
    .object({
      ...paginationQuerySchema,
      search: optionalTrimmedSearchSchema,
      vendorId: cuidSchema.optional(),
      customerId: cuidSchema.optional(),
      overallRating: z.coerce.number().int().min(1).max(5).optional(),
      visibility: z.enum(['all', 'visible', 'hidden']).default('all'),
      sort: z
        .enum(['newest', 'oldest', 'rating_highest', 'rating_lowest', 'recently_moderated'])
        .default('newest'),
    })
    .strict(),
});

export const getAdminReviewByIdSchema = z.object({
  params: z
    .object({
      reviewId: cuidSchema,
    })
    .strict(),
});

export const moderateAdminReviewSchema = z.object({
  params: z
    .object({
      reviewId: cuidSchema,
    })
    .strict(),

  body: z
    .object({
      action: z.enum(['HIDE', 'RESTORE']),
      reason: z.string().trim().min(10).max(1000),
    })
    .strict(),
});

export type GetAdminUsersQuery = z.infer<typeof getAdminUsersSchema>['query'];

export type GetAdminUserByIdParams = z.infer<typeof getAdminUserByIdSchema>['params'];

export type UpdateAdminUserStatusParams = z.infer<typeof updateAdminUserStatusSchema>['params'];

export type UpdateAdminUserStatusInput = z.infer<typeof updateAdminUserStatusSchema>['body'];

export type GetAdminDashboardSummaryQuery = z.infer<typeof getAdminDashboardSummarySchema>['query'];

export type GetAdminUserReportQuery = z.infer<typeof getAdminUserReportSchema>['query'];

export type GetAdminEventReportQuery = z.infer<typeof getAdminEventReportSchema>['query'];

export type GetAdminVendorReportQuery = z.infer<typeof getAdminVendorReportSchema>['query'];

export type GetAdminBookingReportQuery = z.infer<typeof getAdminBookingReportSchema>['query'];

export type GetAdminPaymentReportQuery = z.infer<typeof getAdminPaymentReportSchema>['query'];

export type GetAdminRevenueReportQuery = z.infer<typeof getAdminRevenueReportSchema>['query'];

export type GetAdminComplaintReportQuery = z.infer<typeof getAdminComplaintReportSchema>['query'];

export type GetPendingVendorApplicationsQuery = z.infer<typeof getPendingVendorApplicationsSchema>['query'];

export type GetVendorApplicationParams = z.infer<typeof getVendorApplicationSchema>['params'];

export type GetVendorApplicationByIdParams = z.infer<typeof getVendorApplicationByIdSchema>['params'];

export type ApproveVendorApplicationParams = z.infer<typeof approveVendorApplicationSchema>['params'];

export type RejectVendorApplicationParams = z.infer<typeof rejectVendorApplicationSchema>['params'];

export type RejectVendorApplicationInput = z.infer<typeof rejectVendorApplicationSchema>['body'];

export type GetAdminPendingPaymentsQuery = z.infer<typeof getAdminPendingPaymentsSchema>['query'];

export type GetAdminPaymentByIdParams = z.infer<typeof getAdminPaymentByIdSchema>['params'];

export type VerifyAdminPaymentParams = z.infer<typeof verifyAdminPaymentSchema>['params'];

export type RejectAdminPaymentParams = z.infer<typeof rejectAdminPaymentSchema>['params'];

export type RejectAdminPaymentInput = z.infer<typeof rejectAdminPaymentSchema>['body'];

export type GetAdminReviewsQuery = z.infer<typeof getAdminReviewsSchema>['query'];

export type GetAdminReviewByIdParams = z.infer<typeof getAdminReviewByIdSchema>['params'];

export type ModerateAdminReviewParams = z.infer<typeof moderateAdminReviewSchema>['params'];

export type ModerateAdminReviewInput = z.infer<typeof moderateAdminReviewSchema>['body'];

export type AdminReviewModerationAction = ReviewModerationActionType;
