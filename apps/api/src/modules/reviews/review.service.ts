import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type { GetCustomerReviewsQuery, UpdateCustomerReviewInput } from './review.schemas.js';

const reviewSelect = {
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

  booking: {
    select: {
      event: {
        select: {
          id: true,
          name: true,
          eventDate: true,
        },
      },
    },
  },

  customer: {
    select: {
      id: true,
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

  createdAt: true,
  updatedAt: true,
} as const;

const getReviewOrderBy = (
  sort: GetCustomerReviewsQuery['sort'],
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

export const getCustomerReviews = async (customerId: string, query: GetCustomerReviewsQuery) => {
  const { page, limit, eventId, vendorId, overallRating, sort } = query;

  const where: Prisma.ReviewWhereInput = {
    customerId,

    ...(eventId && {
      booking: {
        eventId,
      },
    }),

    ...(vendorId && {
      vendorId,
    }),

    ...(overallRating !== undefined && {
      overallRating,
    }),
  };

  const skip = (page - 1) * limit;

  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      select: reviewSelect,
      orderBy: getReviewOrderBy(sort),
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

export const getCustomerReviewById = async (customerId: string, reviewId: string) => {
  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      customerId,
    },

    select: reviewSelect,
  });

  if (!review) {
    throw new AppError(404, 'Review not found', 'CUSTOMER_REVIEW_NOT_FOUND');
  }

  return review;
};

export const updateCustomerReview = async (
  customerId: string,
  reviewId: string,
  input: UpdateCustomerReviewInput,
) => {
  const existingReview = await prisma.review.findFirst({
    where: {
      id: reviewId,
      customerId,
    },

    select: {
      id: true,
    },
  });

  if (!existingReview) {
    throw new AppError(404, 'Review not found', 'CUSTOMER_REVIEW_NOT_FOUND');
  }

  try {
    return await prisma.review.update({
      where: {
        id: existingReview.id,
      },

      data: {
        ...(input.overallRating !== undefined && {
          overallRating: input.overallRating,
        }),

        ...(input.serviceRating !== undefined && {
          serviceRating: input.serviceRating,
        }),

        ...(input.communicationRating !== undefined && {
          communicationRating: input.communicationRating,
        }),

        ...(input.comment !== undefined && {
          comment: input.comment,
        }),
      },

      select: reviewSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new AppError(404, 'Review not found', 'CUSTOMER_REVIEW_NOT_FOUND');
    }

    throw error;
  }
};

export const deleteCustomerReview = async (customerId: string, reviewId: string) => {
  const existingReview = await prisma.review.findFirst({
    where: {
      id: reviewId,
      customerId,
    },

    select: {
      id: true,
    },
  });

  if (!existingReview) {
    throw new AppError(404, 'Review not found', 'CUSTOMER_REVIEW_NOT_FOUND');
  }

  try {
    await prisma.review.delete({
      where: {
        id: existingReview.id,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new AppError(404, 'Review not found', 'CUSTOMER_REVIEW_NOT_FOUND');
    }

    throw error;
  }
};
