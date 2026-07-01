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
import type { CreateCustomerBookingInput } from './booking.schemas.js';

const bookingSelect = {
  id: true,
  agreedCost: true,
  serviceStart: true,
  serviceEnd: true,
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

const formatBooking = (booking: SelectedBooking) => ({
  ...booking,

  agreedCost: booking.agreedCost.toFixed(2),

  acceptedQuotation: {
    ...booking.acceptedQuotation,

    proposedPrice: booking.acceptedQuotation.proposedPrice.toFixed(2),

    depositAmount: booking.acceptedQuotation.depositAmount?.toFixed(2) ?? null,

    quotationRequest: {
      ...booking.acceptedQuotation.quotationRequest,

      package: booking.acceptedQuotation.quotationRequest.package
        ? {
            ...booking.acceptedQuotation.quotationRequest.package,

            basePrice:
              booking.acceptedQuotation.quotationRequest.package.basePrice?.toFixed(2) ?? null,
          }
        : null,
    },
  },
});

const isSameUtcCalendarDate = (firstDate: Date, secondDate: Date) =>
  firstDate.getUTCFullYear() === secondDate.getUTCFullYear() &&
  firstDate.getUTCMonth() === secondDate.getUTCMonth() &&
  firstDate.getUTCDate() === secondDate.getUTCDate();

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
    throw new AppError(404, 'Accepted quotation not found', 'ACCEPTED_QUOTATION_NOT_FOUND');
  }

  if (
    quotation.status !== QuotationStatus.ACCEPTED ||
    quotation.quotationRequest.status !== QuotationRequestStatus.ACCEPTED
  ) {
    throw new AppError(
      409,
      'Only an accepted quotation can be converted into a booking',
      'QUOTATION_NOT_ACCEPTED',
    );
  }

  if (quotation.expiresAt && quotation.expiresAt.getTime() <= Date.now()) {
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
    quotation.quotationRequest.event.status !== EventStatus.PLANNING &&
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