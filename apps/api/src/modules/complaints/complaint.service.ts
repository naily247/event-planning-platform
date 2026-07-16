import {
  ComplaintActionType,
  ComplaintPriority,
  ComplaintType,
  NotificationType,
  Prisma,
  UserRole,
  ComplaintStatus,
  AccountStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { createNotification } from '../notifications/notification.service.js';
import { AppError } from '../../utils/AppError.js';
import type {
  CreateComplaintInput,
  GetMyComplaintsQuery,
  AddComplaintMessageInput,
  CloseComplaintInput,
  GetAdminComplaintsQuery,
  UpdateAdminComplaintStatusInput,
  UpdateAdminComplaintAssignmentInput,
  UpdateAdminComplaintPriorityInput,
  ReopenAdminComplaintInput,
} from './complaint.schemas.js';

const complaintPartySelect = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,

  vendor: {
    select: {
      id: true,
      businessName: true,
      slug: true,
    },
  },
} as const;

const complaintSelect = {
  id: true,
  complainantId: true,
  respondentId: true,
  assignedAdminId: true,
  type: true,
  subject: true,
  description: true,
  status: true,
  priority: true,
  bookingId: true,
  paymentId: true,
  reviewId: true,
  quotationRequestId: true,
  resolutionSummary: true,
  resolvedAt: true,
  closedAt: true,

  complainant: {
    select: complaintPartySelect,
  },

  respondent: {
    select: complaintPartySelect,
  },

  assignedAdmin: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },

  booking: {
    select: {
      id: true,
      status: true,
      agreedCost: true,
      serviceStart: true,
      serviceEnd: true,

      event: {
        select: {
          id: true,
          name: true,
          eventType: true,
          eventDate: true,
          location: true,
          ownerId: true,
        },
      },

      vendor: {
        select: {
          id: true,
          userId: true,
          businessName: true,
          slug: true,
        },
      },
    },
  },

  payment: {
    select: {
      id: true,
      bookingId: true,
      amount: true,
      status: true,
      method: true,
      referenceNumber: true,
      createdAt: true,
    },
  },

  review: {
    select: {
      id: true,
      bookingId: true,
      customerId: true,
      vendorId: true,
      overallRating: true,
      comment: true,
      isHidden: true,
      createdAt: true,

      vendor: {
        select: {
          id: true,
          userId: true,
          businessName: true,
          slug: true,
        },
      },
    },
  },

  quotationRequest: {
    select: {
      id: true,
      status: true,
      requirements: true,
      responseDueAt: true,

      event: {
        select: {
          id: true,
          name: true,
          eventType: true,
          eventDate: true,
          ownerId: true,
        },
      },

      vendor: {
        select: {
          id: true,
          userId: true,
          businessName: true,
          slug: true,
        },
      },
    },
  },

  createdAt: true,
  updatedAt: true,
} as const;

const adminComplaintListSelect = {
  id: true,
  complainantId: true,
  respondentId: true,
  assignedAdminId: true,
  type: true,
  subject: true,
  status: true,
  priority: true,
  bookingId: true,
  paymentId: true,
  reviewId: true,
  quotationRequestId: true,
  resolvedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,

  complainant: {
    select: {
      ...complaintPartySelect,
      email: true,
    },
  },

  respondent: {
    select: {
      ...complaintPartySelect,
      email: true,
    },
  },

  assignedAdmin: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },

  _count: {
    select: {
      messages: true,
      actions: true,
    },
  },
} as const;

const adminComplaintDetailSelect = {
  ...complaintSelect,

  complainant: {
    select: {
      ...complaintPartySelect,
      email: true,
      status: true,
    },
  },

  respondent: {
    select: {
      ...complaintPartySelect,
      email: true,
      status: true,
    },
  },

  assignedAdmin: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
    },
  },

  messages: {
    select: {
      id: true,
      complaintId: true,
      authorId: true,
      body: true,
      isInternal: true,
      createdAt: true,

      author: {
        select: {
          ...complaintPartySelect,
          email: true,
        },
      },
    },

    orderBy: {
      createdAt: 'asc',
    },
  },

  actions: {
    select: {
      id: true,
      complaintId: true,
      performedById: true,
      action: true,
      reason: true,
      metadata: true,
      createdAt: true,

      performedBy: {
        select: {
          ...complaintPartySelect,
          email: true,
        },
      },
    },

    orderBy: {
      createdAt: 'asc',
    },
  },
} as const;

