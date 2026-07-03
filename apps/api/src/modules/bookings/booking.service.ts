import {
  BookingStatus,
  EventStatus,
  Prisma,
  QuotationRequestStatus,
  QuotationStatus,
  VendorVerificationStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type {
  CancelCustomerBookingInput,
  CancelVendorBookingInput,
  ConfirmVendorBookingInput,
  CreateCustomerBookingInput,
  GetCustomerBookingsQuery,
  GetVendorBookingsQuery,
  RejectVendorBookingInput,
  CreateCustomerBookingReviewInput,
} from './booking.schemas.js';

const bookingSelect = {
  id: true,
  agreedCost: true,
  serviceStart: true,
  serviceEnd: true,
  status: true,
  vendorResponseNote: true,
  vendorRespondedAt: true,
  customerCancellationReason: true,
  customerCancelledAt: true,
  vendorCancellationReason: true,
  vendorCancelledAt: true,
  vendorCompletedAt: true,

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
      contactPhone: true,
    },
  },

  acceptedQuotation: {
    select: {
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

      quotationRequest: {
        select: {
          id: true,
          requirements: true,
          status: true,

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
        },
      },
    },
  },

  createdAt: true,
  updatedAt: true,
} as const;

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

type SelectedBooking = Prisma.BookingGetPayload<{
  select: typeof bookingSelect;
}>;

const customerCancellableStatuses: BookingStatus[] = [
  BookingStatus.AWAITING_VENDOR_CONFIRMATION,
  BookingStatus.CONFIRMED,
  BookingStatus.DEPOSIT_PENDING,
  BookingStatus.ACTIVE,
];

const vendorCancellableStatuses: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.DEPOSIT_PENDING,
  BookingStatus.ACTIVE,
];

const formatBooking = (booking: SelectedBooking) => ({
  ...booking,

  agreedCost: booking.agreedCost.toFixed(2),

  event: {
    ...booking.event,

    owner: {
      id: booking.event.owner.id,
      firstName: booking.event.owner.firstName,
      lastName: booking.event.owner.lastName,
      email: booking.event.owner.email,
      phone: booking.event.owner.customer?.phone ?? null,
    },
  },

  acceptedQuotation: {
    ...booking.acceptedQuotation,

    proposedPrice: booking.acceptedQuotation.proposedPrice.toFixed(2),

    depositAmount:
      booking.acceptedQuotation.depositAmount?.toFixed(2) ?? null,

    quotationRequest: {
      ...booking.acceptedQuotation.quotationRequest,

      package: booking.acceptedQuotation.quotationRequest.package
        ? {
            ...booking.acceptedQuotation.quotationRequest.package,

            basePrice:
              booking.acceptedQuotation.quotationRequest.package.basePrice?.toFixed(
                2,
              ) ?? null,
          }
        : null,
    },
  },
});

const isSameUtcCalendarDate = (
  firstDate: Date,
  secondDate: Date,
) =>
  firstDate.getUTCFullYear() === secondDate.getUTCFullYear() &&
  firstDate.getUTCMonth() === secondDate.getUTCMonth() &&
  firstDate.getUTCDate() === secondDate.getUTCDate();

const committedBookingStatuses: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.DEPOSIT_PENDING,
  BookingStatus.ACTIVE,
  BookingStatus.DISPUTED,
];

const getUtcDayEnd = (date: Date): Date =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + 1,
    ),
  );

const getEffectiveBookingEnd = (
  serviceStart: Date,
  serviceEnd: Date | null,
): Date => serviceEnd ?? getUtcDayEnd(serviceStart);

const rangesOverlap = (
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
): boolean =>
  firstStart < secondEnd &&
  firstEnd > secondStart;

