import { BookingStatus, Prisma, type PrismaClient } from '@prisma/client';
import { DEVELOPMENT_CUSTOMERS } from './constants.js';
import {
  getRequiredEventByNameAndOwner,
  getRequiredUserByEmail,
  getRequiredVendorBySlug,
} from './helpers.js';

const DEVELOPMENT_BOOKINGS = [
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    eventName: 'Emma and Daniel Wedding',
    vendorSlug: 'luna-frame-studio',
    packageTitle: 'Editorial Celebration',
    quotationVersion: 2,
    agreedCost: '325000.00',
    serviceStart: new Date('2026-11-21T03:30:00.000Z'),
    serviceEnd: new Date('2026-11-21T15:30:00.000Z'),
    status: BookingStatus.DEPOSIT_PENDING,
    vendorResponseNote:
      'The photography team has reserved the event date. The booking will be fully secured after the deposit is verified.',
    vendorRespondedAt: new Date('2026-07-12T08:30:00.000Z'),
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[1].email,
    eventName: 'NovaTech Annual Conference',
    vendorSlug: 'grand-horizon-ballroom',
    packageTitle: 'Grand Ballroom Experience',
    quotationVersion: 1,
    agreedCost: '720000.00',
    serviceStart: new Date('2026-09-18T02:30:00.000Z'),
    serviceEnd: new Date('2026-09-18T14:30:00.000Z'),
    status: BookingStatus.CONFIRMED,
    vendorResponseNote:
      'The ballroom and preparation rooms are confirmed for the full conference day.',
    vendorRespondedAt: new Date('2026-07-11T09:15:00.000Z'),
  },
] as const;

const getRequiredAcceptedQuotation = async (
  prisma: PrismaClient,
  input: {
    eventId: string;
    vendorId: string;
    packageTitle: string;
    quotationVersion: number;
  },
) => {
  const servicePackage = await prisma.servicePackage.findFirst({
    where: {
      vendorId: input.vendorId,
      title: input.packageTitle,
    },
  });

  if (!servicePackage) {
    throw new Error(
      `Required service package "${input.packageTitle}" was not found. Seed service packages first.`,
    );
  }

  const quotationRequest = await prisma.quotationRequest.findFirst({
    where: {
      eventId: input.eventId,
      vendorId: input.vendorId,
      packageId: servicePackage.id,
    },
  });

  if (!quotationRequest) {
    throw new Error(
      `Required quotation request for package "${input.packageTitle}" was not found. Seed quotation workflows first.`,
    );
  }

  const quotation = await prisma.quotation.findUnique({
    where: {
      quotationRequestId_version: {
        quotationRequestId: quotationRequest.id,
        version: input.quotationVersion,
      },
    },
  });

  if (!quotation) {
    throw new Error(
      `Required quotation version ${input.quotationVersion} was not found for package "${input.packageTitle}".`,
    );
  }

  return quotation;
};

export const seedBookings = async (prisma: PrismaClient) => {
  let seededBookingCount = 0;

  for (const bookingData of DEVELOPMENT_BOOKINGS) {
    const owner = await getRequiredUserByEmail(prisma, bookingData.ownerEmail);

    const event = await getRequiredEventByNameAndOwner(prisma, bookingData.eventName, owner.id);

    const vendor = await getRequiredVendorBySlug(prisma, bookingData.vendorSlug);

    const acceptedQuotation = await getRequiredAcceptedQuotation(prisma, {
      eventId: event.id,
      vendorId: vendor.id,
      packageTitle: bookingData.packageTitle,
      quotationVersion: bookingData.quotationVersion,
    });

    const bookingValues = {
      eventId: event.id,
      vendorId: vendor.id,
      agreedCost: new Prisma.Decimal(bookingData.agreedCost),
      serviceStart: bookingData.serviceStart,
      serviceEnd: bookingData.serviceEnd,
      status: bookingData.status,
      vendorResponseNote: bookingData.vendorResponseNote,
      vendorRespondedAt: bookingData.vendorRespondedAt,
      customerCancellationReason: null,
      customerCancelledAt: null,
      vendorCancellationReason: null,
      vendorCancelledAt: null,
      vendorCompletedAt: null,
    };

    await prisma.booking.upsert({
      where: {
        acceptedQuotationId: acceptedQuotation.id,
      },
      update: bookingValues,
      create: {
        acceptedQuotationId: acceptedQuotation.id,
        ...bookingValues,
      },
    });

    seededBookingCount += 1;
  }

  console.log(`${seededBookingCount} bookings seeded successfully.`);
};
