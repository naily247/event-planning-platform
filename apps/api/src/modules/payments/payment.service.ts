import { BookingStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { deleteCloudinaryAsset } from '../../services/cloudinary.service.js';
import { getStripeClient } from '../../services/stripe.service.js';
import { AppError } from '../../utils/AppError.js';
import { uploadAsset } from '../uploads/upload.service.js';
import type {
  GetPendingPaymentsQuery,
  RejectAdminPaymentInput,
  SubmitCustomerPaymentInput,
  SubmitCustomerPaymentWithProofInput,
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
  proofFileUrl: true,
  proofFilePublicId: true,
  proofFileOriginalName: true,
  proofFileMimeType: true,
  proofFileSize: true,
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

const getStripeAmountInMinorUnits = (amount: Prisma.Decimal) => {
  return Math.round(amount.toNumber() * 100);
};

const getStripeSuccessUrl = () => {
  const url = new URL(env.STRIPE_SUCCESS_URL);
  url.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
  return url.toString();
};

const getStripeCancelUrl = (bookingId: string) => {
  const url = new URL(env.STRIPE_CANCEL_URL);
  url.searchParams.set('bookingId', bookingId);
  return url.toString();
};

const getPaymentProofUploadFolder = (bookingId: string) => {
  return `event-platform/payments/${bookingId}/proofs`;
};

const getCustomerDepositBooking = async (customerId: string, bookingId: string) => {
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

      vendor: {
        select: {
          businessName: true,
        },
      },

      event: {
        select: {
          name: true,

          owner: {
            select: {
              email: true,
            },
          },
        },
      },

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

  return {
    ...booking,
    depositAmount,
  };
};

export const submitCustomerPayment = async (
  customerId: string,
  bookingId: string,
  input: SubmitCustomerPaymentInput,
) => {
  const booking = await getCustomerDepositBooking(customerId, bookingId);

  return prisma.payment.create({
    data: {
      bookingId,
      submittedById: customerId,
      amount: booking.depositAmount,
      method: input.method,
      referenceNumber: input.referenceNumber,
      status: PaymentStatus.PENDING,
    },

    select: paymentSelect,
  });
};

export const submitCustomerPaymentWithProof = async (
  customerId: string,
  bookingId: string,
  input: SubmitCustomerPaymentWithProofInput,
  file: Express.Multer.File | undefined,
) => {
  const booking = await getCustomerDepositBooking(customerId, bookingId);

  const uploadedProof = await uploadAsset({
    file,
    folder: getPaymentProofUploadFolder(bookingId),
  });

  try {
    return await prisma.payment.create({
      data: {
        bookingId,
        submittedById: customerId,
        amount: booking.depositAmount,
        method: PaymentMethod.BANK_TRANSFER,
        referenceNumber: input.referenceNumber,
        proofFileUrl: uploadedProof.fileUrl,
        proofFilePublicId: uploadedProof.filePublicId,
        proofFileOriginalName: uploadedProof.originalName,
        proofFileMimeType: uploadedProof.mimeType,
        proofFileSize: uploadedProof.fileSize,
        status: PaymentStatus.PENDING,
      },

      select: paymentSelect,
    });
  } catch (error) {
    await deleteCloudinaryAsset(uploadedProof.filePublicId).catch(() => undefined);

    throw error;
  }
};

export const createStripeCheckoutSession = async (customerId: string, bookingId: string) => {
  const stripe = getStripeClient();
  const booking = await getCustomerDepositBooking(customerId, bookingId);

  const payment = await prisma.payment.create({
    data: {
      bookingId,
      submittedById: customerId,
      amount: booking.depositAmount,
      method: PaymentMethod.STRIPE_CHECKOUT,
      referenceNumber: `stripe_pending_${randomUUID()}`,
      status: PaymentStatus.PENDING,
    },

    select: {
      id: true,
      amount: true,
    },
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: booking.event.owner.email,
      client_reference_id: payment.id,
      success_url: getStripeSuccessUrl(),
      cancel_url: getStripeCancelUrl(bookingId),

      line_items: [
        {
          quantity: 1,

          price_data: {
            currency: 'lkr',
            unit_amount: getStripeAmountInMinorUnits(booking.depositAmount),

            product_data: {
              name: `Deposit payment for ${booking.event.name}`,
              description: `Vendor: ${booking.vendor.businessName}`,
            },
          },
        },
      ],

      metadata: {
        paymentId: payment.id,
        bookingId,
        customerId,
      },
    });

    if (!session.url) {
      throw new AppError(
        502,
        'Stripe did not return a checkout URL',
        'STRIPE_CHECKOUT_URL_MISSING',
      );
    }

    const updatedPayment = await prisma.payment.update({
      where: {
        id: payment.id,
      },

      data: {
        referenceNumber: session.id,
      },

      select: paymentSelect,
    });

    return {
      payment: updatedPayment,

      checkout: {
        sessionId: session.id,
        checkoutUrl: session.url,
      },
    };
  } catch (error) {
    await prisma.payment
      .delete({
        where: {
          id: payment.id,
        },
      })
      .catch(() => undefined);

    throw error;
  }
};

export const completeStripeCheckoutPayment = async (session: Stripe.Checkout.Session) => {
  const paymentId = session.metadata?.paymentId;

  if (!paymentId) {
    return {
      processed: false,
      reason: 'MISSING_PAYMENT_METADATA',
    };
  }

  if (session.payment_status !== 'paid') {
    return {
      processed: false,
      reason: 'CHECKOUT_SESSION_NOT_PAID',
    };
  }

  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },

    select: {
      id: true,
      status: true,
      method: true,
      bookingId: true,

      booking: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!payment) {
    return {
      processed: false,
      reason: 'PAYMENT_NOT_FOUND',
    };
  }

  if (payment.method !== PaymentMethod.STRIPE_CHECKOUT) {
    return {
      processed: false,
      reason: 'PAYMENT_METHOD_NOT_STRIPE_CHECKOUT',
    };
  }

  if (payment.status === PaymentStatus.VERIFIED) {
    return {
      processed: true,
      payment: await prisma.payment.findUniqueOrThrow({
        where: {
          id: payment.id,
        },

        select: paymentSelect,
      }),
    };
  }

  if (payment.status !== PaymentStatus.PENDING) {
    return {
      processed: false,
      reason: 'PAYMENT_NOT_PENDING',
    };
  }

  if (payment.booking.status !== BookingStatus.DEPOSIT_PENDING) {
    return {
      processed: false,
      reason: 'BOOKING_NOT_AWAITING_DEPOSIT',
    };
  }

  const verifiedPayment = await prisma.$transaction(async (transaction) => {
    const reviewedAt = new Date();

    const paymentUpdate = await transaction.payment.updateMany({
      where: {
        id: payment.id,
        status: PaymentStatus.PENDING,
      },

      data: {
        status: PaymentStatus.VERIFIED,
        reviewedAt,
        rejectionReason: null,
      },
    });

    if (paymentUpdate.count === 0) {
      return transaction.payment.findUniqueOrThrow({
        where: {
          id: payment.id,
        },

        select: paymentSelect,
      });
    }

    await transaction.booking.updateMany({
      where: {
        id: payment.bookingId,
        status: BookingStatus.DEPOSIT_PENDING,
      },

      data: {
        status: BookingStatus.ACTIVE,
      },
    });

    return transaction.payment.findUniqueOrThrow({
      where: {
        id: payment.id,
      },

      select: paymentSelect,
    });
  });

  return {
    processed: true,
    payment: verifiedPayment,
  };
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