const ensureVendorHasNoScheduleConflict = async ({
  vendorId,
  serviceStart,
  serviceEnd,
  excludedBookingId,
}: {
  vendorId: string;
  serviceStart: Date;
  serviceEnd: Date | null;
  excludedBookingId?: string;
}): Promise<void> => {
  const effectiveServiceEnd = getEffectiveBookingEnd(
    serviceStart,
    serviceEnd,
  );

  const [availabilityBlock, possibleBookingConflicts] =
    await Promise.all([
      prisma.vendorAvailabilityBlock.findFirst({
        where: {
          vendorId,
          startsAt: {
            lt: effectiveServiceEnd,
          },
          endsAt: {
            gt: serviceStart,
          },
        },

        select: {
          id: true,
        },
      }),

      prisma.booking.findMany({
        where: {
          vendorId,
          status: {
            in: committedBookingStatuses,
          },

          ...(excludedBookingId
            ? {
                id: {
                  not: excludedBookingId,
                },
              }
            : {}),

          serviceStart: {
            lt: effectiveServiceEnd,
          },
        },

        select: {
          serviceStart: true,
          serviceEnd: true,
        },
      }),
    ]);

  const bookingConflict = possibleBookingConflicts.some(
    (booking) =>
      rangesOverlap(
        booking.serviceStart,
        getEffectiveBookingEnd(
          booking.serviceStart,
          booking.serviceEnd,
        ),
        serviceStart,
        effectiveServiceEnd,
      ),
  );

  if (availabilityBlock || bookingConflict) {
    throw new AppError(
      409,
      'The vendor is unavailable during the requested service time',
      'VENDOR_SCHEDULE_CONFLICT',
    );
  }
};

const getBookingOrderBy = (
  sort:
    | GetCustomerBookingsQuery['sort']
    | GetVendorBookingsQuery['sort'],
): Prisma.BookingOrderByWithRelationInput => {
  switch (sort) {
    case 'oldest':
      return {
        createdAt: 'asc',
      };

    case 'service_soonest':
      return {
        serviceStart: 'asc',
      };

    case 'service_latest':
      return {
        serviceStart: 'desc',
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
    throw new AppError(
      404,
      'Vendor profile not found',
      'VENDOR_PROFILE_NOT_FOUND',
    );
  }

  return vendor.id;
};

const getOwnedCustomerBooking = async (
  customerId: string,
  bookingId: string,
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
    },
  });

  if (!booking) {
    throw new AppError(
      404,
      'Booking not found',
      'CUSTOMER_BOOKING_NOT_FOUND',
    );
  }

  return booking;
};

const getOwnedVendorBooking = async (
  vendorId: string,
  bookingId: string,
) => {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      vendorId,
    },

    select: {
      id: true,
      status: true,
      serviceStart: true,
      serviceEnd: true,

      acceptedQuotation: {
        select: {
          depositAmount: true,
        },
      },
    },
  });

  if (!booking) {
    throw new AppError(
      404,
      'Booking not found',
      'VENDOR_BOOKING_NOT_FOUND',
    );
  }

  return booking;
};

const ensureBookingCanBeCancelledByCustomer = (
  status: BookingStatus,
) => {
  if (status === BookingStatus.CANCELLED) {
    throw new AppError(
      409,
      'This booking has already been cancelled',
      'BOOKING_ALREADY_CANCELLED',
    );
  }

  if (!customerCancellableStatuses.includes(status)) {
    throw new AppError(
      409,
      'This booking cannot be cancelled in its current status',
      'BOOKING_CANNOT_BE_CANCELLED',
    );
  }
};

const ensureBookingCanBeCancelledByVendor = (
  status: BookingStatus,
) => {
  if (status === BookingStatus.CANCELLED) {
    throw new AppError(
      409,
      'This booking has already been cancelled',
      'BOOKING_ALREADY_CANCELLED',
    );
  }

  if (!vendorCancellableStatuses.includes(status)) {
    throw new AppError(
      409,
      'This booking cannot be cancelled by the vendor in its current status',
      'BOOKING_CANNOT_BE_CANCELLED_BY_VENDOR',
    );
  }
};

const ensureBookingCanBeCompletedByVendor = (
  status: BookingStatus,
): void => {
  if (status === BookingStatus.COMPLETED) {
    throw new AppError(
      409,
      'This booking has already been completed.',
      'BOOKING_ALREADY_COMPLETED',
    );
  }

  if (status !== BookingStatus.ACTIVE) {
    throw new AppError(
      409,
      'Only an active booking can be completed by the vendor.',
      'BOOKING_CANNOT_BE_COMPLETED_BY_VENDOR',
    );
  }
};

const ensureBookingAwaitsVendorResponse = (
  status: BookingStatus,
) => {
  if (status !== BookingStatus.AWAITING_VENDOR_CONFIRMATION) {
    throw new AppError(
      409,
      'This booking has already received a vendor response',
      'BOOKING_ALREADY_RESPONDED',
    );
  }
};

