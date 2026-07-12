import { EventStatus, Prisma, type PrismaClient } from '@prisma/client';
import { DEVELOPMENT_CUSTOMERS } from './constants.js';
import { getRequiredUserByEmail } from './helpers.js';

const DEVELOPMENT_EVENTS = [
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    name: 'Emma and Daniel Wedding',
    eventType: 'Wedding',
    eventDate: new Date('2026-11-21T09:00:00.000Z'),
    location: 'Colombo',
    guestCount: 220,
    plannedBudget: '4500000.00',
    theme: 'Modern ivory and plum',
    requirements:
      'An elegant indoor wedding with premium photography, floral styling, catering, entertainment, and coordinated guest transport.',
    status: EventStatus.PLANNING,
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[1].email,
    name: 'NovaTech Annual Conference',
    eventType: 'Corporate Conference',
    eventDate: new Date('2026-09-18T03:30:00.000Z'),
    location: 'Colombo',
    guestCount: 180,
    plannedBudget: '2850000.00',
    theme: 'Modern professional',
    requirements:
      'A full-day corporate conference requiring a venue, catering, stage lighting, sound support, photography, and structured guest management.',
    status: EventStatus.ACTIVE,
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[2].email,
    name: 'Olivia Birthday Celebration',
    eventType: 'Birthday',
    eventDate: new Date('2026-08-29T12:30:00.000Z'),
    location: 'Kandy',
    guestCount: 75,
    plannedBudget: '950000.00',
    theme: 'Pastel garden evening',
    requirements:
      'An intimate birthday celebration with a custom cake, floral decoration, music, photography, and a relaxed outdoor dining setup.',
    status: EventStatus.PLANNING,
  },
] as const;

export const seedDevelopmentEvents = async (prisma: PrismaClient) => {
  for (const eventData of DEVELOPMENT_EVENTS) {
    const owner = await getRequiredUserByEmail(prisma, eventData.ownerEmail);

    const existingEvent = await prisma.event.findFirst({
      where: {
        ownerId: owner.id,
        name: eventData.name,
      },
    });

    const eventValues = {
      eventType: eventData.eventType,
      eventDate: eventData.eventDate,
      location: eventData.location,
      guestCount: eventData.guestCount,
      plannedBudget: new Prisma.Decimal(eventData.plannedBudget),
      theme: eventData.theme,
      requirements: eventData.requirements,
      status: eventData.status,
    };

    if (existingEvent) {
      await prisma.event.update({
        where: {
          id: existingEvent.id,
        },
        data: eventValues,
      });

      continue;
    }

    await prisma.event.create({
      data: {
        ownerId: owner.id,
        name: eventData.name,
        ...eventValues,
      },
    });
  }

  console.log(`${DEVELOPMENT_EVENTS.length} development events seeded successfully.`);
};
