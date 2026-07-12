import { PaymentMethod, PaymentStatus, Prisma, type PrismaClient } from '@prisma/client';
import { DEVELOPMENT_CUSTOMERS } from './constants.js';
import {
  getRequiredEventByNameAndOwner,
  getRequiredUserByEmail,
  getRequiredVendorBySlug,
} from './helpers.js';

type SeedPaymentsInput = {
  adminEmail: string;
};

const DEVELOPMENT_PAYMENTS = [
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    eventName: 'Emma and Daniel Wedding',
    vendorSlug: 'luna-frame-studio',
    packageTitle: 'Editorial Celebration',
    amount: '97500.00',
    status: PaymentStatus.PENDING,
    method: PaymentMethod.BANK_TRANSFER,
    referenceNumber: 'EVT-WED-PHOTO-DEP-001',
    proofFileUrl: 'https://placehold.co/1200x800/E9DDCF/2E2A2C?text=Payment+Proof',
    proofFilePublicId: 'eventure-seed/payments/emma-wedding-photography-deposit',
    proofFileOriginalName: 'emma-wedding-photography-deposit.jpg',
    proofFileMimeType: 'image/jpeg',
    proofFileSize: 185000,
    reviewedAt: null,
    rejectionReason: null,
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[1].email,
    eventName: 'NovaTech Annual Conference',
    vendorSlug: 'grand-horizon-ballroom',
    packageTitle: 'Grand Ballroom Experience',
    amount: '216000.00',
    status: PaymentStatus.VERIFIED,
    method: PaymentMethod.BANK_TRANSFER,
    referenceNumber: 'EVT-CONF-VENUE-DEP-001',
    proofFileUrl: 'https://placehold.co/1200x800/E9DDCF/2E2A2C?text=Verified+Payment',
    proofFilePublicId: 'eventure-seed/payments/novatech-ballroom-deposit',
    proofFileOriginalName: 'novatech-ballroom-deposit.jpg',
    proofFileMimeType: 'image/jpeg',
    proofFileSize: 192000,
    reviewedAt: new Date('2026-07-12T10:45:00.000Z'),
    rejectionReason: null,
  },
] as const;

const getRequiredBooking = async (
  prisma: PrismaClient,
  input: {
    eventId: string;
    vendorId: string;
    packageTitle: string;
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

  const booking = await prisma.booking.findFirst({
    where: {
      eventId: input.eventId,
      vendorId: input.vendorId,
      acceptedQuotation: {
        quotationRequestId: quotationRequest.id,
      },
    },
  });

  if (!booking) {
    throw new Error(
      `Required booking for package "${input.packageTitle}" was not found. Seed bookings first.`,
    );
  }

  return booking;
};

export const seedPayments = async (prisma: PrismaClient, input: SeedPaymentsInput) => {
  const admin = await getRequiredUserByEmail(prisma, input.adminEmail);

  let seededPaymentCount = 0;

  for (const paymentData of DEVELOPMENT_PAYMENTS) {
    const customer = await getRequiredUserByEmail(prisma, paymentData.ownerEmail);

    const event = await getRequiredEventByNameAndOwner(prisma, paymentData.eventName, customer.id);

    const vendor = await getRequiredVendorBySlug(prisma, paymentData.vendorSlug);

    const booking = await getRequiredBooking(prisma, {
      eventId: event.id,
      vendorId: vendor.id,
      packageTitle: paymentData.packageTitle,
    });

    const existingPayment = await prisma.payment.findFirst({
      where: {
        bookingId: booking.id,
        referenceNumber: paymentData.referenceNumber,
      },
    });

    const reviewedById = paymentData.status === PaymentStatus.VERIFIED ? admin.id : null;

    const paymentValues = {
      submittedById: customer.id,
      reviewedById,
      amount: new Prisma.Decimal(paymentData.amount),
      status: paymentData.status,
      method: paymentData.method,
      referenceNumber: paymentData.referenceNumber,
      proofFileUrl: paymentData.proofFileUrl,
      proofFilePublicId: paymentData.proofFilePublicId,
      proofFileOriginalName: paymentData.proofFileOriginalName,
      proofFileMimeType: paymentData.proofFileMimeType,
      proofFileSize: paymentData.proofFileSize,
      reviewedAt: paymentData.reviewedAt,
      rejectionReason: paymentData.rejectionReason,
    };

    if (existingPayment) {
      await prisma.payment.update({
        where: {
          id: existingPayment.id,
        },
        data: paymentValues,
      });
    } else {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          ...paymentValues,
        },
      });
    }

    seededPaymentCount += 1;
  }

  console.log(`${seededPaymentCount} payments seeded successfully.`);
};