const getUpdatedCustomerBooking = async (
  customerId: string,
  bookingId: string,
) => {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,

      event: {
        ownerId: customerId,
      },
    },

    select: bookingSelect,
  });

  if (!booking) {
    throw new AppError(
      404,
      'Booking not found',
      'CUSTOMER_BOOKING_NOT_FOUND',
    );
  }

  return formatBooking(booking);
};

const getUpdatedVendorBooking = async (
  vendorId: string,
  bookingId: string,
) => {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      vendorId,
    },

    select: bookingSelect,
  });

  if (!booking) {
    throw new AppError(
      404,
      'Booking not found',
      'VENDOR_BOOKING_NOT_FOUND',
    );
  }

  return formatBooking(booking);
};

export const getCustomerBookings = async (
  customerId: string,
  query: GetCustomerBookingsQuery,
) => {
  const { status, page, limit, sort } = query;

  const where: Prisma.BookingWhereInput = {
    event: {
      ownerId: customerId,
    },

    ...(status && {
      status,
    }),
  };

  const skip = (page - 1) * limit;

  const [bookings, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      select: bookingSelect,
      orderBy: getBookingOrderBy(sort),
      skip,
      take: limit,
    }),

    prisma.booking.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    bookings: bookings.map(formatBooking),

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

export const getCustomerBookingById = async (
  customerId: string,
  bookingId: string,
) => {
  return getUpdatedCustomerBooking(customerId, bookingId);
};

export const cancelCustomerBooking = async (
  customerId: string,
  bookingId: string,
  input: CancelCustomerBookingInput,
) => {
  const existingBooking = await getOwnedCustomerBooking(
    customerId,
    bookingId,
  );

  ensureBookingCanBeCancelledByCustomer(existingBooking.status);

  const cancellationTime = new Date();

  const updateResult = await prisma.booking.updateMany({
    where: {
      id: bookingId,

      event: {
        ownerId: customerId,
      },

      status: {
        in: customerCancellableStatuses,
      },
    },

    data: {
      status: BookingStatus.CANCELLED,
      customerCancellationReason: input.reason,
      customerCancelledAt: cancellationTime,
    },
  });

  if (updateResult.count === 0) {
    throw new AppError(
      409,
      'This booking cannot be cancelled in its current status',
      'BOOKING_CANNOT_BE_CANCELLED',
    );
  }

  return getUpdatedCustomerBooking(customerId, bookingId);
};

export const getVendorBookings = async (
  vendorUserId: string,
  query: GetVendorBookingsQuery,
) => {
  const vendorId = await getVendorProfileId(vendorUserId);

  const { status, page, limit, sort } = query;

  const where: Prisma.BookingWhereInput = {
    vendorId,

    ...(status && {
      status,
    }),
  };

  const skip = (page - 1) * limit;

  const [bookings, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      select: bookingSelect,
      orderBy: getBookingOrderBy(sort),
      skip,
      take: limit,
    }),

    prisma.booking.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    bookings: bookings.map(formatBooking),

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

export const getVendorBookingById = async (
  vendorUserId: string,
  bookingId: string,
) => {
  const vendorId = await getVendorProfileId(vendorUserId);

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      vendorId,
    },

    select: bookingSelect,
  });

  if (!booking) {
    throw new AppError(
      404,
      'Booking not found',
      'VENDOR_BOOKING_NOT_FOUND',
    );
  }

  return formatBooking(booking);
};

export const confirmVendorBooking = async (
  vendorUserId: string,
  bookingId: string,
  input: ConfirmVendorBookingInput,
) => {
  const vendorId = await getVendorProfileId(vendorUserId);

  const existingBooking = await getOwnedVendorBooking(
    vendorId,
    bookingId,
  );

  ensureBookingAwaitsVendorResponse(existingBooking.status);

  await ensureVendorHasNoScheduleConflict({
    vendorId,
    serviceStart: existingBooking.serviceStart,
    serviceEnd: existingBooking.serviceEnd,
    excludedBookingId: existingBooking.id,
  });

  const depositAmount = 
    existingBooking.acceptedQuotation.depositAmount;

  const confirmedStatus = 
    depositAmount !== null && depositAmount.greaterThan(0)
      ? BookingStatus.DEPOSIT_PENDING
      : BookingStatus.ACTIVE;  

  const updateResult = await prisma.booking.updateMany({
    where: {
      id: bookingId,
      vendorId,
      status: BookingStatus.AWAITING_VENDOR_CONFIRMATION,
    },

    data: {
      status: confirmedStatus,
      vendorResponseNote: input.note ?? null,
      vendorRespondedAt: new Date(),
    },
  });

  if (updateResult.count === 0) {
    throw new AppError(
      409,
      'This booking has already received a vendor response',
      'BOOKING_ALREADY_RESPONDED',
    );
  }

  return getUpdatedVendorBooking(vendorId, bookingId);
};

