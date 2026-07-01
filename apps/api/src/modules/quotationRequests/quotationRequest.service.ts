import {
  EventStatus,
  Prisma,
  QuotationRequestStatus,
  VendorVerificationStatus,
  QuotationStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
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
