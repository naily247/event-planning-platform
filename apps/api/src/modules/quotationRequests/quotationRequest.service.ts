import {
  EventStatus,
  Prisma,
  QuotationRequestStatus,
  VendorVerificationStatus,
  QuotationStatus,
  NotificationType,
} from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { createNotification } from '../notifications/notification.service.js';
import type {
  CreateQuotationRequestInput,
  CreateVendorQuotationDraftInput,
  GetCustomerQuotationRequestsQuery,
  GetVendorQuotationRequestsQuery,
  UpdateVendorQuotationDraftInput,
} from './quotationRequest.schemas.js';

const quotationRequestSelect = {
  id: true,
  requirements: true,
  responseDueAt: true,
  status: true,

  event: {
    select: {
      id: true,
      name: true,
      eventType: true,
      eventDate: true,
      location: true,
      status: true,

      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,

          customer: {
            select: {
              phone: true,
            },
          },
        },
      },
    },
  },

  vendor: {
    select: {
      id: true,
      businessName: true,
      slug: true,
      baseLocation: true,
    },
  },

  package: {
    select: {
      id: true,
      title: true,
      description: true,
      basePrice: true,

      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },

  createdAt: true,
  updatedAt: true,
} as const;

type SelectedQuotationRequest = Prisma.QuotationRequestGetPayload<{
  select: typeof quotationRequestSelect;
}>;

const formatQuotationRequest = (quotationRequest: SelectedQuotationRequest) => ({
  ...quotationRequest,

  event: {
    ...quotationRequest.event,

    owner: {
      id: quotationRequest.event.owner.id,
      firstName: quotationRequest.event.owner.firstName,
      lastName: quotationRequest.event.owner.lastName,
      email: quotationRequest.event.owner.email,
      phone: quotationRequest.event.owner.customer?.phone ?? null,
    },
  },

  package: quotationRequest.package
    ? {
        ...quotationRequest.package,
        basePrice: quotationRequest.package.basePrice?.toFixed(2) ?? null,
      }
    : null,
});

const quotationSelect = {
  id: true,
  quotationRequestId: true,
  version: true,
  status: true,
  proposedPrice: true,
  depositAmount: true,
  inclusions: true,
  exclusions: true,
  terms: true,
  expiresAt: true,
  createdAt: true,
} as const;

type SelectedQuotation = Prisma.QuotationGetPayload<{
  select: typeof quotationSelect;
}>;

const formatQuotation = (quotation: SelectedQuotation) => ({
  ...quotation,
  proposedPrice: quotation.proposedPrice.toFixed(2),
  depositAmount: quotation.depositAmount?.toFixed(2) ?? null,
});

const activeQuotationRequestStatuses: QuotationRequestStatus[] = [
  QuotationRequestStatus.SENT,
  QuotationRequestStatus.VIEWED,
  QuotationRequestStatus.CLARIFICATION_REQUESTED,
  QuotationRequestStatus.QUOTED,
  QuotationRequestStatus.ACCEPTED,
];

const getQuotationRequestOrderBy = (
  sort: GetCustomerQuotationRequestsQuery['sort'] | GetVendorQuotationRequestsQuery['sort'],
): Prisma.QuotationRequestOrderByWithRelationInput => {
  switch (sort) {
    case 'oldest':
      return {
        createdAt: 'asc',
      };

    case 'newest':
    default:
      return {
        createdAt: 'desc',
      };
  }
};

const getVendorProfileId = async (vendorUserId: string) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId: vendorUserId,
    },
    select: {
      id: true,
    },
  });

  if (!vendor) {
    throw new AppError(404, 'Vendor profile not found', 'VENDOR_PROFILE_NOT_FOUND');
  }

  return vendor.id;
};

