import { VendorVerificationStatus, Prisma, BookingStatus } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type {
  UpdateVendorCategoriesInput,
  UpdateVendorProfileInput,
  GetPublicVendorsQuery,
  GetPublicVendorReviewsQuery,
  GetPublicVendorAvailabilityQuery,
  GetVendorAvailabilityQuery,
  CreateVendorAvailabilityBlockInput,
} from './vendor.schemas.js';

const vendorProfileSelect = {
  id: true,
  businessName: true,
  slug: true,
  description: true,
  contactPhone: true,
  website: true,
  baseLocation: true,
  serviceAreas: true,
  verificationStatus: true,
  submittedAt: true,
  reviewedAt: true,
  rejectionReason: true,
  categories: {
    select: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: {
      category: {
        name: 'asc',
      },
    },
  },
  createdAt: true,
  updatedAt: true,
} as const;

type VendorProfileDetails = {
  businessName: string;
  description: string | null;
  contactPhone: string | null;
  baseLocation: string | null;
  serviceAreas: string[];
  categories: Array<{
    category: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
};

const calculateProfileCompletion = (vendor: VendorProfileDetails) => {
  const fields = {
    businessName: vendor.businessName.trim().length >= 2,
    description: Boolean(vendor.description && vendor.description.trim().length >= 20),
    contactPhone: Boolean(vendor.contactPhone),
    baseLocation: Boolean(vendor.baseLocation),
    serviceAreas: vendor.serviceAreas.length > 0,
    categories: vendor.categories.length > 0,
  };

  const completedFields = Object.values(fields).filter(Boolean).length;
  const totalFields = Object.keys(fields).length;

  return {
    percentage: Math.round((completedFields / totalFields) * 100),
    completedFields,
    totalFields,
    fields,
  };
};

const formatVendorProfile = <
  T extends {
    categories: Array<{
      category: {
        id: string;
        name: string;
        slug: string;
      };
    }>;
  },
>(
  vendor: T,
) => ({
  ...vendor,
  categories: vendor.categories.map(({ category }) => category),
});

const ensureVendorProfileCanBeEdited = (verificationStatus: VendorVerificationStatus) => {
  if (
    verificationStatus === VendorVerificationStatus.PENDING ||
    verificationStatus === VendorVerificationStatus.APPROVED
  ) {
    throw new AppError(
      409,
      'This vendor profile cannot be edited in its current verification state',
      'VENDOR_PROFILE_LOCKED',
    );
  }
};

export const getVendorOnboardingProfile = async (userId: string) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: vendorProfileSelect,
  });

  if (!vendor) {
    throw new AppError(404, 'Vendor profile not found', 'VENDOR_PROFILE_NOT_FOUND');
  }

  return {
    profile: formatVendorProfile(vendor),
    completion: calculateProfileCompletion(vendor),
  };
};

export const updateVendorOnboardingProfile = async (
  userId: string,
  input: UpdateVendorProfileInput,
) => {
  const existingVendor = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      verificationStatus: true,
    },
  });

  if (!existingVendor) {
    throw new AppError(404, 'Vendor profile not found', 'VENDOR_PROFILE_NOT_FOUND');
  }

  ensureVendorProfileCanBeEdited(existingVendor.verificationStatus);

  const returningFromRejection =
    existingVendor.verificationStatus === VendorVerificationStatus.REJECTED;

  const vendor = await prisma.vendorProfile.update({
    where: { userId },
    data: {
      ...input,

      // Editing a rejected profile returns it to draft before resubmission.
      ...(returningFromRejection && {
        verificationStatus: VendorVerificationStatus.DRAFT,
        submittedAt: null,
        reviewedAt: null,
        rejectionReason: null,
      }),
    },
    select: vendorProfileSelect,
  });

  return {
    profile: formatVendorProfile(vendor),
    completion: calculateProfileCompletion(vendor),
  };
};

