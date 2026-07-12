import {
  BookingStatus,
  EventStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  QuotationRequestStatus,
  QuotationStatus,
  type PrismaClient,
} from '@prisma/client';
import { DEVELOPMENT_CUSTOMERS } from './constants.js';
import {
  getRequiredCategoryBySlug,
  getRequiredUserByEmail,
  getRequiredVendorBySlug,
} from './helpers.js';

type SeedHistoricalWorkflowsInput = {
  adminEmail: string;
};

const HISTORICAL_WORKFLOWS = [
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    event: {
      name: 'Emma Engagement Dinner',
      eventType: 'Engagement Dinner',
      eventDate: new Date('2026-04-18T12:30:00.000Z'),
      location: 'Colombo',
      guestCount: 85,
      plannedBudget: '1250000.00',
      theme: 'Candlelit ivory evening',
      requirements:
        'An intimate engagement dinner with elegant styling, warm lighting, and a refined indoor reception setup.',
    },
    vendorSlug: 'velvet-moments',
    categorySlug: 'decorations',
    packageTitle: 'Signature Styling',
    quotation: {
      requirements:
        'Reception styling for 85 guests with an ivory colour palette, entrance décor, candle accents, and coordinated guest tables.',
      proposedPrice: '235000.00',
      depositAmount: '70000.00',
      inclusions:
        'Entrance styling, engagement backdrop, ten guest tables, candle accents, setup, and dismantling.',
      exclusions: 'Fresh bridal flowers, venue charges, electrical supply, and additional tables.',
      terms: 'The deposit confirms the booking. Final payment is due seven days before the event.',
      responseDueAt: new Date('2026-02-20T23:59:59.000Z'),
      expiresAt: new Date('2026-02-25T23:59:59.000Z'),
    },
    booking: {
      agreedCost: '235000.00',
      serviceStart: new Date('2026-04-18T07:00:00.000Z'),
      serviceEnd: new Date('2026-04-18T17:30:00.000Z'),
      vendorResponseNote:
        'The styling team confirmed the setup schedule and completed the event successfully.',
      vendorRespondedAt: new Date('2026-02-22T09:15:00.000Z'),
      vendorCompletedAt: new Date('2026-04-18T18:00:00.000Z'),
    },
    payment: {
      amount: '235000.00',
      referenceNumber: 'EVT-HIST-ENGAGE-DECOR-001',
      proofFilePublicId: 'eventure-seed/payments/history/emma-engagement-decoration',
      proofFileOriginalName: 'emma-engagement-decoration-payment.jpg',
      reviewedAt: new Date('2026-04-12T10:20:00.000Z'),
    },
    review: {
      overallRating: 5,
      serviceRating: 5,
      communicationRating: 5,
      comment:
        'The styling felt elegant and thoughtfully coordinated. The team communicated clearly, arrived on time, and transformed the venue beautifully.',
    },
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[1].email,
    event: {
      name: 'NovaTech Product Launch',
      eventType: 'Product Launch',
      eventDate: new Date('2026-03-14T09:00:00.000Z'),
      location: 'Colombo',
      guestCount: 140,
      plannedBudget: '1850000.00',
      theme: 'Modern technology showcase',
      requirements:
        'A professional evening product launch requiring stage audio, lighting, microphones, playback support, and networking music.',
    },
    vendorSlug: 'echo-entertainment',
    categorySlug: 'music-and-dj',
    packageTitle: 'Full Entertainment Experience',
    quotation: {
      requirements:
        'Conference-grade sound, stage lighting, wireless microphones, presentation playback, LED coordination, and evening networking music.',
      proposedPrice: '268000.00',
      depositAmount: '80000.00',
      inclusions:
        'Premium sound system, four wireless microphones, stage lighting, technical operator, playback support, and evening DJ service.',
      exclusions:
        'Venue power supply, additional screens, live performers, and service beyond the agreed finish time.',
      terms:
        'A deposit confirms equipment allocation. The remaining balance is due five days before the event.',
      responseDueAt: new Date('2026-01-28T23:59:59.000Z'),
      expiresAt: new Date('2026-02-02T23:59:59.000Z'),
    },
    booking: {
      agreedCost: '268000.00',
      serviceStart: new Date('2026-03-14T05:00:00.000Z'),
      serviceEnd: new Date('2026-03-14T16:30:00.000Z'),
      vendorResponseNote:
        'The technical team confirmed the equipment schedule and completed the launch successfully.',
      vendorRespondedAt: new Date('2026-01-30T11:00:00.000Z'),
      vendorCompletedAt: new Date('2026-03-14T17:00:00.000Z'),
    },
    payment: {
      amount: '268000.00',
      referenceNumber: 'EVT-HIST-LAUNCH-AUDIO-001',
      proofFilePublicId: 'eventure-seed/payments/history/novatech-launch-audio',
      proofFileOriginalName: 'novatech-launch-audio-payment.jpg',
      reviewedAt: new Date('2026-03-10T08:40:00.000Z'),
    },
    review: {
      overallRating: 4,
      serviceRating: 5,
      communicationRating: 4,
      comment:
        'The equipment and technical support were excellent throughout the launch. Communication was reliable, and the team handled last-minute programme adjustments professionally.',
    },
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[2].email,
    event: {
      name: 'Olivia Family Anniversary',
      eventType: 'Anniversary Celebration',
      eventDate: new Date('2026-05-09T11:30:00.000Z'),
      location: 'Kandy',
      guestCount: 60,
      plannedBudget: '720000.00',
      theme: 'Soft botanical celebration',
      requirements:
        'A relaxed family anniversary with a botanical cake, individual desserts, and a styled dessert presentation.',
    },
    vendorSlug: 'sweet-layers',
    categorySlug: 'cakes-and-desserts',
    packageTitle: 'Dessert Table Collection',
    quotation: {
      requirements:
        'A botanical anniversary cake with coordinated cupcakes, macarons, dessert cups, delivery, and styled presentation for 60 guests.',
      proposedPrice: '92000.00',
      depositAmount: '30000.00',
      inclusions:
        'Two-tier anniversary cake, cupcakes, macarons, dessert cups, delivery, setup, and display stands.',
      exclusions:
        'Fresh flowers, venue table rental, printed stationery, and collection after the event.',
      terms:
        'The deposit confirms the design. Final flavours and guest count must be approved ten days before the event.',
      responseDueAt: new Date('2026-03-18T23:59:59.000Z'),
      expiresAt: new Date('2026-03-22T23:59:59.000Z'),
    },
    booking: {
      agreedCost: '92000.00',
      serviceStart: new Date('2026-05-09T07:30:00.000Z'),
      serviceEnd: new Date('2026-05-09T12:30:00.000Z'),
      vendorResponseNote: 'The dessert collection was delivered and arranged before guest arrival.',
      vendorRespondedAt: new Date('2026-03-20T07:50:00.000Z'),
      vendorCompletedAt: new Date('2026-05-09T13:00:00.000Z'),
    },
    payment: {
      amount: '92000.00',
      referenceNumber: 'EVT-HIST-ANNIV-DESSERT-001',
      proofFilePublicId: 'eventure-seed/payments/history/olivia-anniversary-dessert',
      proofFileOriginalName: 'olivia-anniversary-dessert-payment.jpg',
      reviewedAt: new Date('2026-05-03T09:30:00.000Z'),
    },
    review: {
      overallRating: 5,
      serviceRating: 5,
      communicationRating: 4,
      comment:
        'The cake and desserts looked beautiful and tasted wonderful. Everything arrived safely, matched the agreed design, and was presented with great attention to detail.',
    },
  },
] as const;

