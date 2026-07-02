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

type SelectedBooking = Prisma.BookingGetPayload<{
  select: typeof bookingSelect;
}>;

const customerCancellableStatuses: BookingStatus[] = [
  BookingStatus.AWAITING_VENDOR_CONFIRMATION,
  BookingStatus.CONFIRMED,
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

  if (status !== BookingStatus.CONFIRMED) {
    throw new AppError(
      409,
      'This booking cannot be cancelled by the vendor in its current status',
      'BOOKING_CANNOT_BE_CANCELLED_BY_VENDOR',
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

  const updateResult = await prisma.booking.updateMany({
    where: {
      id: bookingId,
      vendorId,
      status: BookingStatus.AWAITING_VENDOR_CONFIRMATION,
    },

    data: {
      status: BookingStatus.CONFIRMED,
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
      status: BookingStatus.CONFIRMED,
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