export const getCustomerQuotationRequests = async (
  customerId: string,
  query: GetCustomerQuotationRequestsQuery,
) => {
  const { status, eventId, page, limit, sort } = query;

  const where: Prisma.QuotationRequestWhereInput = {
    event: {
      ownerId: customerId,
    },

    ...(status && {
      status,
    }),

    ...(eventId && {
      eventId,
    }),
  };

  const skip = (page - 1) * limit;

  const [quotationRequests, total] = await prisma.$transaction([
    prisma.quotationRequest.findMany({
      where,
      select: quotationRequestSelect,
      orderBy: getQuotationRequestOrderBy(sort),
      skip,
      take: limit,
    }),

    prisma.quotationRequest.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    quotationRequests: quotationRequests.map(formatQuotationRequest),

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

export const getCustomerQuotationRequestById = async (
  customerId: string,
  quotationRequestId: string,
) => {
  const quotationRequest = await prisma.quotationRequest.findFirst({
    where: {
      id: quotationRequestId,

      event: {
        ownerId: customerId,
      },
    },
    select: quotationRequestSelect,
  });

  if (!quotationRequest) {
    throw new AppError(404, 'Quotation request not found', 'QUOTATION_REQUEST_NOT_FOUND');
  }

  return formatQuotationRequest(quotationRequest);
};

export const getCustomerQuotations = async (customerId: string, quotationRequestId: string) => {
  const quotationRequest = await prisma.quotationRequest.findFirst({
    where: {
      id: quotationRequestId,

      event: {
        ownerId: customerId,
      },
    },
    select: {
      quotations: {
        where: {
          status: {
            not: QuotationStatus.DRAFT,
          },
        },
        select: quotationSelect,
        orderBy: {
          version: 'desc',
        },
      },
    },
  });

  if (!quotationRequest) {
    throw new AppError(404, 'Quotation request not found', 'QUOTATION_REQUEST_NOT_FOUND');
  }

  return quotationRequest.quotations.map(formatQuotation);
};

export const acceptCustomerQuotation = async (
  customerId: string,
  quotationRequestId: string,
  quotationId: string,
) => {
  const quotationRequest = await prisma.quotationRequest.findFirst({
    where: {
      id: quotationRequestId,

      event: {
        ownerId: customerId,
      },
    },
    select: {
      id: true,
      status: true,
      vendorId: true,
      packageId: true,

      event: {
        select: {
          id: true,
          name: true,
        },
      },

      vendor: {
        select: {
          userId: true,
          businessName: true,
        },
      },

      package: {
        select: {
          title: true,
        },
      },

      quotations: {
        where: {
          id: quotationId,
        },
        select: quotationSelect,
        take: 1,
      },
    },
  });

  if (!quotationRequest) {
    throw new AppError(404, 'Quotation request not found', 'QUOTATION_REQUEST_NOT_FOUND');
  }

  const quotation = quotationRequest.quotations[0];

  if (!quotation) {
    throw new AppError(404, 'Quotation not found', 'QUOTATION_NOT_FOUND');
  }

  if (quotationRequest.status !== QuotationRequestStatus.QUOTED) {
    throw new AppError(
      409,
      'The quotation request cannot accept a quotation',
      'QUOTATION_REQUEST_CANNOT_BE_ACCEPTED',
    );
  }

  if (quotation.status !== QuotationStatus.SENT) {
    throw new AppError(
      409,
      'Only a sent quotation can be accepted',
      'QUOTATION_CANNOT_BE_ACCEPTED',
    );
  }

  if (quotation.expiresAt && quotation.expiresAt.getTime() <= Date.now()) {
    throw new AppError(409, 'The quotation has expired', 'QUOTATION_EXPIRED');
  }

  const acceptedQuotation = await prisma.$transaction(async (transaction) => {
    const quotationUpdate = await transaction.quotation.updateMany({
      where: {
        id: quotation.id,
        quotationRequestId: quotationRequest.id,
        status: QuotationStatus.SENT,
      },
      data: {
        status: QuotationStatus.ACCEPTED,
      },
    });

    if (quotationUpdate.count !== 1) {
      throw new AppError(
        409,
        'The quotation can no longer be accepted',
        'QUOTATION_CANNOT_BE_ACCEPTED',
      );
    }

    const quotationRequestUpdate = await transaction.quotationRequest.updateMany({
      where: {
        id: quotationRequest.id,
        status: QuotationRequestStatus.QUOTED,
      },
      data: {
        status: QuotationRequestStatus.ACCEPTED,
      },
    });

    if (quotationRequestUpdate.count !== 1) {
      throw new AppError(
        409,
        'The quotation request can no longer accept a quotation',
        'QUOTATION_REQUEST_CANNOT_BE_ACCEPTED',
      );
    }

    await transaction.quotation.updateMany({
      where: {
        quotationRequestId: quotationRequest.id,
        id: {
          not: quotation.id,
        },
        status: {
          in: [
            QuotationStatus.SENT,
            QuotationStatus.VIEWED,
            QuotationStatus.CLARIFICATION_REQUESTED,
            QuotationStatus.REVISED,
          ],
        },
      },
      data: {
        status: QuotationStatus.REJECTED,
      },
    });

    const updatedQuotation = await transaction.quotation.findUniqueOrThrow({
      where: {
        id: quotation.id,
      },
      select: quotationSelect,
    });

    await createNotification(
      {
        recipientId: quotationRequest.vendor.userId,
        type: NotificationType.QUOTATION_ACCEPTED,
        title: 'Quotation accepted',
        message: `Your quotation for ${
          quotationRequest.package?.title ?? 'the requested service'
        } for ${quotationRequest.event.name} was accepted.`,
        entityType: 'quotation',
        entityId: updatedQuotation.id,
        metadata: {
          quotationRequestId: quotationRequest.id,
          quotationId: updatedQuotation.id,
          eventId: quotationRequest.event.id,
          vendorId: quotationRequest.vendorId,
          packageId: quotationRequest.packageId,
          status: updatedQuotation.status,
        },
      },
      transaction,
    );

    return updatedQuotation;
  });

  return formatQuotation(acceptedQuotation);
};

export const getVendorQuotationRequests = async (
  vendorUserId: string,
  query: GetVendorQuotationRequestsQuery,
) => {
  const vendorId = await getVendorProfileId(vendorUserId);
  const { status, page, limit, sort } = query;

  const where: Prisma.QuotationRequestWhereInput = {
    vendorId,

    ...(status && {
      status,
    }),
  };

  const skip = (page - 1) * limit;

  const [quotationRequests, total] = await prisma.$transaction([
    prisma.quotationRequest.findMany({
      where,
      select: quotationRequestSelect,
      orderBy: getQuotationRequestOrderBy(sort),
      skip,
      take: limit,
    }),

    prisma.quotationRequest.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    quotationRequests: quotationRequests.map(formatQuotationRequest),

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

export const getVendorQuotationRequestById = async (
  vendorUserId: string,
  quotationRequestId: string,
) => {
  const vendorId = await getVendorProfileId(vendorUserId);

  const quotationRequest = await prisma.quotationRequest.findFirst({
    where: {
      id: quotationRequestId,
      vendorId,
    },
    select: quotationRequestSelect,
  });

  if (!quotationRequest) {
    throw new AppError(404, 'Quotation request not found', 'QUOTATION_REQUEST_NOT_FOUND');
  }

  return formatQuotationRequest(quotationRequest);
};

export const markVendorQuotationRequestViewed = async (
  vendorUserId: string,
  quotationRequestId: string,
) => {
  const vendorId = await getVendorProfileId(vendorUserId);

  const quotationRequest = await prisma.quotationRequest.findFirst({
    where: {
      id: quotationRequestId,
      vendorId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!quotationRequest) {
    throw new AppError(404, 'Quotation request not found', 'QUOTATION_REQUEST_NOT_FOUND');
  }

  if (quotationRequest.status !== QuotationRequestStatus.SENT) {
    throw new AppError(
      409,
      'Only sent quotation requests can be marked as viewed',
      'QUOTATION_REQUEST_CANNOT_BE_MARKED_VIEWED',
    );
  }

  const updatedQuotationRequest = await prisma.quotationRequest.update({
    where: {
      id: quotationRequest.id,
    },
    data: {
      status: QuotationRequestStatus.VIEWED,
    },
    select: quotationRequestSelect,
  });

  return formatQuotationRequest(updatedQuotationRequest);
};

export const createVendorQuotationDraft = async (
  vendorUserId: string,
  quotationRequestId: string,
  input: CreateVendorQuotationDraftInput,
) => {
  const vendorId = await getVendorProfileId(vendorUserId);

  const quotationRequest = await prisma.quotationRequest.findFirst({
    where: {
      id: quotationRequestId,
      vendorId,
    },
    select: {
      id: true,
      status: true,
      responseDueAt: true,

      event: {
        select: {
          eventDate: true,
        },
      },

      quotations: {
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!quotationRequest) {
    throw new AppError(404, 'Quotation request not found', 'QUOTATION_REQUEST_NOT_FOUND');
  }

  if (
    quotationRequest.status !== QuotationRequestStatus.SENT &&
    quotationRequest.status !== QuotationRequestStatus.VIEWED
  ) {
    throw new AppError(
      409,
      'A quotation draft cannot be created for this quotation request',
      'QUOTATION_DRAFT_CANNOT_BE_CREATED',
    );
  }

  if (quotationRequest.responseDueAt && quotationRequest.responseDueAt.getTime() <= Date.now()) {
    throw new AppError(
      409,
      'The quotation response deadline has passed',
      'QUOTATION_RESPONSE_DEADLINE_PASSED',
    );
  }

  if (quotationRequest.quotations.length > 0) {
    throw new AppError(
      409,
      'A quotation already exists for this quotation request',
      'QUOTATION_ALREADY_EXISTS',
    );
  }

  if (
    input.expiresAt !== undefined &&
    input.expiresAt !== null &&
    new Date(input.expiresAt).getTime() >= quotationRequest.event.eventDate.getTime()
  ) {
    throw new AppError(
      400,
      'Quotation expiry must be before the event date',
      'INVALID_QUOTATION_EXPIRY',
    );
  }

  const quotation = await prisma.quotation.create({
    data: {
      quotationRequestId: quotationRequest.id,
      version: 1,
      status: QuotationStatus.DRAFT,
      proposedPrice: new Prisma.Decimal(input.proposedPrice),
      depositAmount:
        input.depositAmount === undefined || input.depositAmount === null
          ? null
          : new Prisma.Decimal(input.depositAmount),
      inclusions: input.inclusions,
      exclusions: input.exclusions ?? null,
      terms: input.terms ?? null,
      expiresAt:
        input.expiresAt === undefined || input.expiresAt === null
          ? null
          : new Date(input.expiresAt),
    },
    select: quotationSelect,
  });

  return formatQuotation(quotation);
};

export const getVendorQuotationDraft = async (vendorUserId: string, quotationRequestId: string) => {
  const vendorId = await getVendorProfileId(vendorUserId);

  const quotation = await prisma.quotation.findFirst({
    where: {
      quotationRequestId,
      status: QuotationStatus.DRAFT,

      quotationRequest: {
        vendorId,
      },
    },
    select: quotationSelect,
  });

  if (!quotation) {
    throw new AppError(404, 'Quotation draft not found', 'QUOTATION_DRAFT_NOT_FOUND');
  }

  return formatQuotation(quotation);
};

export const updateVendorQuotationDraft = async (
  vendorUserId: string,
  quotationRequestId: string,
  input: UpdateVendorQuotationDraftInput,
) => {
  const vendorId = await getVendorProfileId(vendorUserId);

  const quotation = await prisma.quotation.findFirst({
    where: {
      quotationRequestId,

      quotationRequest: {
        vendorId,
      },
    },
    select: {
      id: true,
      status: true,
      proposedPrice: true,
      depositAmount: true,

      quotationRequest: {
        select: {
          responseDueAt: true,

          event: {
            select: {
              eventDate: true,
            },
          },
        },
      },
    },
  });

  if (!quotation) {
    throw new AppError(404, 'Quotation draft not found', 'QUOTATION_DRAFT_NOT_FOUND');
  }

  if (quotation.status !== QuotationStatus.DRAFT) {
    throw new AppError(
      409,
      'Only draft quotations can be updated',
      'QUOTATION_DRAFT_CANNOT_BE_UPDATED',
    );
  }

  if (
    quotation.quotationRequest.responseDueAt &&
    quotation.quotationRequest.responseDueAt.getTime() <= Date.now()
  ) {
    throw new AppError(
      409,
      'The quotation response deadline has passed',
      'QUOTATION_RESPONSE_DEADLINE_PASSED',
    );
  }

  const proposedPrice =
    input.proposedPrice === undefined
      ? quotation.proposedPrice
      : new Prisma.Decimal(input.proposedPrice);

  const depositAmount =
    input.depositAmount === undefined
      ? quotation.depositAmount
      : input.depositAmount === null
        ? null
        : new Prisma.Decimal(input.depositAmount);

  if (depositAmount && depositAmount.greaterThan(proposedPrice)) {
    throw new AppError(
      400,
      'Deposit amount cannot exceed the proposed price',
      'INVALID_QUOTATION_DEPOSIT',
    );
  }

  if (
    input.expiresAt !== undefined &&
    input.expiresAt !== null &&
    new Date(input.expiresAt).getTime() >= quotation.quotationRequest.event.eventDate.getTime()
  ) {
    throw new AppError(
      400,
      'Quotation expiry must be before the event date',
      'INVALID_QUOTATION_EXPIRY',
    );
  }

  const updatedQuotation = await prisma.quotation.update({
    where: {
      id: quotation.id,
    },
    data: {
      ...(input.proposedPrice !== undefined && {
        proposedPrice: new Prisma.Decimal(input.proposedPrice),
      }),

      ...(input.depositAmount !== undefined && {
        depositAmount:
          input.depositAmount === null ? null : new Prisma.Decimal(input.depositAmount),
      }),

      ...(input.inclusions !== undefined && {
        inclusions: input.inclusions,
      }),

      ...(input.exclusions !== undefined && {
        exclusions: input.exclusions,
      }),

      ...(input.terms !== undefined && {
        terms: input.terms,
      }),

      ...(input.expiresAt !== undefined && {
        expiresAt: input.expiresAt === null ? null : new Date(input.expiresAt),
      }),
    },
    select: quotationSelect,
  });

  return formatQuotation(updatedQuotation);
};

export const sendVendorQuotationDraft = async (
  vendorUserId: string,
  quotationRequestId: string,
) => {
  const vendorId = await getVendorProfileId(vendorUserId);

  const quotationRequest = await prisma.quotationRequest.findFirst({
    where: {
      id: quotationRequestId,
      vendorId,
    },
    select: {
      id: true,
      status: true,
      responseDueAt: true,
      vendorId: true,
      packageId: true,

      event: {
        select: {
          id: true,
          name: true,

          owner: {
            select: {
              id: true,
            },
          },
        },
      },

      vendor: {
        select: {
          businessName: true,
        },
      },

      package: {
        select: {
          title: true,
        },
      },

      quotations: {
        select: quotationSelect,
        orderBy: {
          version: 'desc',
        },
        take: 1,
      },
    },
  });

  if (!quotationRequest) {
    throw new AppError(404, 'Quotation request not found', 'QUOTATION_REQUEST_NOT_FOUND');
  }

  const quotation = quotationRequest.quotations[0];

  if (!quotation) {
    throw new AppError(404, 'Quotation draft not found', 'QUOTATION_DRAFT_NOT_FOUND');
  }

  if (quotation.status !== QuotationStatus.DRAFT) {
    throw new AppError(409, 'Only draft quotations can be sent', 'QUOTATION_DRAFT_CANNOT_BE_SENT');
  }

  if (
    quotationRequest.status !== QuotationRequestStatus.SENT &&
    quotationRequest.status !== QuotationRequestStatus.VIEWED
  ) {
    throw new AppError(
      409,
      'The quotation request cannot receive a quotation',
      'QUOTATION_REQUEST_CANNOT_BE_QUOTED',
    );
  }

  if (quotationRequest.responseDueAt && quotationRequest.responseDueAt.getTime() <= Date.now()) {
    throw new AppError(
      409,
      'The quotation response deadline has passed',
      'QUOTATION_RESPONSE_DEADLINE_PASSED',
    );
  }

  if (quotation.expiresAt && quotation.expiresAt.getTime() <= Date.now()) {
    throw new AppError(409, 'The quotation draft has already expired', 'QUOTATION_DRAFT_EXPIRED');
  }

  const sentQuotation = await prisma.$transaction(async (transaction) => {
    const updatedQuotation = await transaction.quotation.update({
      where: {
        id: quotation.id,
      },
      data: {
        status: QuotationStatus.SENT,
      },
      select: quotationSelect,
    });

    await transaction.quotationRequest.update({
      where: {
        id: quotationRequest.id,
      },
      data: {
        status: QuotationRequestStatus.QUOTED,
      },
    });

    await createNotification(
      {
        recipientId: quotationRequest.event.owner.id,
        type: NotificationType.QUOTATION_SENT,
        title: 'New quotation received',
        message: `${quotationRequest.vendor.businessName} sent you a quotation for ${
          quotationRequest.package?.title ?? 'the requested service'
        } for ${quotationRequest.event.name}.`,
        entityType: 'quotation',
        entityId: updatedQuotation.id,
        metadata: {
          quotationRequestId: quotationRequest.id,
          quotationId: updatedQuotation.id,
          eventId: quotationRequest.event.id,
          vendorId: quotationRequest.vendorId,
          packageId: quotationRequest.packageId,
          status: updatedQuotation.status,
        },
      },
      transaction,
    );

    return updatedQuotation;
  });

  return formatQuotation(sentQuotation);
};

export const createCustomerQuotationRequest = async (
  customerId: string,
  input: CreateQuotationRequestInput,
) => {
  const event = await prisma.event.findFirst({
    where: {
      id: input.eventId,
      ownerId: customerId,
    },
    select: {
      id: true,
      name: true,
      status: true,
      eventDate: true,
    },
  });

  if (!event) {
    throw new AppError(404, 'Event not found', 'EVENT_NOT_FOUND');
  }

  if (event.status !== EventStatus.PLANNING && event.status !== EventStatus.ACTIVE) {
    throw new AppError(
      409,
      'Quotation requests can only be created for planning or active events',
      'EVENT_NOT_AVAILABLE_FOR_QUOTATION_REQUEST',
    );
  }

  const servicePackage = await prisma.servicePackage.findFirst({
    where: {
      id: input.packageId,
      isActive: true,

      vendor: {
        verificationStatus: VendorVerificationStatus.APPROVED,
      },
    },
    select: {
      id: true,
      title: true,
      vendorId: true,

      vendor: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!servicePackage) {
    throw new AppError(404, 'Active service package not found', 'SERVICE_PACKAGE_NOT_AVAILABLE');
  }

  if (
    input.responseDueAt !== undefined &&
    input.responseDueAt !== null &&
    new Date(input.responseDueAt).getTime() >= event.eventDate.getTime()
  ) {
    throw new AppError(
      400,
      'Response deadline must be before the event date',
      'INVALID_QUOTATION_RESPONSE_DEADLINE',
    );
  }

  const duplicateRequest = await prisma.quotationRequest.findFirst({
    where: {
      eventId: event.id,
      packageId: servicePackage.id,
      status: {
        in: activeQuotationRequestStatuses,
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicateRequest) {
    throw new AppError(
      409,
      'An active quotation request already exists for this event and package',
      'QUOTATION_REQUEST_ALREADY_EXISTS',
    );
  }

  const quotationRequest = await prisma.$transaction(async (transaction) => {
    const createdQuotationRequest = await transaction.quotationRequest.create({
      data: {
        eventId: event.id,
        vendorId: servicePackage.vendorId,
        packageId: servicePackage.id,
        requirements: input.requirements,
        responseDueAt:
          input.responseDueAt === undefined || input.responseDueAt === null
            ? null
            : new Date(input.responseDueAt),
      },
      select: quotationRequestSelect,
    });

    await createNotification(
      {
        recipientId: servicePackage.vendor.userId,
        type: NotificationType.QUOTATION_REQUEST_RECEIVED,
        title: 'New quotation request',
        message: `You received a quotation request for ${servicePackage.title} for ${event.name}.`,
        entityType: 'quotationRequest',
        entityId: createdQuotationRequest.id,
        metadata: {
          quotationRequestId: createdQuotationRequest.id,
          eventId: event.id,
          vendorId: servicePackage.vendorId,
          packageId: servicePackage.id,
          status: createdQuotationRequest.status,
        },
      },
      transaction,
    );

    return createdQuotationRequest;
  });

  return formatQuotationRequest(quotationRequest);
};