export const rejectVendorBooking = async (
  vendorUserId: string,
  bookingId: string,
  input: RejectVendorBookingInput,
) => {
  const vendorId = await getVendorProfileId(vendorUserId);

  const existingBooking = await getOwnedVendorBooking(
    vendorId,
    bookingId,
  );

  ensureBookingAwaitsVendorResponse(existingBooking.status);

  const updateResult = await prisma.booking.updateMany({
    where: {
      id: bookingId,
      vendorId,
      status: BookingStatus.AWAITING_VENDOR_CONFIRMATION,
    },

    data: {
      status: BookingStatus.REJECTED,
      vendorResponseNote: input.reason,
      vendorRespondedAt: new Date(),
    },
  });

  if (updateResult.count === 0) {
    throw new AppError(
      409,
      'This booking has already received a vendor response',
      'BOOKING_ALREADY_RESPONDED',
    );
  }

  return getUpdatedVendorBooking(vendorId, bookingId);
};

export const cancelVendorBooking = async (
  vendorUserId: string,
  bookingId: string,
  input: CancelVendorBookingInput,
) => {
  const vendorId = await getVendorProfileId(vendorUserId);

  const existingBooking = await getOwnedVendorBooking(
    vendorId,
    bookingId,
  );

  ensureBookingCanBeCancelledByVendor(existingBooking.status);

  const cancellationTime = new Date();

  const updateResult = await prisma.booking.updateMany({
    where: {
      id: bookingId,
      vendorId,
      
      status: {
        in: vendorCancellableStatuses,
      }
    },

    data: {
      status: BookingStatus.CANCELLED,
      vendorCancellationReason: input.reason,
      vendorCancelledAt: cancellationTime,
    },
  });

  if (updateResult.count === 0) {
    throw new AppError(
      409,
      'This booking cannot be cancelled by the vendor in its current status',
      'BOOKING_CANNOT_BE_CANCELLED_BY_VENDOR',
    );
  }

  return getUpdatedVendorBooking(vendorId, bookingId);
};

export const completeVendorBooking = async (
  vendorUserId: string,
  bookingId: string,
) => {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      vendor: {
        userId: vendorUserId,
      },
    },
    select: {
      status: true,
    },
  });

  if (!booking) {
    throw new AppError(
      404,
      'Booking not found.',
      'VENDOR_BOOKING_NOT_FOUND',
    );
  }

  ensureBookingCanBeCompletedByVendor(booking.status);

  const completedAt = new Date();

  const result = await prisma.booking.updateMany({
    where: {
      id: bookingId,
      vendor: {
        userId: vendorUserId,
      },
      status: BookingStatus.ACTIVE,
    },
    data: {
      status: BookingStatus.COMPLETED,
      vendorCompletedAt: completedAt,
    },
  });

  if (result.count === 0) {
    const currentBooking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        vendor: {
          userId: vendorUserId,
        },
      },
      select: {
        status: true,
      },
    });

    if (!currentBooking) {
      throw new AppError(
        404,
        'Booking not found.',
        'VENDOR_BOOKING_NOT_FOUND',
      );
    }

    ensureBookingCanBeCompletedByVendor(currentBooking.status);
  }

  return prisma.booking.findUniqueOrThrow({
    where: {
      id: bookingId,
    },
    select: bookingSelect,
  });
};