export const updateVendorCategories = async (
  userId: string,
  input: UpdateVendorCategoriesInput,
) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      verificationStatus: true,
    },
  });

  if (!vendor) {
    throw new AppError(404, 'Vendor profile not found', 'VENDOR_PROFILE_NOT_FOUND');
  }

  ensureVendorProfileCanBeEdited(vendor.verificationStatus);

  const categories = await prisma.serviceCategory.findMany({
    where: {
      id: {
        in: input.categoryIds,
      },
    },
    select: {
      id: true,
    },
  });

  if (categories.length !== input.categoryIds.length) {
    throw new AppError(
      400,
      'One or more selected service categories do not exist',
      'INVALID_SERVICE_CATEGORIES',
    );
  }

  const returningFromRejection = vendor.verificationStatus === VendorVerificationStatus.REJECTED;

  await prisma.$transaction([
    prisma.vendorCategory.deleteMany({
      where: {
        vendorId: vendor.id,
      },
    }),
    prisma.vendorCategory.createMany({
      data: input.categoryIds.map((categoryId) => ({
        vendorId: vendor.id,
        categoryId,
      })),
    }),
    prisma.vendorProfile.update({
      where: {
        id: vendor.id,
      },
      data: {
        ...(returningFromRejection && {
          verificationStatus: VendorVerificationStatus.DRAFT,
          submittedAt: null,
          reviewedAt: null,
          rejectionReason: null,
        }),
      },
    }),
  ]);

  const updatedVendor = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: vendorProfileSelect,
  });

  if (!updatedVendor) {
    throw new AppError(404, 'Vendor profile not found', 'VENDOR_PROFILE_NOT_FOUND');
  }

  return {
    profile: formatVendorProfile(updatedVendor),
    completion: calculateProfileCompletion(updatedVendor),
  };
};

export const submitVendorOnboardingProfile = async (userId: string) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: vendorProfileSelect,
  });

  if (!vendor) {
    throw new AppError(404, 'Vendor profile not found', 'VENDOR_PROFILE_NOT_FOUND');
  }

  if (vendor.verificationStatus !== VendorVerificationStatus.DRAFT) {
    throw new AppError(
      409,
      'Only a draft vendor profile can be submitted for review',
      'VENDOR_PROFILE_NOT_SUBMITTABLE',
    );
  }

  const completion = calculateProfileCompletion(vendor);

  if (completion.percentage !== 100) {
    const incompleteFields = Object.entries(completion.fields)
      .filter(([, completed]) => !completed)
      .map(([field]) => field);

    throw new AppError(
      400,
      'Complete all required onboarding fields before submitting',
      'VENDOR_PROFILE_INCOMPLETE',
      {
        completion,
        incompleteFields,
      },
    );
  }

  const submittedVendor = await prisma.vendorProfile.update({
    where: { userId },
    data: {
      verificationStatus: VendorVerificationStatus.PENDING,
      submittedAt: new Date(),
      reviewedAt: null,
      rejectionReason: null,
    },
    select: vendorProfileSelect,
  });

  return {
    profile: formatVendorProfile(submittedVendor),
    completion: calculateProfileCompletion(submittedVendor),
  };
};

const publicVendorSelect = {
  id: true,
  businessName: true,
  slug: true,
  description: true,
  contactPhone: true,
  website: true,
  baseLocation: true,
  serviceAreas: true,
  categories: {
    select: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: {
      category: {
        name: 'asc',
      },
    },
  },
  createdAt: true,
  updatedAt: true,
} as const;

const publicVendorDetailSelect = {
  ...publicVendorSelect,
  packages: {
    where: {
      isActive: true,
    },
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
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  },
} as const;

const getPublicVendorOrderBy = (
  sort: GetPublicVendorsQuery['sort'],
): Prisma.VendorProfileOrderByWithRelationInput => {
  switch (sort) {
    case 'oldest':
      return {
        createdAt: 'asc',
      };

    case 'name_asc':
      return {
        businessName: 'asc',
      };

    case 'name_desc':
      return {
        businessName: 'desc',
      };

    case 'newest':
    default:
      return {
        createdAt: 'desc',
      };
  }
};

const getPublicVendorReviewOrderBy = (
  sort: GetPublicVendorReviewsQuery['sort'],
): Prisma.ReviewOrderByWithRelationInput => {
  switch (sort) {
    case 'oldest':
      return {
        createdAt: 'asc',
      };

    case 'rating_highest':
      return {
        overallRating: 'desc',
      };

    case 'rating_lowest':
      return {
        overallRating: 'asc',
      };

    case 'newest':
    default:
      return {
        createdAt: 'desc',
      };
  }
};

type PublicVendorRatingSummary = {
  totalReviews: number;
  averageOverallRating: number | null;
  averageServiceRating: number | null;
  averageCommunicationRating: number | null;
  ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
};

const createEmptyRatingBreakdown = (): PublicVendorRatingSummary['ratingBreakdown'] => ({
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
});

const formatAverage = (value: number | null) => (value === null ? null : Number(value.toFixed(2)));