const customerVisibleComplaintActionTypes: ComplaintActionType[] = [
  ComplaintActionType.CREATED,
  ComplaintActionType.STATUS_CHANGED,
  ComplaintActionType.RESOLVED,
  ComplaintActionType.DISMISSED,
  ComplaintActionType.CLOSED,
  ComplaintActionType.REOPENED,
];

const customerComplaintDetailSelect = {
  ...complaintSelect,

  messages: {
    where: {
      isInternal: false,
    },

    select: {
      id: true,
      complaintId: true,
      authorId: true,
      body: true,
      isInternal: true,
      createdAt: true,

      author: {
        select: complaintPartySelect,
      },
    },

    orderBy: {
      createdAt: 'asc',
    },
  },

  actions: {
    where: {
      action: {
        in: customerVisibleComplaintActionTypes,
      },
    },

    select: {
      id: true,
      complaintId: true,
      performedById: true,
      action: true,
      reason: true,
      metadata: true,
      createdAt: true,

      performedBy: {
        select: complaintPartySelect,
      },
    },

    orderBy: {
      createdAt: 'asc',
    },
  },
} as const;

const complaintMessageSelect = {
  id: true,
  complaintId: true,
  authorId: true,
  body: true,
  isInternal: true,
  createdAt: true,

  author: {
    select: complaintPartySelect,
  },
} as const;

type ComplaintContext = {
  respondentId: string | null;
  bookingId?: string;
  paymentId?: string;
  reviewId?: string;
  quotationRequestId?: string;
};

const getOpposingParticipantId = (
  complainantId: string,
  customerId: string,
  vendorUserId: string,
) => {
  if (complainantId === customerId) {
    return vendorUserId;
  }

  if (complainantId === vendorUserId) {
    return customerId;
  }

  throw new AppError(404, 'Related record not found', 'COMPLAINT_RELATED_RECORD_NOT_FOUND');
};

