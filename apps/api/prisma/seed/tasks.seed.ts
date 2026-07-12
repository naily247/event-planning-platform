import { EventTaskPriority, EventTaskStatus, type PrismaClient } from '@prisma/client';
import { DEVELOPMENT_CUSTOMERS } from './constants.js';
import { getRequiredEventByNameAndOwner, getRequiredUserByEmail } from './helpers.js';

const DEVELOPMENT_EVENT_TASKS = [
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    eventName: 'Emma and Daniel Wedding',
    title: 'Confirm wedding photographer',
    description: 'Review the final photography proposal and confirm the preferred package.',
    status: EventTaskStatus.COMPLETED,
    priority: EventTaskPriority.HIGH,
    dueDate: new Date('2026-06-25T00:00:00.000Z'),
    completedAt: new Date('2026-06-23T10:15:00.000Z'),
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    eventName: 'Emma and Daniel Wedding',
    title: 'Finalize guest list',
    description: 'Confirm family groups, contact details, and expected party sizes.',
    status: EventTaskStatus.IN_PROGRESS,
    priority: EventTaskPriority.HIGH,
    dueDate: new Date('2026-08-15T00:00:00.000Z'),
    completedAt: null,
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    eventName: 'Emma and Daniel Wedding',
    title: 'Schedule menu tasting',
    description: 'Coordinate a menu-tasting appointment with the selected catering team.',
    status: EventTaskStatus.TODO,
    priority: EventTaskPriority.MEDIUM,
    dueDate: new Date('2026-08-28T00:00:00.000Z'),
    completedAt: null,
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    eventName: 'Emma and Daniel Wedding',
    title: 'Approve floral concept',
    description: 'Review bouquet, ceremony arch, and reception tablescape references.',
    status: EventTaskStatus.TODO,
    priority: EventTaskPriority.HIGH,
    dueDate: new Date('2026-09-05T00:00:00.000Z'),
    completedAt: null,
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    eventName: 'Emma and Daniel Wedding',
    title: 'Arrange guest transport routes',
    description: 'Confirm pickup locations, vehicle counts, and final guest transport timing.',
    status: EventTaskStatus.TODO,
    priority: EventTaskPriority.MEDIUM,
    dueDate: new Date('2026-10-18T00:00:00.000Z'),
    completedAt: null,
  },

  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[1].email,
    eventName: 'NovaTech Annual Conference',
    title: 'Confirm ballroom layout',
    description: 'Approve the stage, attendee seating, registration desk, and sponsor-area plan.',
    status: EventTaskStatus.COMPLETED,
    priority: EventTaskPriority.HIGH,
    dueDate: new Date('2026-06-30T00:00:00.000Z'),
    completedAt: new Date('2026-06-29T08:45:00.000Z'),
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[1].email,
    eventName: 'NovaTech Annual Conference',
    title: 'Collect speaker presentations',
    description: 'Receive final presentation decks and confirm technical playback requirements.',
    status: EventTaskStatus.IN_PROGRESS,
    priority: EventTaskPriority.URGENT,
    dueDate: new Date('2026-08-25T00:00:00.000Z'),
    completedAt: null,
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[1].email,
    eventName: 'NovaTech Annual Conference',
    title: 'Finalize attendee registration form',
    description: 'Confirm required attendee fields, dietary questions, and confirmation messaging.',
    status: EventTaskStatus.IN_PROGRESS,
    priority: EventTaskPriority.HIGH,
    dueDate: new Date('2026-07-30T00:00:00.000Z'),
    completedAt: null,
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[1].email,
    eventName: 'NovaTech Annual Conference',
    title: 'Approve stage branding',
    description:
      'Review the main backdrop, sponsor logos, screen graphics, and directional signage.',
    status: EventTaskStatus.TODO,
    priority: EventTaskPriority.HIGH,
    dueDate: new Date('2026-08-12T00:00:00.000Z'),
    completedAt: null,
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[1].email,
    eventName: 'NovaTech Annual Conference',
    title: 'Prepare event-day run sheet',
    description: 'Create the final sequence covering registration, sessions, breaks, and closing.',
    status: EventTaskStatus.TODO,
    priority: EventTaskPriority.URGENT,
    dueDate: new Date('2026-09-10T00:00:00.000Z'),
    completedAt: null,
  },

  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[2].email,
    eventName: 'Olivia Birthday Celebration',
    title: 'Confirm garden venue',
    description: 'Review the venue terms and confirm access to the covered backup pavilion.',
    status: EventTaskStatus.COMPLETED,
    priority: EventTaskPriority.HIGH,
    dueDate: new Date('2026-07-03T00:00:00.000Z'),
    completedAt: new Date('2026-07-02T11:30:00.000Z'),
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[2].email,
    eventName: 'Olivia Birthday Celebration',
    title: 'Choose birthday cake design',
    description: 'Select the final flavour, size, colour palette, and decorative details.',
    status: EventTaskStatus.IN_PROGRESS,
    priority: EventTaskPriority.HIGH,
    dueDate: new Date('2026-07-25T00:00:00.000Z'),
    completedAt: null,
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[2].email,
    eventName: 'Olivia Birthday Celebration',
    title: 'Create music playlist',
    description: 'Prepare arrival, dinner, celebration, and closing music selections.',
    status: EventTaskStatus.TODO,
    priority: EventTaskPriority.LOW,
    dueDate: new Date('2026-08-15T00:00:00.000Z'),
    completedAt: null,
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[2].email,
    eventName: 'Olivia Birthday Celebration',
    title: 'Send digital invitations',
    description: 'Send the final invitation to guests and request responses before the deadline.',
    status: EventTaskStatus.TODO,
    priority: EventTaskPriority.MEDIUM,
    dueDate: new Date('2026-07-20T00:00:00.000Z'),
    completedAt: null,
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[2].email,
    eventName: 'Olivia Birthday Celebration',
    title: 'Confirm weather backup plan',
    description: 'Check the covered venue option and finalize any weather-related setup changes.',
    status: EventTaskStatus.CANCELLED,
    priority: EventTaskPriority.MEDIUM,
    dueDate: new Date('2026-08-22T00:00:00.000Z'),
    completedAt: null,
  },
] as const;

export const seedEventTasks = async (prisma: PrismaClient) => {
  let seededTaskCount = 0;

  for (const taskData of DEVELOPMENT_EVENT_TASKS) {
    const owner = await getRequiredUserByEmail(prisma, taskData.ownerEmail);

    const event = await getRequiredEventByNameAndOwner(prisma, taskData.eventName, owner.id);

    const existingTask = await prisma.eventTask.findFirst({
      where: {
        eventId: event.id,
        title: taskData.title,
      },
    });

    const taskValues = {
      title: taskData.title,
      description: taskData.description,
      status: taskData.status,
      priority: taskData.priority,
      dueDate: taskData.dueDate,
      completedAt: taskData.completedAt,
    };

    if (existingTask) {
      await prisma.eventTask.update({
        where: {
          id: existingTask.id,
        },
        data: taskValues,
      });
    } else {
      await prisma.eventTask.create({
        data: {
          eventId: event.id,
          ...taskValues,
        },
      });
    }

    seededTaskCount += 1;
  }

  console.log(`${seededTaskCount} event planning tasks seeded successfully.`);
};
