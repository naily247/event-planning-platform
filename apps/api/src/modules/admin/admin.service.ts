import { Prisma, ReviewModerationActionType, VendorVerificationStatus } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type {
  GetAdminReviewsQuery,
  ModerateAdminReviewInput,
  RejectVendorApplicationInput,
} from './admin.schemas.js';

const pendingVendorSelect = {
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
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  rejectionReason: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      createdAt: true,
    },
  },
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
} as const;

const adminReviewListSelect = {
  id: true,
  bookingId: true,
  customerId: true,
  vendorId: true,
  packageId: true,
  overallRating: true,
  serviceRating: true,
  communicationRating: true,
  comment: true,
  isHidden: true,
  moderationReason: true,
  moderatedAt: true,
  createdAt: true,
  updatedAt: true,

  customer: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },

  vendor: {
    select: {
      id: true,
      businessName: true,
      slug: true,
    },
  },

  package: {
    select: {
      id: true,
      title: true,
    },
  },

  moderatedBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;

const adminReviewDetailSelect = {
  ...adminReviewListSelect,

  booking: {
    select: {
      id: true,
      status: true,
      serviceStart: true,
      serviceEnd: true,
    },
  },

  moderationActions: {
    select: {
      id: true,
      action: true,
      reason: true,
      createdAt: true,

      moderator: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },

    orderBy: {
      createdAt: 'desc',
    },
  },
} as const;

const getAdminReviewOrderBy = (
  sort: GetAdminReviewsQuery['sort'],
): Prisma.ReviewOrderByWithRelationInput | Prisma.ReviewOrderByWithRelationInput[] => {
  switch (sort) {
    case 'oldest':
      return {
        createdAt: 'asc',
      };

    case 'rating_highest':
      return [
        {
          overallRating: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'rating_lowest':
      return [
        {
          overallRating: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'recently_moderated':
      return [
        {
          moderatedAt: {
            sort: 'desc',
            nulls: 'last',
          },
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

const formatPendingVendor = <
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

export const getPendingVendorApplications = async () => {
  const vendors = await prisma.vendorProfile.findMany({
    where: {
      verificationStatus: VendorVerificationStatus.PENDING,
    },
    select: pendingVendorSelect,
    orderBy: {
      submittedAt: 'asc',
    },
  });

  return vendors.map(formatPendingVendor);
};

export const getVendorApplicationById = async (vendorId: string) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      id: vendorId,
      verificationStatus: {
        not: VendorVerificationStatus.DRAFT,
      },
    },
    select: pendingVendorSelect,
  });

  if (!vendor) {
    throw new AppError(404, 'Vendor application not found', 'VENDOR_APPLICATION_NOT_FOUND');
  }

  return formatPendingVendor(vendor);
};

export const approveVendorApplication = async (vendorId: string) => {
  const existingVendor = await prisma.vendorProfile.findUnique({
    where: {
      id: vendorId,
    },
    select: {
      id: true,
      verificationStatus: true,
    },
  });

  if (!existingVendor) {
    throw new AppError(404, 'Vendor application not found', 'VENDOR_APPLICATION_NOT_FOUND');
  }

  if (existingVendor.verificationStatus !== VendorVerificationStatus.PENDING) {
    throw new AppError(
      409,
      'Only pending vendor applications can be approved',
      'VENDOR_APPLICATION_NOT_PENDING',
    );
  }

  const vendor = await prisma.vendorProfile.update({
    where: {
      id: vendorId,
    },
    data: {
      verificationStatus: VendorVerificationStatus.APPROVED,
      reviewedAt: new Date(),
      rejectionReason: null,
    },
    select: pendingVendorSelect,
  });

  return formatPendingVendor(vendor);
};

export const rejectVendorApplication = async (
  vendorId: string,
  input: RejectVendorApplicationInput,
) => {
  const existingVendor = await prisma.vendorProfile.findUnique({
    where: {
      id: vendorId,
    },
    select: {
      id: true,
      verificationStatus: true,
    },
  });

  if (!existingVendor) {
    throw new AppError(404, 'Vendor application not found', 'VENDOR_APPLICATION_NOT_FOUND');
  }

  if (existingVendor.verificationStatus !== VendorVerificationStatus.PENDING) {
    throw new AppError(
      409,
      'Only pending vendor applications can be rejected',
      'VENDOR_APPLICATION_NOT_PENDING',
    );
  }

  const vendor = await prisma.vendorProfile.update({
    where: {
      id: vendorId,
    },
    data: {
      verificationStatus: VendorVerificationStatus.REJECTED,
      reviewedAt: new Date(),
      rejectionReason: input.reason,
    },
    select: pendingVendorSelect,
  });

  return formatPendingVendor(vendor);
};

export const getAdminReviews = async (query: GetAdminReviewsQuery) => {
  const { page, limit, vendorId, customerId, overallRating, visibility, sort } = query;

  const where: Prisma.ReviewWhereInput = {
    ...(vendorId && {
      vendorId,
    }),

    ...(customerId && {
      customerId,
    }),

    ...(overallRating !== undefined && {
      overallRating,
    }),

    ...(visibility === 'visible' && {
      isHidden: false,
    }),

    ...(visibility === 'hidden' && {
      isHidden: true,
    }),
  };

  const skip = (page - 1) * limit;

  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      select: adminReviewListSelect,
      orderBy: getAdminReviewOrderBy(sort),
      skip,
      take: limit,
    }),

    prisma.review.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    reviews,

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

export const getAdminReviewById = async (reviewId: string) => {
  const review = await prisma.review.findUnique({
    where: {
      id: reviewId,
    },
    select: adminReviewDetailSelect,
  });

  if (!review) {
    throw new AppError(404, 'Review not found', 'ADMIN_REVIEW_NOT_FOUND');
  }

  return review;
};

export const moderateAdminReview = async (
  adminUserId: string,
  reviewId: string,
  input: ModerateAdminReviewInput,
) => {
  const existingReview = await prisma.review.findUnique({
    where: {
      id: reviewId,
    },
    select: {
      id: true,
      isHidden: true,
    },
  });

  if (!existingReview) {
    throw new AppError(404, 'Review not found', 'ADMIN_REVIEW_NOT_FOUND');
  }

  if (input.action === 'HIDE' && existingReview.isHidden) {
    throw new AppError(409, 'Review is already hidden', 'REVIEW_ALREADY_HIDDEN');
  }

  if (input.action === 'RESTORE' && !existingReview.isHidden) {
    throw new AppError(409, 'Review is already visible', 'REVIEW_ALREADY_VISIBLE');
  }

  const moderatedAt = new Date();

  const moderationAction =
    input.action === 'HIDE'
      ? ReviewModerationActionType.HIDDEN
      : ReviewModerationActionType.RESTORED;

  return prisma.$transaction(async (transaction) => {
    await transaction.review.update({
      where: {
        id: reviewId,
      },

      data: {
        isHidden: input.action === 'HIDE',
        moderationReason: input.reason,
        moderatedAt,
        moderatedById: adminUserId,
      },
    });

    await transaction.reviewModerationAction.create({
      data: {
        reviewId,
        moderatorId: adminUserId,
        action: moderationAction,
        reason: input.reason,
        createdAt: moderatedAt,
      },
    });

    return transaction.review.findUniqueOrThrow({
      where: {
        id: reviewId,
      },
      select: adminReviewDetailSelect,
    });
  });
};
