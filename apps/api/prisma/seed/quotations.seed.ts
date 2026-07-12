import { Prisma, QuotationRequestStatus, QuotationStatus, type PrismaClient } from '@prisma/client';
import { DEVELOPMENT_CUSTOMERS } from './constants.js';
import {
  getRequiredEventByNameAndOwner,
  getRequiredUserByEmail,
  getRequiredVendorBySlug,
} from './helpers.js';

const DEVELOPMENT_QUOTATIONS = [
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    eventName: 'Emma and Daniel Wedding',
    vendorSlug: 'luna-frame-studio',
    packageTitle: 'Editorial Celebration',
    requirements:
      'Full-day wedding photography covering preparation, ceremony, reception, family portraits, and evening celebrations.',
    responseDueAt: new Date('2026-07-22T23:59:59.000Z'),
    requestStatus: QuotationRequestStatus.ACCEPTED,
    quotations: [
      {
        version: 1,
        status: QuotationStatus.REVISED,
        proposedPrice: '335000.00',
        depositAmount: '100000.00',
        inclusions:
          'Two photographers, ten hours of coverage, edited digital gallery, engagement session, and premium album.',
        exclusions: 'Travel outside Colombo, additional albums, and overtime beyond ten hours.',
        terms:
          'A deposit is required to confirm the date. Final payment is due fourteen days before the event.',
        expiresAt: new Date('2026-07-18T23:59:59.000Z'),
      },
      {
        version: 2,
        status: QuotationStatus.ACCEPTED,
        proposedPrice: '325000.00',
        depositAmount: '97500.00',
        inclusions:
          'Two photographers, ten hours of coverage, edited digital gallery, engagement session, premium album, and thirty preview images.',
        exclusions: 'Travel outside Colombo and overtime beyond ten hours.',
        terms:
          'A thirty-percent deposit confirms the booking. The remaining balance is due fourteen days before the wedding.',
        expiresAt: new Date('2026-07-25T23:59:59.000Z'),
      },
    ],
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    eventName: 'Emma and Daniel Wedding',
    vendorSlug: 'velvet-moments',
    packageTitle: 'Grand Celebration Design',
    requirements:
      'Complete indoor reception styling using ivory, muted plum, warm lighting, layered stage details, and coordinated guest tables.',
    responseDueAt: new Date('2026-07-28T23:59:59.000Z'),
    requestStatus: QuotationRequestStatus.QUOTED,
    quotations: [
      {
        version: 1,
        status: QuotationStatus.SENT,
        proposedPrice: '495000.00',
        depositAmount: '150000.00',
        inclusions:
          'Custom reception stage, entrance styling, twenty-five guest tables, candle accents, setup, and dismantling.',
        exclusions:
          'Fresh bridal flowers, venue charges, electrical supply, and additional guest tables.',
        terms:
          'The quotation remains valid until the expiry date. Design changes may affect the final amount.',
        expiresAt: new Date('2026-07-30T23:59:59.000Z'),
      },
    ],
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    eventName: 'Emma and Daniel Wedding',
    vendorSlug: 'aroma-catering',
    packageTitle: 'Premium Dining Experience',
    requirements:
      'A premium buffet for approximately 220 guests with welcome drinks, live stations, vegetarian options, desserts, and service staff.',
    responseDueAt: new Date('2026-07-31T23:59:59.000Z'),
    requestStatus: QuotationRequestStatus.CLARIFICATION_REQUESTED,
    quotations: [
      {
        version: 1,
        status: QuotationStatus.CLARIFICATION_REQUESTED,
        proposedPrice: '1364000.00',
        depositAmount: '400000.00',
        inclusions:
          'Premium buffet estimate for 220 guests, welcome beverages, two live stations, desserts, tableware, and service staff.',
        exclusions:
          'Venue kitchen charges, alcohol, additional guest counts, and late-night service.',
        terms: 'Final pricing depends on the confirmed menu, guest count, and venue facilities.',
        expiresAt: new Date('2026-08-05T23:59:59.000Z'),
      },
    ],
  },

  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[1].email,
    eventName: 'NovaTech Annual Conference',
    vendorSlug: 'grand-horizon-ballroom',
    packageTitle: 'Grand Ballroom Experience',
    requirements:
      'Full-day ballroom access for 180 attendees with theatre seating, registration space, stage area, preparation rooms, and parking.',
    responseDueAt: new Date('2026-07-20T23:59:59.000Z'),
    requestStatus: QuotationRequestStatus.ACCEPTED,
    quotations: [
      {
        version: 1,
        status: QuotationStatus.ACCEPTED,
        proposedPrice: '720000.00',
        depositAmount: '216000.00',
        inclusions:
          'Exclusive ballroom access, standard seating, registration area, preparation rooms, parking, venue coordinator, and basic stage lighting.',
        exclusions:
          'Catering, branded decorations, external technical equipment, and overtime after 8:00 PM.',
        terms:
          'A thirty-percent deposit confirms the date. The remaining balance is due seven days before the conference.',
        expiresAt: new Date('2026-07-23T23:59:59.000Z'),
      },
    ],
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[1].email,
    eventName: 'NovaTech Annual Conference',
    vendorSlug: 'echo-entertainment',
    packageTitle: 'Full Entertainment Experience',
    requirements:
      'Professional conference audio, wireless microphones, stage lighting, playback support, LED screen coordination, and an evening networking playlist.',
    responseDueAt: new Date('2026-07-26T23:59:59.000Z'),
    requestStatus: QuotationRequestStatus.VIEWED,
    quotations: [],
  },

  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[2].email,
    eventName: 'Olivia Birthday Celebration',
    vendorSlug: 'sweet-layers',
    packageTitle: 'Dessert Table Collection',
    requirements:
      'A pastel botanical birthday cake and coordinated dessert table for approximately 75 guests.',
    responseDueAt: new Date('2026-07-24T23:59:59.000Z'),
    requestStatus: QuotationRequestStatus.QUOTED,
    quotations: [
      {
        version: 1,
        status: QuotationStatus.SENT,
        proposedPrice: '98000.00',
        depositAmount: '30000.00',
        inclusions:
          'Two-tier statement cake, cupcakes, macarons, dessert cups, delivery, setup, and styled display stands.',
        exclusions:
          'Fresh flowers, venue table rental, custom printed stationery, and late-night collection.',
        terms:
          'The design is confirmed after deposit payment. Final flavour and guest count are required two weeks before the event.',
        expiresAt: new Date('2026-07-27T23:59:59.000Z'),
      },
    ],
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[2].email,
    eventName: 'Olivia Birthday Celebration',
    vendorSlug: 'bloom-atelier',
    packageTitle: 'Floral Essentials',
    requirements:
      'Relaxed pastel floral arrangements for dining tables, cake table, entrance, and a small photo area.',
    responseDueAt: new Date('2026-07-29T23:59:59.000Z'),
    requestStatus: QuotationRequestStatus.SENT,
    quotations: [],
  },
] as const;