const getPublicVendorRatingSummaries = async (
  vendorIds: string[],
): Promise<Map<string, PublicVendorRatingSummary>> => {
  const summaries = new Map<string, PublicVendorRatingSummary>();

  for (const vendorId of vendorIds) {
    summaries.set(vendorId, {
      totalReviews: 0,
      averageOverallRating: null,
      averageServiceRating: null,
      averageCommunicationRating: null,
      ratingBreakdown: createEmptyRatingBreakdown(),
    });
  }

  if (vendorIds.length === 0) {
    return summaries;
  }

  const reviews = await prisma.review.findMany({
    where: {
      vendorId: {
        in: vendorIds,
      },
      isHidden: false,
      booking: {
        status: BookingStatus.COMPLETED,
      },
    },
    select: {
      vendorId: true,
      overallRating: true,
      serviceRating: true,
      communicationRating: true,
    },
  });

  const totals = new Map<
    string,
    {
      count: number;
      overall: number;
      service: number;
      serviceCount: number;
      communication: number;
      communicationCount: number;
      ratingBreakdown: PublicVendorRatingSummary['ratingBreakdown'];
    }
  >();

  for (const review of reviews) {
    const current = totals.get(review.vendorId) ?? {
      count: 0,
      overall: 0,
      service: 0,
      serviceCount: 0,
      communication: 0,
      communicationCount: 0,
      ratingBreakdown: createEmptyRatingBreakdown(),
    };

    current.count += 1;
    current.overall += review.overallRating;

    if (review.serviceRating !== null) {
      current.service += review.serviceRating;
      current.serviceCount += 1;
    }

    if (review.communicationRating !== null) {
      current.communication += review.communicationRating;
      current.communicationCount += 1;
    }
    const rating = review.overallRating as 1 | 2 | 3 | 4 | 5;
    current.ratingBreakdown[rating] += 1;

    totals.set(review.vendorId, current);
  }

  for (const [vendorId, total] of totals) {
    summaries.set(vendorId, {
      totalReviews: total.count,
      averageOverallRating: formatAverage(total.overall / total.count),
      averageServiceRating:
        total.serviceCount === 0 ? null : formatAverage(total.service / total.serviceCount),

      averageCommunicationRating:
        total.communicationCount === 0
          ? null
          : formatAverage(total.communication / total.communicationCount),
      ratingBreakdown: total.ratingBreakdown,
    });
  }

  return summaries;
};