export const createCustomerBookingReview = async (
  customerId: string,
  bookingId: string,
  input: CreateCustomerBookingReviewInput,
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
      vendorId: true,

      review: {
        select: {
          id: true,
        },
      },

      acceptedQuotation: {
        select: {
          quotationRequest: {
            select: {
              packageId: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    throw new AppError(
      404,
      'Booking not found',
      'CUSTOMER_BOOKING_NOT_FOUND',
    );
  }

  if (booking.status !== BookingStatus.COMPLETED) {
    throw new AppError(
      409,
      'Only a completed booking can be reviewed',
      'BOOKING_NOT_COMPLETED',
    );
  }

  if (booking.review) {
    throw new AppError(
      409,
      'A review already exists for this booking',
      'BOOKING_REVIEW_ALREADY_EXISTS',
    );
  }

  try {
    return await prisma.review.create({
      data: {
        bookingId: booking.id,
        customerId,
        vendorId: booking.vendorId,
        packageId:
          booking.acceptedQuotation.quotationRequest.packageId,
        overallRating: input.overallRating,
        serviceRating: input.serviceRating ?? null,
        communicationRating:
          input.communicationRating ?? null,
        comment: input.comment ?? null,
      },

      select: reviewSelect,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppError(
        409,
        'A review already exists for this booking',
        'BOOKING_REVIEW_ALREADY_EXISTS',
      );
    }

    throw error;
  }
};

export const createCustomerBooking = async (
  customerId: string,
  input: CreateCustomerBookingInput,
) => {
  const quotation = await prisma.quotation.findFirst({
    where: {
      id: input.quotationId,

      quotationRequest: {
        event: {
          ownerId: customerId,
        },
      },
    },

    select: {
      id: true,
      status: true,
      proposedPrice: true,
      expiresAt: true,

      booking: {
        select: {
          id: true,
        },
      },

      quotationRequest: {
        select: {
          id: true,
          status: true,
          vendorId: true,

          event: {
            select: {
              id: true,
              eventDate: true,
              status: true,
            },
          },

          vendor: {
            select: {
              id: true,
              verificationStatus: true,
            },
          },
        },
      },
    },
  });

  if (!quotation) {
    throw new AppError(
      404,
      'Accepted quotation not found',
      'ACCEPTED_QUOTATION_NOT_FOUND',
    );
  }

  if (
    quotation.status !== QuotationStatus.ACCEPTED ||
    quotation.quotationRequest.status !==
      QuotationRequestStatus.ACCEPTED
  ) {
    throw new AppError(
      409,
      'Only an accepted quotation can be converted into a booking',
      'QUOTATION_NOT_ACCEPTED',
    );
  }

  if (
    quotation.expiresAt &&
    quotation.expiresAt.getTime() <= Date.now()
  ) {
    throw new AppError(
      409,
      'The accepted quotation has expired',
      'ACCEPTED_QUOTATION_EXPIRED',
    );
  }

  if (quotation.booking) {
    throw new AppError(
      409,
      'A booking already exists for this quotation',
      'BOOKING_ALREADY_EXISTS',
    );
  }

  if (
    quotation.quotationRequest.vendor.verificationStatus !==
    VendorVerificationStatus.APPROVED
  ) {
    throw new AppError(
      409,
      'The vendor is no longer available for booking',
      'VENDOR_NOT_AVAILABLE_FOR_BOOKING',
    );
  }

  if (
    quotation.quotationRequest.event.status !==
      EventStatus.PLANNING &&
    quotation.quotationRequest.event.status !== EventStatus.ACTIVE
  ) {
    throw new AppError(
      409,
      'Bookings can only be created for planning or active events',
      'EVENT_NOT_AVAILABLE_FOR_BOOKING',
    );
  }

  const serviceStart = new Date(input.serviceStart);

  const serviceEnd =
    input.serviceEnd === undefined || input.serviceEnd === null
      ? null
      : new Date(input.serviceEnd);

  if (
    !isSameUtcCalendarDate(
      serviceStart,
      quotation.quotationRequest.event.eventDate,
    )
  ) {
    throw new AppError(
      400,
      'Service start must be on the event date',
      'SERVICE_DATE_DOES_NOT_MATCH_EVENT',
    );
  }

  await ensureVendorHasNoScheduleConflict({
    vendorId: quotation.quotationRequest.vendorId,
    serviceStart,
    serviceEnd,
  });

  try {
    const booking = await prisma.booking.create({
      data: {
        eventId: quotation.quotationRequest.event.id,
        vendorId: quotation.quotationRequest.vendorId,
        acceptedQuotationId: quotation.id,
        agreedCost: quotation.proposedPrice,
        serviceStart,
        serviceEnd,
        status: BookingStatus.AWAITING_VENDOR_CONFIRMATION,
      },

      select: bookingSelect,
    });

    return formatBooking(booking);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppError(
        409,
        'A booking already exists for this quotation',
        'BOOKING_ALREADY_EXISTS',
      );
    }

    throw error;
  }
};