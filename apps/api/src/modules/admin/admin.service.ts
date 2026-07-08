import {
  AccountStatus,
  Prisma,
  ReviewModerationActionType,
  UserRole,
  VendorVerificationStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type {
  GetAdminReviewsQuery,
  GetAdminUsersQuery,
  ModerateAdminReviewInput,
  RejectVendorApplicationInput,
  UpdateAdminUserStatusInput,
} from './admin.schemas.js';

const adminUserListSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,

  vendor: {
    select: {
      id: true,
      businessName: true,
      slug: true,
      verificationStatus: true,
    },
  },
} satisfies Prisma.UserSelect;

const adminUserDetailSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,

  customer: true,

  vendor: {
    select: {
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
      createdAt: true,
      updatedAt: true,

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
    },
  },

  _count: {
    select: {
      createdEvents: true,
      customerReviews: true,
      moderatedReviews: true,
      reviewModerationActions: true,
      submittedPayments: true,
      reviewedPayments: true,
      notifications: true,
      submittedComplaints: true,
      receivedComplaints: true,
      assignedComplaints: true,
      complaintMessages: true,
      performedComplaintActions: true,
    },
  },
} satisfies Prisma.UserSelect;

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

const getAdminUserOrderBy = (
  sort: GetAdminUsersQuery['sort'],
): Prisma.UserOrderByWithRelationInput | Prisma.UserOrderByWithRelationInput[] => {
  switch (sort) {
    case 'oldest':
      return {
        createdAt: 'asc',
      };

    case 'name_asc':
      return [
        {
          firstName: 'asc',
        },
        {
          lastName: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'name_desc':
      return [
        {
          firstName: 'desc',
        },
        {
          lastName: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'email_asc':
      return [
        {
          email: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'email_desc':
      return [
        {
          email: 'desc',
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

export const getAdminUsers = async (query: GetAdminUsersQuery) => {
  const { page, limit, search, role, status, sort } = query;

  const where: Prisma.UserWhereInput = {
    ...(role && {
      role,
    }),

    ...(status && {
      status,
    }),

    ...(search && {
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
    }),
  };

  const skip = (page - 1) * limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: adminUserListSelect,
      orderBy: getAdminUserOrderBy(sort),
      skip,
      take: limit,
    }),

    prisma.user.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    users: users.map(({ vendor, ...user }) => ({
      ...user,
      vendorProfile: vendor,
    })),

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

export const getAdminUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: adminUserDetailSelect,
  });

  if (!user) {
    throw new AppError(404, 'User not found', 'ADMIN_USER_NOT_FOUND');
  }

  const { vendor, ...userDetails } = user;

  return {
    ...userDetails,

    vendorProfile: vendor
      ? {
          ...vendor,
          categories: vendor.categories.map(({ category }) => category),
        }
      : null,
  };
};

export const updateAdminUserStatus = async (
  adminUserId: string,
  userId: string,
  input: UpdateAdminUserStatusInput,
) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!existingUser) {
    throw new AppError(404, 'User not found', 'ADMIN_USER_NOT_FOUND');
  }

  if (existingUser.id === adminUserId) {
    throw new AppError(
      409,
      'You cannot change the status of your own administrator account',
      'ADMIN_SELF_STATUS_CHANGE_NOT_ALLOWED',
    );
  }

  if (existingUser.role === UserRole.ADMIN) {
    throw new AppError(
      403,
      'Administrator account status cannot be changed through this endpoint',
      'ADMIN_ACCOUNT_STATUS_CHANGE_FORBIDDEN',
    );
  }

  if (existingUser.status === input.status) {
    throw new AppError(
      409,
      `User account is already ${input.status.toLowerCase()}`,
      'USER_STATUS_ALREADY_SET',
    );
  }

  const allowedTransition =
    (existingUser.status === AccountStatus.ACTIVE && input.status === AccountStatus.SUSPENDED) ||
    (existingUser.status === AccountStatus.SUSPENDED && input.status === AccountStatus.ACTIVE);

  if (!allowedTransition) {
    throw new AppError(
      409,
      `User status cannot be changed from ${existingUser.status} to ${input.status}`,
      'INVALID_USER_STATUS_TRANSITION',
    );
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },

    data: {
      status: input.status,
    },

    select: adminUserListSelect,
  });

  const { vendor, ...user } = updatedUser;

  return {
    ...user,
    vendorProfile: vendor,
  };
};

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