const getRequiredPackage = async (
  prisma: PrismaClient,
  input: {
    vendorId: string;
    categoryId: string;
    title: string;
  },
) => {
  const servicePackage = await prisma.servicePackage.findFirst({
    where: {
      vendorId: input.vendorId,
      categoryId: input.categoryId,
      title: input.title,
    },
  });

  if (!servicePackage) {
    throw new Error(
      `Required historical service package "${input.title}" was not found. Seed packages first.`,
    );
  }

  return servicePackage;
};

export const seedHistoricalWorkflows = async (
  prisma: PrismaClient,
  input: SeedHistoricalWorkflowsInput,
) => {
  const admin = await getRequiredUserByEmail(prisma, input.adminEmail);

  let seededWorkflowCount = 0;

  for (const workflow of HISTORICAL_WORKFLOWS) {
    const customer = await getRequiredUserByEmail(prisma, workflow.ownerEmail);

    const vendor = await getRequiredVendorBySlug(prisma, workflow.vendorSlug);

    const category = await getRequiredCategoryBySlug(prisma, workflow.categorySlug);

    const servicePackage = await getRequiredPackage(prisma, {
      vendorId: vendor.id,
      categoryId: category.id,
      title: workflow.packageTitle,
    });

    const existingEvent = await prisma.event.findFirst({
      where: {
        ownerId: customer.id,
        name: workflow.event.name,
      },
    });

    const eventValues = {
      eventType: workflow.event.eventType,
      eventDate: workflow.event.eventDate,
      location: workflow.event.location,
      guestCount: workflow.event.guestCount,
      plannedBudget: new Prisma.Decimal(workflow.event.plannedBudget),
      theme: workflow.event.theme,
      requirements: workflow.event.requirements,
      status: EventStatus.COMPLETED,
    };

    const event = existingEvent
      ? await prisma.event.update({
          where: {
            id: existingEvent.id,
          },
          data: eventValues,
        })
      : await prisma.event.create({
          data: {
            ownerId: customer.id,
            name: workflow.event.name,
            ...eventValues,
          },
        });

    const existingRequest = await prisma.quotationRequest.findFirst({
      where: {
        eventId: event.id,
        vendorId: vendor.id,
        packageId: servicePackage.id,
      },
    });

    const requestValues = {
      vendorId: vendor.id,
      packageId: servicePackage.id,
      requirements: workflow.quotation.requirements,
      responseDueAt: workflow.quotation.responseDueAt,
      status: QuotationRequestStatus.ACCEPTED,
    };

    const quotationRequest = existingRequest
      ? await prisma.quotationRequest.update({
          where: {
            id: existingRequest.id,
          },
          data: requestValues,
        })
      : await prisma.quotationRequest.create({
          data: {
            eventId: event.id,
            ...requestValues,
          },
        });

    const quotation = await prisma.quotation.upsert({
      where: {
        quotationRequestId_version: {
          quotationRequestId: quotationRequest.id,
          version: 1,
        },
      },
      update: {
        status: QuotationStatus.ACCEPTED,
        proposedPrice: new Prisma.Decimal(workflow.quotation.proposedPrice),
        depositAmount: new Prisma.Decimal(workflow.quotation.depositAmount),
        inclusions: workflow.quotation.inclusions,
        exclusions: workflow.quotation.exclusions,
        terms: workflow.quotation.terms,
        expiresAt: workflow.quotation.expiresAt,
      },
      create: {
        quotationRequestId: quotationRequest.id,
        version: 1,
        status: QuotationStatus.ACCEPTED,
        proposedPrice: new Prisma.Decimal(workflow.quotation.proposedPrice),
        depositAmount: new Prisma.Decimal(workflow.quotation.depositAmount),
        inclusions: workflow.quotation.inclusions,
        exclusions: workflow.quotation.exclusions,
        terms: workflow.quotation.terms,
        expiresAt: workflow.quotation.expiresAt,
      },
    });

    const booking = await prisma.booking.upsert({
      where: {
        acceptedQuotationId: quotation.id,
      },
      update: {
        eventId: event.id,
        vendorId: vendor.id,
        agreedCost: new Prisma.Decimal(workflow.booking.agreedCost),
        serviceStart: workflow.booking.serviceStart,
        serviceEnd: workflow.booking.serviceEnd,
        status: BookingStatus.COMPLETED,
        vendorResponseNote: workflow.booking.vendorResponseNote,
        vendorRespondedAt: workflow.booking.vendorRespondedAt,
        vendorCompletedAt: workflow.booking.vendorCompletedAt,
        customerCancellationReason: null,
        customerCancelledAt: null,
        vendorCancellationReason: null,
        vendorCancelledAt: null,
      },
      create: {
        eventId: event.id,
        vendorId: vendor.id,
        acceptedQuotationId: quotation.id,
        agreedCost: new Prisma.Decimal(workflow.booking.agreedCost),
        serviceStart: workflow.booking.serviceStart,
        serviceEnd: workflow.booking.serviceEnd,
        status: BookingStatus.COMPLETED,
        vendorResponseNote: workflow.booking.vendorResponseNote,
        vendorRespondedAt: workflow.booking.vendorRespondedAt,
        vendorCompletedAt: workflow.booking.vendorCompletedAt,
      },
    });

    const existingPayment = await prisma.payment.findFirst({
      where: {
        bookingId: booking.id,
        referenceNumber: workflow.payment.referenceNumber,
      },
    });

    const paymentValues = {
      submittedById: customer.id,
      reviewedById: admin.id,
      amount: new Prisma.Decimal(workflow.payment.amount),
      status: PaymentStatus.VERIFIED,
      method: PaymentMethod.BANK_TRANSFER,
      referenceNumber: workflow.payment.referenceNumber,
      proofFileUrl: 'https://placehold.co/1200x800/E9DDCF/2E2A2C?text=Verified+Payment',
      proofFilePublicId: workflow.payment.proofFilePublicId,
      proofFileOriginalName: workflow.payment.proofFileOriginalName,
      proofFileMimeType: 'image/jpeg',
      proofFileSize: 180000,
      reviewedAt: workflow.payment.reviewedAt,
      rejectionReason: null,
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

    await prisma.review.upsert({
      where: {
        bookingId: booking.id,
      },
      update: {
        customerId: customer.id,
        vendorId: vendor.id,
        packageId: servicePackage.id,
        overallRating: workflow.review.overallRating,
        serviceRating: workflow.review.serviceRating,
        communicationRating: workflow.review.communicationRating,
        comment: workflow.review.comment,
        isHidden: false,
        moderationReason: null,
        moderatedAt: null,
        moderatedById: null,
      },
      create: {
        bookingId: booking.id,
        customerId: customer.id,
        vendorId: vendor.id,
        packageId: servicePackage.id,
        overallRating: workflow.review.overallRating,
        serviceRating: workflow.review.serviceRating,
        communicationRating: workflow.review.communicationRating,
        comment: workflow.review.comment,
      },
    });

    seededWorkflowCount += 1;
  }

  console.log(`${seededWorkflowCount} completed historical event workflows seeded successfully.`);
};
