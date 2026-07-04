import { BookingStatus, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type {
  GetPendingPaymentsQuery,
  RejectAdminPaymentInput,
  SubmitCustomerPaymentInput,
} from './payment.schemas.js';

const paymentSelect = {
  id: true,
  bookingId: true,
  submittedById: true,
  reviewedById: true,
  amount: true,
  status: true,
  method: true,
  referenceNumber: true,
  reviewedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,

  submittedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },

  reviewedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
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

          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },

      vendor: {
        select: {
          id: true,
          businessName: true,
          slug: true,
          contactPhone: true,
          baseLocation: true,
        },
      },

      acceptedQuotation: {
        select: {
          id: true,
          proposedPrice: true,
          depositAmount: true,
        },
      },
    },
  },
} as const;

const getPendingPaymentOrderBy = (
  sort: GetPendingPaymentsQuery['sort'],
): Prisma.PaymentOrderByWithRelationInput => {
  return {
    createdAt: sort === 'newest' ? 'desc' : 'asc',
  };
};

export const submitCustomerPayment = async (
  customerId: string,
  bookingId: string,
  input: SubmitCustomerPaymentInput,
) => {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,

      event: {
        ownerId: customerId,
      },
    },

    select: {
      id: true,
      status: true,

      acceptedQuotation: {
        select: {
          depositAmount: true,
        },
      },

      payments: {
        where: {
          status: {
            in: [PaymentStatus.PENDING, PaymentStatus.VERIFIED],
          },
        },

        select: {
          id: true,
          status: true,
        },

        take: 1,
      },
    },
  });

  if (!booking) {
    throw new AppError(404, 'Booking not found', 'CUSTOMER_BOOKING_NOT_FOUND');
  }

  if (booking.status !== BookingStatus.DEPOSIT_PENDING) {
    throw new AppError(
      409,
      'A deposit payment cannot be submitted for this booking',
      'BOOKING_NOT_AWAITING_DEPOSIT',
    );
  }

  const depositAmount = booking.acceptedQuotation.depositAmount;

  if (depositAmount === null || !depositAmount.greaterThan(0)) {
    throw new AppError(
      409,
      'This booking does not require a deposit payment',
      'BOOKING_DEPOSIT_NOT_REQUIRED',
    );
  }

  const existingPayment = booking.payments[0];

  if (existingPayment?.status === PaymentStatus.PENDING) {
    throw new AppError(
      409,
      'A deposit payment is already pending verification',
      'PAYMENT_ALREADY_PENDING',
    );
  }

  if (existingPayment?.status === PaymentStatus.VERIFIED) {
    throw new AppError(
      409,
      'The deposit payment has already been verified',
      'PAYMENT_ALREADY_VERIFIED',
    );
  }

  return prisma.payment.create({
    data: {
      bookingId,
      submittedById: customerId,
      amount: depositAmount,
      method: input.method,
      referenceNumber: input.referenceNumber,
      status: PaymentStatus.PENDING,
    },

    select: paymentSelect,
  });
};

export const getCustomerBookingPayments = async (customerId: string, bookingId: string) => {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,

      event: {
        ownerId: customerId,
      },
    },

    select: {
      id: true,
    },
  });

  if (!booking) {
    throw new AppError(404, 'Booking not found', 'CUSTOMER_BOOKING_NOT_FOUND');
  }

  return prisma.payment.findMany({
    where: {
      bookingId,
      submittedById: customerId,
    },

    select: paymentSelect,

    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const getPendingPayments = async (query: GetPendingPaymentsQuery) => {
  const { page, limit, sort } = query;

  const where: Prisma.PaymentWhereInput = {
    status: PaymentStatus.PENDING,
  };

  const skip = (page - 1) * limit;

  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      select: paymentSelect,
      orderBy: getPendingPaymentOrderBy(sort),
      skip,
      take: limit,
    }),

    prisma.payment.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    payments,

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

export const getAdminPaymentById = async (paymentId: string) => {
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },

    select: paymentSelect,
  });

  if (!payment) {
    throw new AppError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
  }

  return payment;
};

export const verifyAdminPayment = async (adminId: string, paymentId: string) => {
  return prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.findUnique({
      where: {
        id: paymentId,
      },

      select: {
        id: true,
        status: true,
        bookingId: true,

        booking: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new AppError(409, 'Only pending payments can be verified', 'PAYMENT_NOT_PENDING');
    }

    if (payment.booking.status !== BookingStatus.DEPOSIT_PENDING) {
      throw new AppError(
        409,
        'The related booking is not awaiting a deposit',
        'BOOKING_NOT_AWAITING_DEPOSIT',
      );
    }

    const reviewedAt = new Date();

    const paymentUpdate = await transaction.payment.updateMany({
      where: {
        id: paymentId,
        status: PaymentStatus.PENDING,
      },

      data: {
        status: PaymentStatus.VERIFIED,
        reviewedById: adminId,
        reviewedAt,
        rejectionReason: null,
      },
    });

    if (paymentUpdate.count === 0) {
      throw new AppError(409, 'This payment has already been reviewed', 'PAYMENT_ALREADY_REVIEWED');
    }

    const bookingUpdate = await transaction.booking.updateMany({
      where: {
        id: payment.bookingId,
        status: BookingStatus.DEPOSIT_PENDING,
      },

      data: {
        status: BookingStatus.ACTIVE,
      },
    });

    if (bookingUpdate.count === 0) {
      throw new AppError(
        409,
        'The booking is no longer awaiting a deposit',
        'BOOKING_NOT_AWAITING_DEPOSIT',
      );
    }

    return transaction.payment.findUniqueOrThrow({
      where: {
        id: paymentId,
      },

      select: paymentSelect,
    });
  });
};

export const rejectAdminPayment = async (
  adminId: string,
  paymentId: string,
  input: RejectAdminPaymentInput,
) => {
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },

    select: {
      id: true,
      status: true,
    },
  });

  if (!payment) {
    throw new AppError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
  }

  if (payment.status !== PaymentStatus.PENDING) {
    throw new AppError(409, 'Only pending payments can be rejected', 'PAYMENT_NOT_PENDING');
  }

  const updateResult = await prisma.payment.updateMany({
    where: {
      id: paymentId,
      status: PaymentStatus.PENDING,
    },

    data: {
      status: PaymentStatus.REJECTED,
      reviewedById: adminId,
      reviewedAt: new Date(),
      rejectionReason: input.reason,
    },
  });

  if (updateResult.count === 0) {
    throw new AppError(409, 'This payment has already been reviewed', 'PAYMENT_ALREADY_REVIEWED');
  }

  return prisma.payment.findUniqueOrThrow({
    where: {
      id: paymentId,
    },

    select: paymentSelect,
  });
};
