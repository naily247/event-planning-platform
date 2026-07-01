import {
  EventStatus,
  Prisma,
  QuotationRequestStatus,
  VendorVerificationStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type {
  CreateQuotationRequestInput,
  GetCustomerQuotationRequestsQuery,
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

  package: quotationRequest.package
    ? {
        ...quotationRequest.package,
        basePrice: quotationRequest.package.basePrice?.toFixed(2) ?? null,
      }
    : null,
});

const activeQuotationRequestStatuses: QuotationRequestStatus[] = [
  QuotationRequestStatus.SENT,
  QuotationRequestStatus.VIEWED,
  QuotationRequestStatus.CLARIFICATION_REQUESTED,
  QuotationRequestStatus.QUOTED,
];

const getCustomerQuotationRequestOrderBy = (
  sort: GetCustomerQuotationRequestsQuery['sort'],
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
      orderBy: getCustomerQuotationRequestOrderBy(sort),
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
      vendorId: true,
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

  const quotationRequest = await prisma.quotationRequest.create({
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

  return formatQuotationRequest(quotationRequest);
};
