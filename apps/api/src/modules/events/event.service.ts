import { EventStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type {
  CreateEventInput,
  GetCustomerEventsQuery,
  UpdateCustomerEventInput,
  UpdateCustomerEventStatusInput,
} from './event.schemas.js';

const eventSelect = {
  id: true,
  name: true,
  eventType: true,
  eventDate: true,
  location: true,
  guestCount: true,
  plannedBudget: true,
  theme: true,
  requirements: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

type SelectedEvent = Prisma.EventGetPayload<{
  select: typeof eventSelect;
}>;

const formatEvent = (event: SelectedEvent) => ({
  ...event,
  plannedBudget: event.plannedBudget?.toFixed(2) ?? null,
});

const getOwnedEvent = async (ownerId: string, eventId: string) => {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      ownerId,
    },
    select: eventSelect,
  });

  if (!event) {
    throw new AppError(404, 'Event not found', 'EVENT_NOT_FOUND');
  }

  return event;
};

const getEventOrderBy = (
  sort: GetCustomerEventsQuery['sort'],
): Prisma.EventOrderByWithRelationInput => {
  switch (sort) {
    case 'newest':
      return {
        createdAt: 'desc',
      };

    case 'oldest':
      return {
        createdAt: 'asc',
      };

    case 'upcoming':
    default:
      return {
        eventDate: 'asc',
      };
  }
};

export const createCustomerEvent = async (ownerId: string, input: CreateEventInput) => {
  const event = await prisma.event.create({
    data: {
      ownerId,
      name: input.name,
      eventType: input.eventType,
      eventDate: new Date(input.eventDate),
      location: input.location,
      guestCount: input.guestCount ?? null,
      plannedBudget:
        input.plannedBudget === undefined || input.plannedBudget === null
          ? null
          : new Prisma.Decimal(input.plannedBudget),
      theme: input.theme ?? null,
      requirements: input.requirements ?? null,
    },
    select: eventSelect,
  });

  return formatEvent(event);
};

export const getCustomerEvents = async (ownerId: string, query: GetCustomerEventsQuery) => {
  const { status, page, limit, sort } = query;

  const where: Prisma.EventWhereInput = {
    ownerId,

    ...(status && {
      status,
    }),
  };

  const skip = (page - 1) * limit;

  const [events, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      select: eventSelect,
      orderBy: getEventOrderBy(sort),
      skip,
      take: limit,
    }),

    prisma.event.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    events: events.map(formatEvent),
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

export const getCustomerEventById = async (ownerId: string, eventId: string) => {
  const event = await getOwnedEvent(ownerId, eventId);

  return formatEvent(event);
};

export const updateCustomerEvent = async (
  ownerId: string,
  eventId: string,
  input: UpdateCustomerEventInput,
) => {
  const event = await getOwnedEvent(ownerId, eventId);

  if (event.status === EventStatus.COMPLETED || event.status === EventStatus.CANCELLED) {
    throw new AppError(409, 'Completed or cancelled events cannot be edited', 'EVENT_NOT_EDITABLE');
  }

  const updatedEvent = await prisma.event.update({
    where: {
      id: eventId,
    },
    data: {
      ...(input.name !== undefined && {
        name: input.name,
      }),

      ...(input.eventType !== undefined && {
        eventType: input.eventType,
      }),

      ...(input.eventDate !== undefined && {
        eventDate: new Date(input.eventDate),
      }),

      ...(input.location !== undefined && {
        location: input.location,
      }),

      ...(input.guestCount !== undefined && {
        guestCount: input.guestCount,
      }),

      ...(input.plannedBudget !== undefined && {
        plannedBudget:
          input.plannedBudget === null ? null : new Prisma.Decimal(input.plannedBudget),
      }),

      ...(input.theme !== undefined && {
        theme: input.theme,
      }),

      ...(input.requirements !== undefined && {
        requirements: input.requirements,
      }),
    },
    select: eventSelect,
  });

  return formatEvent(updatedEvent);
};

const allowedEventStatusTransitions: Record<EventStatus, EventStatus[]> = {
  [EventStatus.DRAFT]: [EventStatus.PLANNING, EventStatus.CANCELLED],

  [EventStatus.PLANNING]: [EventStatus.DRAFT, EventStatus.ACTIVE, EventStatus.CANCELLED],

  [EventStatus.ACTIVE]: [EventStatus.COMPLETED, EventStatus.CANCELLED],

  [EventStatus.COMPLETED]: [],

  [EventStatus.CANCELLED]: [],
};

export const updateCustomerEventStatus = async (
  ownerId: string,
  eventId: string,
  input: UpdateCustomerEventStatusInput,
) => {
  const event = await getOwnedEvent(ownerId, eventId);

  if (event.status === input.status) {
    throw new AppError(409, 'Event already has the requested status', 'EVENT_STATUS_UNCHANGED');
  }

  const allowedStatuses = allowedEventStatusTransitions[event.status];

  if (!allowedStatuses.includes(input.status)) {
    throw new AppError(
      409,
      `Event status cannot change from ${event.status} to ${input.status}`,
      'INVALID_EVENT_STATUS_TRANSITION',
    );
  }

  const updatedEvent = await prisma.event.update({
    where: {
      id: eventId,
    },
    data: {
      status: input.status,
    },
    select: eventSelect,
  });

  return formatEvent(updatedEvent);
};

export const deleteCustomerEvent = async (ownerId: string, eventId: string) => {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      ownerId,
    },
    select: {
      id: true,
      status: true,
      _count: {
        select: {
          quotationRequests: true,
          bookings: true,
        },
      },
    },
  });

  if (!event) {
    throw new AppError(404, 'Event not found', 'EVENT_NOT_FOUND');
  }

  if (event._count.quotationRequests > 0 || event._count.bookings > 0) {
    throw new AppError(
      409,
      'An event with quotation requests or bookings cannot be deleted',
      'EVENT_IN_USE',
    );
  }

  if (event.status !== EventStatus.DRAFT && event.status !== EventStatus.CANCELLED) {
    throw new AppError(
      409,
      'Only draft or cancelled events can be deleted',
      'EVENT_CANNOT_BE_DELETED',
    );
  }

  await prisma.event.delete({
    where: {
      id: eventId,
    },
  });
};