const getRequiredPackage = async (prisma: PrismaClient, vendorId: string, packageTitle: string) => {
  const servicePackage = await prisma.servicePackage.findFirst({
    where: {
      vendorId,
      title: packageTitle,
    },
  });

  if (!servicePackage) {
    throw new Error(
      `Required service package "${packageTitle}" was not found for vendor "${vendorId}". Seed service packages first.`,
    );
  }

  return servicePackage;
};

export const seedQuotationWorkflows = async (prisma: PrismaClient) => {
  let requestCount = 0;
  let quotationCount = 0;

  for (const workflowData of DEVELOPMENT_QUOTATIONS) {
    const owner = await getRequiredUserByEmail(prisma, workflowData.ownerEmail);

    const event = await getRequiredEventByNameAndOwner(prisma, workflowData.eventName, owner.id);

    const vendor = await getRequiredVendorBySlug(prisma, workflowData.vendorSlug);

    const servicePackage = await getRequiredPackage(prisma, vendor.id, workflowData.packageTitle);

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
      requirements: workflowData.requirements,
      responseDueAt: workflowData.responseDueAt,
      status: workflowData.requestStatus,
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

    requestCount += 1;

    for (const quotationData of workflowData.quotations) {
      await prisma.quotation.upsert({
        where: {
          quotationRequestId_version: {
            quotationRequestId: quotationRequest.id,
            version: quotationData.version,
          },
        },
        update: {
          status: quotationData.status,
          proposedPrice: new Prisma.Decimal(quotationData.proposedPrice),
          depositAmount: new Prisma.Decimal(quotationData.depositAmount),
          inclusions: quotationData.inclusions,
          exclusions: quotationData.exclusions,
          terms: quotationData.terms,
          expiresAt: quotationData.expiresAt,
        },
        create: {
          quotationRequestId: quotationRequest.id,
          version: quotationData.version,
          status: quotationData.status,
          proposedPrice: new Prisma.Decimal(quotationData.proposedPrice),
          depositAmount: new Prisma.Decimal(quotationData.depositAmount),
          inclusions: quotationData.inclusions,
          exclusions: quotationData.exclusions,
          terms: quotationData.terms,
          expiresAt: quotationData.expiresAt,
        },
      });

      quotationCount += 1;
    }
  }

  console.log(`${requestCount} quotation requests seeded successfully.`);

  console.log(`${quotationCount} quotation versions seeded successfully.`);
};