export const getPublicVendors = async (query: GetPublicVendorsQuery) => {
  const { search, category, location, serviceArea, page, limit, sort } = query;

  const where: Prisma.VendorProfileWhereInput = {
    verificationStatus: VendorVerificationStatus.APPROVED,

    ...(search && {
      OR: [
        {
          businessName: {
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
      ],
    }),

    ...(category && {
      categories: {
        some: {
          category: {
            slug: category,
          },
        },
      },
    }),

    ...(location && {
      baseLocation: {
        contains: location,
        mode: 'insensitive',
      },
    }),

    ...(serviceArea && {
      serviceAreas: {
        has: serviceArea,
      },
    }),
  };

  const skip = (page - 1) * limit;

  const [vendors, total] = await prisma.$transaction([
    prisma.vendorProfile.findMany({
      where,
      select: publicVendorSelect,
      orderBy: getPublicVendorOrderBy(sort),
      skip,
      take: limit,
    }),
    prisma.vendorProfile.count({
      where,
    }),
  ]);

  const ratingSummaries = await getPublicVendorRatingSummaries(vendors.map((vendor) => vendor.id));

  const totalPages = Math.ceil(total / limit);

  return {
    vendors: vendors.map((vendor) => {
      const ratingSummary = ratingSummaries.get(vendor.id);

      return {
        ...formatVendorProfile(vendor),
        averageRating: ratingSummary?.averageOverallRating ?? null,
        reviewCount: ratingSummary?.totalReviews ?? 0,
      };
    }),

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

export const getPublicVendorBySlug = async (slug: string) => {
  const vendor = await prisma.vendorProfile.findFirst({
    where: {
      slug,
      verificationStatus: VendorVerificationStatus.APPROVED,
    },
    select: publicVendorDetailSelect,
  });

  if (!vendor) {
    throw new AppError(404, 'Vendor not found', 'PUBLIC_VENDOR_NOT_FOUND');
  }

  const ratingSummaries = await getPublicVendorRatingSummaries([vendor.id]);

  const ratingSummary = ratingSummaries.get(vendor.id) ?? {
    totalReviews: 0,
    averageOverallRating: null,
    averageServiceRating: null,
    averageCommunicationRating: null,
    ratingBreakdown: createEmptyRatingBreakdown(),
  };

  return {
    ...formatVendorProfile(vendor),

    packages: vendor.packages.map((servicePackage) => ({
      ...servicePackage,
      basePrice: servicePackage.basePrice?.toFixed(2) ?? null,
    })),

    ratingSummary: {
      overallAverage: ratingSummary.averageOverallRating,
      serviceAverage: ratingSummary.averageServiceRating,
      communicationAverage: ratingSummary.averageCommunicationRating,
      reviewCount: ratingSummary.totalReviews,
      breakdown: ratingSummary.ratingBreakdown,
    },
  };
};

export const getPublicVendorReviews = async (slug: string, query: GetPublicVendorReviewsQuery) => {
  const { page, limit, sort } = query;

  const vendor = await prisma.vendorProfile.findFirst({
    where: {
      slug,
      verificationStatus: VendorVerificationStatus.APPROVED,
    },
    select: {
      id: true,
    },
  });

  if (!vendor) {
    throw new AppError(404, 'Vendor not found', 'PUBLIC_VENDOR_NOT_FOUND');
  }

  const where: Prisma.ReviewWhereInput = {
    vendorId: vendor.id,
    isHidden: false,

    booking: {
      status: BookingStatus.COMPLETED,
    },
  };

  const skip = (page - 1) * limit;

  const [reviews, aggregate, ratingGroups] = await prisma.$transaction([
    prisma.review.findMany({
      where,

      select: {
        id: true,
        overallRating: true,
        serviceRating: true,
        communicationRating: true,
        comment: true,

        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },

        package: {
          select: {
            id: true,
            title: true,
          },
        },

        createdAt: true,
        updatedAt: true,
      },

      orderBy: getPublicVendorReviewOrderBy(sort),
      skip,
      take: limit,
    }),

    prisma.review.aggregate({
      where,

      _count: {
        _all: true,
      },

      _avg: {
        overallRating: true,
        serviceRating: true,
        communicationRating: true,
      },
    }),

    prisma.review.findMany({
      where,
      select: {
        overallRating: true,
      },
    }),
  ]);

  const total = aggregate._count._all;
  const totalPages = Math.ceil(total / limit);

  const ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  for (const review of ratingGroups) {
    const rating = review.overallRating as 1 | 2 | 3 | 4 | 5;
    ratingBreakdown[rating] += 1;
  }

  const formatAverage = (value: number | null) =>
    value === null ? null : Number(value.toFixed(2));

  return {
    reviews: reviews.map((review) => ({
      id: review.id,
      overallRating: review.overallRating,
      serviceRating: review.serviceRating,
      communicationRating: review.communicationRating,
      comment: review.comment,

      customer: {
        firstName: review.customer.firstName,
        lastNameInitial: review.customer.lastName
          ? `${review.customer.lastName.charAt(0).toUpperCase()}.`
          : null,
      },

      package: review.package,

      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    })),

    summary: {
      totalReviews: total,
      averageOverallRating: formatAverage(aggregate._avg.overallRating),
      averageServiceRating: formatAverage(aggregate._avg.serviceRating),
      averageCommunicationRating: formatAverage(aggregate._avg.communicationRating),
      ratingBreakdown,
    },

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

const committedBookingStatuses: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.DEPOSIT_PENDING,
  BookingStatus.ACTIVE,
  BookingStatus.DISPUTED,
];

const availabilityBlockSelect = {
  id: true,
  startsAt: true,
  endsAt: true,
  reason: true,
  createdAt: true,
  updatedAt: true,
} as const;

const availabilityBookingSelect = {
  id: true,
  serviceStart: true,
  serviceEnd: true,
  status: true,
} as const;

const getUtcDayEnd = (date: Date) => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
};

const getEffectiveBookingEnd = (booking: { serviceStart: Date; serviceEnd: Date | null }) => {
  return booking.serviceEnd ?? getUtcDayEnd(booking.serviceStart);
};

const rangesOverlap = (firstStart: Date, firstEnd: Date, secondStart: Date, secondEnd: Date) => {
  return firstStart < secondEnd && firstEnd > secondStart;
};

const getVendorProfileIdByUserId = async (userId: string) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId,
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

const getApprovedPublicVendorId = async (slug: string) => {
  const vendor = await prisma.vendorProfile.findFirst({
    where: {
      slug,
      verificationStatus: VendorVerificationStatus.APPROVED,
    },
    select: {
      id: true,
    },
  });

  if (!vendor) {
    throw new AppError(404, 'Vendor not found', 'PUBLIC_VENDOR_NOT_FOUND');
  }

  return vendor.id;
};

const getAvailabilityBookings = async (vendorId: string, rangeStart: Date, rangeEnd: Date) => {
  const rangeStartUtcDay = new Date(
    Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate()),
  );

  const bookings = await prisma.booking.findMany({
    where: {
      vendorId,

      status: {
        in: committedBookingStatuses,
      },

      OR: [
        {
          serviceEnd: {
            not: null,
            gt: rangeStart,
          },

          serviceStart: {
            lt: rangeEnd,
          },
        },

        {
          serviceEnd: null,

          serviceStart: {
            gte: rangeStartUtcDay,
            lt: rangeEnd,
          },
        },
      ],
    },

    select: availabilityBookingSelect,

    orderBy: {
      serviceStart: 'asc',
    },
  });

  return bookings.filter((booking) =>
    rangesOverlap(booking.serviceStart, getEffectiveBookingEnd(booking), rangeStart, rangeEnd),
  );
};

const getAvailabilityBlocks = async (vendorId: string, rangeStart: Date, rangeEnd: Date) => {
  return prisma.vendorAvailabilityBlock.findMany({
    where: {
      vendorId,

      startsAt: {
        lt: rangeEnd,
      },

      endsAt: {
        gt: rangeStart,
      },
    },

    select: availabilityBlockSelect,

    orderBy: {
      startsAt: 'asc',
    },
  });
};

export const getVendorAvailability = async (
  vendorUserId: string,
  query: GetVendorAvailabilityQuery,
) => {
  const vendorId = await getVendorProfileIdByUserId(vendorUserId);

  const rangeStart = new Date(query.from);
  const rangeEnd = new Date(query.to);

  const [blocks, bookings] = await Promise.all([
    getAvailabilityBlocks(vendorId, rangeStart, rangeEnd),
    getAvailabilityBookings(vendorId, rangeStart, rangeEnd),
  ]);

  return {
    range: {
      from: rangeStart,
      to: rangeEnd,
    },

    blocks,

    bookings: bookings.map((booking) => ({
      id: booking.id,
      startsAt: booking.serviceStart,
      endsAt: getEffectiveBookingEnd(booking),
      originalServiceEnd: booking.serviceEnd,
      status: booking.status,
    })),
  };
};

export const getPublicVendorAvailability = async (
  slug: string,
  query: GetPublicVendorAvailabilityQuery,
) => {
  const vendorId = await getApprovedPublicVendorId(slug);

  const rangeStart = new Date(query.from);
  const rangeEnd = new Date(query.to);

  const [blocks, bookings] = await Promise.all([
    getAvailabilityBlocks(vendorId, rangeStart, rangeEnd),
    getAvailabilityBookings(vendorId, rangeStart, rangeEnd),
  ]);

  const unavailableRanges = [
    ...blocks.map((block) => ({
      startsAt: block.startsAt,
      endsAt: block.endsAt,
      source: 'VENDOR_BLOCK' as const,
    })),

    ...bookings.map((booking) => ({
      startsAt: booking.serviceStart,
      endsAt: getEffectiveBookingEnd(booking),
      source: 'BOOKING' as const,
    })),
  ].sort((first, second) => first.startsAt.getTime() - second.startsAt.getTime());

  return {
    range: {
      from: rangeStart,
      to: rangeEnd,
    },

    unavailableRanges,
  };
};

export const createVendorAvailabilityBlock = async (
  vendorUserId: string,
  input: CreateVendorAvailabilityBlockInput,
) => {
  const vendorId = await getVendorProfileIdByUserId(vendorUserId);

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  const existingBlock = await prisma.vendorAvailabilityBlock.findFirst({
    where: {
      vendorId,

      startsAt: {
        lt: endsAt,
      },

      endsAt: {
        gt: startsAt,
      },
    },

    select: {
      id: true,
    },
  });

  if (existingBlock) {
    throw new AppError(
      409,
      'This availability block overlaps an existing block',
      'AVAILABILITY_BLOCK_CONFLICT',
    );
  }

  const conflictingBookings = await getAvailabilityBookings(vendorId, startsAt, endsAt);

  if (conflictingBookings.length > 0) {
    throw new AppError(
      409,
      'This availability block overlaps a committed booking',
      'AVAILABILITY_BOOKING_CONFLICT',
    );
  }

  return prisma.vendorAvailabilityBlock.create({
    data: {
      vendorId,
      startsAt,
      endsAt,
      reason: input.reason ?? null,
    },

    select: availabilityBlockSelect,
  });
};

export const deleteVendorAvailabilityBlock = async (vendorUserId: string, blockId: string) => {
  const vendorId = await getVendorProfileIdByUserId(vendorUserId);

  const deleteResult = await prisma.vendorAvailabilityBlock.deleteMany({
    where: {
      id: blockId,
      vendorId,
    },
  });

  if (deleteResult.count === 0) {
    throw new AppError(404, 'Availability block not found', 'AVAILABILITY_BLOCK_NOT_FOUND');
  }
};