const validateRespondent = async (
  complainantId: string,
  respondentId: string,
  transaction: Prisma.TransactionClient,
) => {
  if (respondentId === complainantId) {
    throw new AppError(
      400,
      'You cannot submit a complaint against yourself',
      'COMPLAINT_SELF_RESPONDENT',
    );
  }

  const respondent = await transaction.user.findUnique({
    where: {
      id: respondentId,
    },

    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!respondent || respondent.role === UserRole.ADMIN) {
    throw new AppError(404, 'Respondent not found', 'COMPLAINT_RESPONDENT_NOT_FOUND');
  }

  return respondent.id;
};

const resolveComplaintContext = async (
  complainantId: string,
  input: CreateComplaintInput,
  transaction: Prisma.TransactionClient,
): Promise<ComplaintContext> => {
  switch (input.type) {
    case ComplaintType.BOOKING: {
      const booking = await transaction.booking.findUnique({
        where: {
          id: input.bookingId,
        },

        select: {
          id: true,

          event: {
            select: {
              ownerId: true,
            },
          },

          vendor: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!booking) {
        throw new AppError(404, 'Booking not found', 'COMPLAINT_BOOKING_NOT_FOUND');
      }

      return {
        bookingId: booking.id,
        respondentId: getOpposingParticipantId(
          complainantId,
          booking.event.ownerId,
          booking.vendor.userId,
        ),
      };
    }

    case ComplaintType.PAYMENT: {
      const payment = await transaction.payment.findUnique({
        where: {
          id: input.paymentId,
        },

        select: {
          id: true,
          bookingId: true,

          booking: {
            select: {
              event: {
                select: {
                  ownerId: true,
                },
              },

              vendor: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new AppError(404, 'Payment not found', 'COMPLAINT_PAYMENT_NOT_FOUND');
      }

      return {
        paymentId: payment.id,
        bookingId: payment.bookingId,
        respondentId: getOpposingParticipantId(
          complainantId,
          payment.booking.event.ownerId,
          payment.booking.vendor.userId,
        ),
      };
    }

    case ComplaintType.REVIEW: {
      const review = await transaction.review.findUnique({
        where: {
          id: input.reviewId,
        },

        select: {
          id: true,
          bookingId: true,
          customerId: true,

          vendor: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!review) {
        throw new AppError(404, 'Review not found', 'COMPLAINT_REVIEW_NOT_FOUND');
      }

      return {
        reviewId: review.id,
        bookingId: review.bookingId,
        respondentId: getOpposingParticipantId(
          complainantId,
          review.customerId,
          review.vendor.userId,
        ),
      };
    }

    case ComplaintType.QUOTATION: {
      const quotationRequest = await transaction.quotationRequest.findUnique({
        where: {
          id: input.quotationRequestId,
        },

        select: {
          id: true,

          event: {
            select: {
              ownerId: true,
            },
          },

          vendor: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!quotationRequest) {
        throw new AppError(
          404,
          'Quotation request not found',
          'COMPLAINT_QUOTATION_REQUEST_NOT_FOUND',
        );
      }

      return {
        quotationRequestId: quotationRequest.id,
        respondentId: getOpposingParticipantId(
          complainantId,
          quotationRequest.event.ownerId,
          quotationRequest.vendor.userId,
        ),
      };
    }

    case ComplaintType.USER_CONDUCT:
      return {
        respondentId: await validateRespondent(complainantId, input.respondentId, transaction),
      };

    case ComplaintType.PLATFORM:
      return {
        respondentId: null,
      };

    case ComplaintType.OTHER:
      return {
        respondentId: input.respondentId
          ? await validateRespondent(complainantId, input.respondentId, transaction)
          : null,
      };
  }
};

const getComplaintOrderBy = (
  sort: GetMyComplaintsQuery['sort'],
): Prisma.ComplaintOrderByWithRelationInput => {
  switch (sort) {
    case 'oldest':
      return {
        createdAt: 'asc',
      };

    case 'priority_highest':
      return {
        priority: 'desc',
      };

    case 'priority_lowest':
      return {
        priority: 'asc',
      };

    case 'newest':
    default:
      return {
        createdAt: 'desc',
      };
  }
};

const getAdminComplaintOrderBy = (
  sort: GetAdminComplaintsQuery['sort'],
): Prisma.ComplaintOrderByWithRelationInput | Prisma.ComplaintOrderByWithRelationInput[] => {
  switch (sort) {
    case 'oldest':
      return {
        createdAt: 'asc',
      };

    case 'recently_updated':
      return [
        {
          updatedAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'priority_highest':
      return [
        {
          priority: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'priority_lowest':
      return [
        {
          priority: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'newest':
    default:
      return {
        createdAt: 'desc',
      };
  }
};

const adminComplaintStatusTransitions: Record<ComplaintStatus, readonly ComplaintStatus[]> = {
  [ComplaintStatus.OPEN]: [
    ComplaintStatus.UNDER_REVIEW,
    ComplaintStatus.UNDER_INVESTIGATION,
    ComplaintStatus.AWAITING_CUSTOMER_RESPONSE,
    ComplaintStatus.AWAITING_VENDOR_RESPONSE,
    ComplaintStatus.RESOLVED,
    ComplaintStatus.DISMISSED,
  ],

  [ComplaintStatus.UNDER_REVIEW]: [
    ComplaintStatus.UNDER_INVESTIGATION,
    ComplaintStatus.AWAITING_CUSTOMER_RESPONSE,
    ComplaintStatus.AWAITING_VENDOR_RESPONSE,
    ComplaintStatus.RESOLVED,
    ComplaintStatus.DISMISSED,
  ],

  [ComplaintStatus.UNDER_INVESTIGATION]: [
    ComplaintStatus.UNDER_REVIEW,
    ComplaintStatus.AWAITING_CUSTOMER_RESPONSE,
    ComplaintStatus.AWAITING_VENDOR_RESPONSE,
    ComplaintStatus.RESOLVED,
    ComplaintStatus.DISMISSED,
  ],

  [ComplaintStatus.AWAITING_CUSTOMER_RESPONSE]: [
    ComplaintStatus.UNDER_REVIEW,
    ComplaintStatus.UNDER_INVESTIGATION,
    ComplaintStatus.AWAITING_VENDOR_RESPONSE,
    ComplaintStatus.RESOLVED,
    ComplaintStatus.DISMISSED,
  ],

  [ComplaintStatus.AWAITING_VENDOR_RESPONSE]: [
    ComplaintStatus.UNDER_REVIEW,
    ComplaintStatus.UNDER_INVESTIGATION,
    ComplaintStatus.AWAITING_CUSTOMER_RESPONSE,
    ComplaintStatus.RESOLVED,
    ComplaintStatus.DISMISSED,
  ],

  [ComplaintStatus.RESOLVED]: [],
  [ComplaintStatus.DISMISSED]: [],
  [ComplaintStatus.CLOSED]: [],
};

const validateAdminComplaintStatusTransition = (
  currentStatus: ComplaintStatus,
  nextStatus: ComplaintStatus,
) => {
  const allowedStatuses = adminComplaintStatusTransitions[currentStatus];

  if (!allowedStatuses.includes(nextStatus)) {
    throw new AppError(
      409,
      `Complaint status cannot be changed from ${currentStatus} to ${nextStatus}`,
      'COMPLAINT_STATUS_TRANSITION_NOT_ALLOWED',
    );
  }
};

export const createComplaint = async (complainantId: string, input: CreateComplaintInput) => {
  return prisma.$transaction(async (transaction) => {
    const complainant = await transaction.user.findUnique({
      where: {
        id: complainantId,
      },

      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (
      !complainant ||
      (complainant.role !== UserRole.CUSTOMER && complainant.role !== UserRole.VENDOR)
    ) {
      throw new AppError(
        403,
        'Only customers and vendors can submit complaints',
        'COMPLAINT_SUBMISSION_FORBIDDEN',
      );
    }

    const context = await resolveComplaintContext(complainantId, input, transaction);

    const complaint = await transaction.complaint.create({
      data: {
        complainantId,
        respondentId: context.respondentId,
        type: input.type,
        subject: input.subject,
        description: input.description,
        priority: ComplaintPriority.MEDIUM,
        bookingId: context.bookingId,
        paymentId: context.paymentId,
        reviewId: context.reviewId,
        quotationRequestId: context.quotationRequestId,
      },

      select: complaintSelect,
    });

    await transaction.complaintAction.create({
      data: {
        complaintId: complaint.id,
        performedById: complainantId,
        action: ComplaintActionType.CREATED,
        reason: 'Complaint submitted',
        metadata: {
          type: complaint.type,
          status: complaint.status,
          priority: complaint.priority,
        },
      },
    });

    const administrators = await transaction.user.findMany({
      where: {
        role: UserRole.ADMIN,
        status: 'ACTIVE',
      },

      select: {
        id: true,
      },
    });

    await Promise.all(
      administrators.map((administrator) =>
        createNotification(
          {
            recipientId: administrator.id,
            type: NotificationType.COMPLAINT_CREATED,
            title: 'New complaint submitted',
            message: `A new ${complaint.type.toLowerCase()} complaint requires administrator review.`,
            entityType: 'COMPLAINT',
            entityId: complaint.id,
            metadata: {
              complaintId: complaint.id,
              complaintType: complaint.type,
              complainantId,
            },
          },
          transaction,
        ),
      ),
    );

    if (context.respondentId) {
      await createNotification(
        {
          recipientId: context.respondentId,
          type: NotificationType.COMPLAINT_CREATED,
          title: 'Complaint submitted',
          message:
            'A complaint involving your account has been submitted for administrator review.',
          entityType: 'COMPLAINT',
          entityId: complaint.id,
          metadata: {
            complaintId: complaint.id,
            complaintType: complaint.type,
          },
        },
        transaction,
      );
    }

    return complaint;
  });
};

export const getMyComplaints = async (userId: string, query: GetMyComplaintsQuery) => {
  const { page, limit, eventId, status, type, sort } = query;

  const where: Prisma.ComplaintWhereInput = {
    AND: [
      {
        OR: [
          {
            complainantId: userId,
          },
          {
            respondentId: userId,
          },
        ],
      },

      ...(eventId
        ? [
            {
              OR: [
                {
                  booking: {
                    eventId,
                  },
                },
                {
                  payment: {
                    booking: {
                      eventId,
                    },
                  },
                },
                {
                  review: {
                    booking: {
                      eventId,
                    },
                  },
                },
                {
                  quotationRequest: {
                    eventId,
                  },
                },
              ],
            } satisfies Prisma.ComplaintWhereInput,
          ]
        : []),
    ],

    ...(status && {
      status,
    }),

    ...(type && {
      type,
    }),
  };

  const skip = (page - 1) * limit;

  const [complaints, total] = await prisma.$transaction([
    prisma.complaint.findMany({
      where,
      select: complaintSelect,
      orderBy: getComplaintOrderBy(sort),
      skip,
      take: limit,
    }),

    prisma.complaint.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    complaints,

    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

export const getAdminComplaints = async (query: GetAdminComplaintsQuery) => {
  const { page, limit, search, status, type, priority, assignment, assignedAdminId, sort } = query;

  const assignmentFilter: Prisma.ComplaintWhereInput = assignedAdminId
    ? {
        assignedAdminId,
      }
    : assignment === 'assigned'
      ? {
          assignedAdminId: {
            not: null,
          },
        }
      : assignment === 'unassigned'
        ? {
            assignedAdminId: null,
          }
        : {};

  const where: Prisma.ComplaintWhereInput = {
    ...(status && {
      status,
    }),

    ...(type && {
      type,
    }),

    ...(priority && {
      priority,
    }),

    ...assignmentFilter,

    ...(search && {
      OR: [
        {
          id: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          subject: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          complainant: {
            is: {
              OR: [
                {
                  email: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  firstName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          },
        },
        {
          respondent: {
            is: {
              OR: [
                {
                  email: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  firstName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          },
        },
        {
          assignedAdmin: {
            is: {
              OR: [
                {
                  email: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  firstName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          },
        },
      ],
    }),
  };

  const skip = (page - 1) * limit;

  const [complaints, total] = await prisma.$transaction([
    prisma.complaint.findMany({
      where,
      select: adminComplaintListSelect,
      orderBy: getAdminComplaintOrderBy(sort),
      skip,
      take: limit,
    }),

    prisma.complaint.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    complaints,

    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

export const getAdminComplaintById = async (complaintId: string) => {
  const complaint = await prisma.complaint.findUnique({
    where: {
      id: complaintId,
    },

    select: adminComplaintDetailSelect,
  });

  if (!complaint) {
    throw new AppError(404, 'Complaint not found', 'COMPLAINT_NOT_FOUND');
  }

  return complaint;
};

export const updateAdminComplaintStatus = async (
  administratorId: string,
  complaintId: string,
  input: UpdateAdminComplaintStatusInput,
) => {
  return prisma.$transaction(async (transaction) => {
    const complaint = await transaction.complaint.findUnique({
      where: {
        id: complaintId,
      },

      select: {
        id: true,
        complainantId: true,
        respondentId: true,
        type: true,
        status: true,
      },
    });

    if (!complaint) {
      throw new AppError(404, 'Complaint not found', 'COMPLAINT_NOT_FOUND');
    }

    validateAdminComplaintStatusTransition(complaint.status, input.status);

    const isFinalAdministratorOutcome =
      input.status === ComplaintStatus.RESOLVED || input.status === ComplaintStatus.DISMISSED;

    const resolvedAt = isFinalAdministratorOutcome ? new Date() : null;

    await transaction.complaint.update({
      where: {
        id: complaint.id,
      },

      data: {
        status: input.status,
        resolvedAt,
        resolutionSummary:
          input.status === ComplaintStatus.RESOLVED ? input.resolutionSummary : null,
      },
    });

    await transaction.complaintAction.create({
      data: {
        complaintId: complaint.id,
        performedById: administratorId,
        action: ComplaintActionType.STATUS_CHANGED,
        reason: input.reason,
        metadata: {
          previousStatus: complaint.status,
          newStatus: input.status,
          ...(input.resolutionSummary && {
            resolutionSummary: input.resolutionSummary,
          }),
        },
      },
    });

    const participantIds = [complaint.complainantId, complaint.respondentId].filter(
      (participantId): participantId is string => Boolean(participantId),
    );

    await Promise.all(
      participantIds.map((participantId) =>
        createNotification(
          {
            recipientId: participantId,
            type: NotificationType.COMPLAINT_STATUS_CHANGED,
            title: 'Complaint status updated',
            message: `A complaint involving your account is now ${input.status
              .toLowerCase()
              .replaceAll('_', ' ')}.`,
            entityType: 'COMPLAINT',
            entityId: complaint.id,
            metadata: {
              complaintId: complaint.id,
              complaintType: complaint.type,
              previousStatus: complaint.status,
              newStatus: input.status,
              changedById: administratorId,
            },
          },
          transaction,
        ),
      ),
    );

    return transaction.complaint.findUniqueOrThrow({
      where: {
        id: complaint.id,
      },

      select: adminComplaintDetailSelect,
    });
  });
};

export const updateAdminComplaintAssignment = async (
  administratorId: string,
  complaintId: string,
  input: UpdateAdminComplaintAssignmentInput,
) => {
  return prisma.$transaction(async (transaction) => {
    const complaint = await transaction.complaint.findUnique({
      where: {
        id: complaintId,
      },

      select: {
        id: true,
        assignedAdminId: true,
        status: true,
      },
    });

    if (!complaint) {
      throw new AppError(404, 'Complaint not found', 'COMPLAINT_NOT_FOUND');
    }

    if (
      complaint.status === ComplaintStatus.RESOLVED ||
      complaint.status === ComplaintStatus.DISMISSED ||
      complaint.status === ComplaintStatus.CLOSED
    ) {
      throw new AppError(
        409,
        'Assignment cannot be changed for a completed complaint',
        'COMPLAINT_ASSIGNMENT_NOT_ALLOWED',
      );
    }

    if (complaint.assignedAdminId === input.assignedAdminId) {
      throw new AppError(
        409,
        input.assignedAdminId
          ? 'Complaint is already assigned to this administrator'
          : 'Complaint is already unassigned',
        'COMPLAINT_ASSIGNMENT_UNCHANGED',
      );
    }

    if (input.assignedAdminId) {
      const assignedAdministrator = await transaction.user.findFirst({
        where: {
          id: input.assignedAdminId,
          role: UserRole.ADMIN,
          status: AccountStatus.ACTIVE,
        },

        select: {
          id: true,
        },
      });

      if (!assignedAdministrator) {
        throw new AppError(404, 'Active administrator not found', 'COMPLAINT_ASSIGNEE_NOT_FOUND');
      }
    }

    await transaction.complaint.update({
      where: {
        id: complaint.id,
      },

      data: {
        assignedAdminId: input.assignedAdminId,
      },
    });

    await transaction.complaintAction.create({
      data: {
        complaintId: complaint.id,
        performedById: administratorId,
        action: input.assignedAdminId
          ? ComplaintActionType.ASSIGNED
          : ComplaintActionType.UNASSIGNED,
        reason: input.reason,
        metadata: {
          previousAssignedAdminId: complaint.assignedAdminId,
          newAssignedAdminId: input.assignedAdminId,
        },
      },
    });

    return transaction.complaint.findUniqueOrThrow({
      where: {
        id: complaint.id,
      },

      select: adminComplaintDetailSelect,
    });
  });
};

export const updateAdminComplaintPriority = async (
  administratorId: string,
  complaintId: string,
  input: UpdateAdminComplaintPriorityInput,
) => {
  return prisma.$transaction(async (transaction) => {
    const complaint = await transaction.complaint.findUnique({
      where: {
        id: complaintId,
      },

      select: {
        id: true,
        priority: true,
        status: true,
      },
    });

    if (!complaint) {
      throw new AppError(404, 'Complaint not found', 'COMPLAINT_NOT_FOUND');
    }

    if (
      complaint.status === ComplaintStatus.RESOLVED ||
      complaint.status === ComplaintStatus.DISMISSED ||
      complaint.status === ComplaintStatus.CLOSED
    ) {
      throw new AppError(
        409,
        'Priority cannot be changed for a completed complaint',
        'COMPLAINT_PRIORITY_CHANGE_NOT_ALLOWED',
      );
    }

    if (complaint.priority === input.priority) {
      throw new AppError(
        409,
        'Complaint already has the selected priority',
        'COMPLAINT_PRIORITY_UNCHANGED',
      );
    }

    await transaction.complaint.update({
      where: {
        id: complaint.id,
      },

      data: {
        priority: input.priority,
      },
    });

    await transaction.complaintAction.create({
      data: {
        complaintId: complaint.id,
        performedById: administratorId,
        action: ComplaintActionType.PRIORITY_CHANGED,
        reason: input.reason,
        metadata: {
          previousPriority: complaint.priority,
          newPriority: input.priority,
        },
      },
    });

    return transaction.complaint.findUniqueOrThrow({
      where: {
        id: complaint.id,
      },

      select: adminComplaintDetailSelect,
    });
  });
};

export const getComplaintById = async (userId: string, complaintId: string) => {
  const complaint = await prisma.complaint.findFirst({
    where: {
      id: complaintId,

      OR: [
        {
          complainantId: userId,
        },
        {
          respondentId: userId,
        },
      ],
    },

    select: customerComplaintDetailSelect,
  });

  if (!complaint) {
    throw new AppError(404, 'Complaint not found', 'COMPLAINT_NOT_FOUND');
  }

  return complaint;
};

export const addComplaintMessage = async (
  userId: string,
  complaintId: string,
  input: AddComplaintMessageInput,
) => {
  return prisma.$transaction(async (transaction) => {
    const complaint = await transaction.complaint.findFirst({
      where: {
        id: complaintId,

        OR: [
          {
            complainantId: userId,
          },
          {
            respondentId: userId,
          },
        ],
      },

      select: {
        id: true,
        complainantId: true,
        respondentId: true,
        status: true,
        type: true,
      },
    });

    if (!complaint) {
      throw new AppError(404, 'Complaint not found', 'COMPLAINT_NOT_FOUND');
    }

    if (
      complaint.status === ComplaintStatus.RESOLVED ||
      complaint.status === ComplaintStatus.DISMISSED ||
      complaint.status === ComplaintStatus.CLOSED
    ) {
      throw new AppError(
        409,
        'Messages cannot be added to a completed complaint',
        'COMPLAINT_MESSAGES_CLOSED',
      );
    }

    const message = await transaction.complaintMessage.create({
      data: {
        complaintId: complaint.id,
        authorId: userId,
        body: input.body,
        isInternal: false,
      },

      select: complaintMessageSelect,
    });

    const recipientId =
      userId === complaint.complainantId ? complaint.respondentId : complaint.complainantId;

    if (recipientId) {
      await createNotification(
        {
          recipientId,
          type: NotificationType.COMPLAINT_MESSAGE_RECEIVED,
          title: 'New complaint message',
          message: 'A new message has been added to a complaint involving your account.',
          entityType: 'COMPLAINT',
          entityId: complaint.id,
          metadata: {
            complaintId: complaint.id,
            complaintType: complaint.type,
            messageId: message.id,
            authorId: userId,
          },
        },
        transaction,
      );
    }

    return message;
  });
};

export const closeComplaint = async (
  userId: string,
  complaintId: string,
  input: CloseComplaintInput,
) => {
  return prisma.$transaction(async (transaction) => {
    const complaint = await transaction.complaint.findFirst({
      where: {
        id: complaintId,
        complainantId: userId,
      },

      select: {
        id: true,
        complainantId: true,
        respondentId: true,
        type: true,
        status: true,
      },
    });

    if (!complaint) {
      throw new AppError(404, 'Complaint not found', 'COMPLAINT_NOT_FOUND');
    }

    if (
      complaint.status === ComplaintStatus.RESOLVED ||
      complaint.status === ComplaintStatus.DISMISSED ||
      complaint.status === ComplaintStatus.CLOSED
    ) {
      throw new AppError(
        409,
        'This complaint can no longer be closed by the complainant',
        'COMPLAINT_CLOSE_NOT_ALLOWED',
      );
    }

    const closedAt = new Date();

    const updatedComplaint = await transaction.complaint.update({
      where: {
        id: complaint.id,
      },

      data: {
        status: ComplaintStatus.CLOSED,
        closedAt,
      },

      select: complaintSelect,
    });

    await transaction.complaintAction.create({
      data: {
        complaintId: complaint.id,
        performedById: userId,
        action: ComplaintActionType.CLOSED,
        reason: input.reason ?? 'Complaint closed by complainant',
        metadata: {
          previousStatus: complaint.status,
          newStatus: ComplaintStatus.CLOSED,
        },
      },
    });

    if (complaint.respondentId) {
      await createNotification(
        {
          recipientId: complaint.respondentId,
          type: NotificationType.COMPLAINT_STATUS_CHANGED,
          title: 'Complaint closed',
          message: 'A complaint involving your account has been closed by the complainant.',
          entityType: 'COMPLAINT',
          entityId: complaint.id,
          metadata: {
            complaintId: complaint.id,
            complaintType: complaint.type,
            previousStatus: complaint.status,
            newStatus: ComplaintStatus.CLOSED,
            closedById: userId,
          },
        },
        transaction,
      );
    }

    return updatedComplaint;
  });
};

export const reopenAdminComplaint = async (
  administratorId: string,
  complaintId: string,
  input: ReopenAdminComplaintInput,
) => {
  return prisma.$transaction(async (transaction) => {
    const complaint = await transaction.complaint.findUnique({
      where: {
        id: complaintId,
      },

      select: {
        id: true,
        complainantId: true,
        respondentId: true,
        type: true,
        status: true,
      },
    });

    if (!complaint) {
      throw new AppError(404, 'Complaint not found', 'COMPLAINT_NOT_FOUND');
    }

    const canBeReopened =
      complaint.status === ComplaintStatus.RESOLVED ||
      complaint.status === ComplaintStatus.DISMISSED ||
      complaint.status === ComplaintStatus.CLOSED;

    if (!canBeReopened) {
      throw new AppError(
        409,
        'Only completed complaints can be reopened',
        'COMPLAINT_REOPEN_NOT_ALLOWED',
      );
    }

    await transaction.complaint.update({
      where: {
        id: complaint.id,
      },

      data: {
        status: ComplaintStatus.UNDER_REVIEW,
        resolutionSummary: null,
        resolvedAt: null,
        closedAt: null,
      },
    });

    await transaction.complaintAction.create({
      data: {
        complaintId: complaint.id,
        performedById: administratorId,
        action: ComplaintActionType.REOPENED,
        reason: input.reason,
        metadata: {
          previousStatus: complaint.status,
          newStatus: ComplaintStatus.UNDER_REVIEW,
        },
      },
    });

    const participantIds = [complaint.complainantId, complaint.respondentId].filter(
      (participantId): participantId is string => Boolean(participantId),
    );

    const uniqueParticipantIds = [...new Set(participantIds)];

    await Promise.all(
      uniqueParticipantIds.map((participantId) =>
        createNotification(
          {
            recipientId: participantId,
            type: NotificationType.COMPLAINT_STATUS_CHANGED,
            title: 'Complaint reopened',
            message:
              'A complaint involving your account has been reopened for administrator review.',
            entityType: 'COMPLAINT',
            entityId: complaint.id,
            metadata: {
              complaintId: complaint.id,
              complaintType: complaint.type,
              previousStatus: complaint.status,
              newStatus: ComplaintStatus.UNDER_REVIEW,
              reopenedById: administratorId,
            },
          },
          transaction,
        ),
      ),
    );

    return transaction.complaint.findUniqueOrThrow({
      where: {
        id: complaint.id,
      },

      select: adminComplaintDetailSelect,
    });
  });
};
