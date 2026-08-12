import { BookingStatus, EventStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type {
  CreateEventInput,
  GetCustomerEventsQuery,
  UpdateCustomerEventInput,
  UpdateCustomerEventStatusInput,
} from './event.schemas.js';
import {
  canDeleteEventAtStatus,
  canMutateEventWorkspace,
  canTransitionEventStatus,
  getAllowedEventStatusTransitions,
  getWorkspaceLockedMessage,
} from './event.lifecycle.js';

const eventSelect = {
  id: true,
  name: true,
  eventType: true,
  invitationTemplate: true,
  invitationArtwork: true,
  invitationFont: true,
  invitationGradient: true,
  invitationAccentColor: true,
  invitationArtworkPosition: true,
  invitationDesignConfirmedAt: true,
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

const eventStatusHistorySelect = {
  id: true,
  previousStatus: true,
  newStatus: true,
  changedById: true,
  note: true,
  changedAt: true,
} as const;

const eventDetailsSelect = {
  ...eventSelect,

  statusHistory: {
    select: eventStatusHistorySelect,
    orderBy: {
      changedAt: 'asc',
    },
  },
} as const;

type SelectedEvent = Prisma.EventGetPayload<{
  select: typeof eventSelect;
}>;

type SelectedEventDetails = Prisma.EventGetPayload<{
  select: typeof eventDetailsSelect;
}>;

type PrismaEventType = Prisma.EventCreateInput['eventType'];

type PrismaInvitationTemplate = NonNullable<SelectedEvent['invitationTemplate']>;

const eventTypeMap: Record<CreateEventInput['eventType'], PrismaEventType> = {
  Birthday: 'BIRTHDAY',
  Wedding: 'WEDDING',
  Graduation: 'GRADUATION',
  Corporate: 'CORPORATE',
  Party: 'PARTY',
  'Baby Shower': 'BABY_SHOWER',
  Engagement: 'ENGAGEMENT',
  Festival: 'FESTIVAL',
  Anniversary: 'ANNIVERSARY',
  Reception: 'RECEPTION',
  'Product Launch': 'PRODUCT_LAUNCH',
};

const invitationTemplatePrefixMap: Record<PrismaEventType, string> = {
  BIRTHDAY: 'BIRTHDAY_',
  WEDDING: 'WEDDING_',
  GRADUATION: 'GRADUATION_',
  CORPORATE: 'CORPORATE_',
  PARTY: 'PARTY_',
  BABY_SHOWER: 'BABY_SHOWER_',
  ENGAGEMENT: 'ENGAGEMENT_',
  FESTIVAL: 'FESTIVAL_',
  ANNIVERSARY: 'ANNIVERSARY_',
  RECEPTION: 'RECEPTION_',
  PRODUCT_LAUNCH: 'PRODUCT_LAUNCH_',
};

const toEventType = (eventType: CreateEventInput['eventType']): PrismaEventType => {
  return eventTypeMap[eventType];
};

const invitationTemplateMatchesEventType = (
  eventType: PrismaEventType,
  invitationTemplate: PrismaInvitationTemplate,
) => {
  return invitationTemplate.startsWith(invitationTemplatePrefixMap[eventType]);
};

const assertInvitationTemplateMatchesEventType = (
  eventType: PrismaEventType,
  invitationTemplate: PrismaInvitationTemplate | null,
) => {
  if (invitationTemplate && !invitationTemplateMatchesEventType(eventType, invitationTemplate)) {
    throw new AppError(
      400,
      'Invitation template must match the selected event type',
      'INVITATION_TEMPLATE_EVENT_TYPE_MISMATCH',
    );
  }
};

const formatEvent = <T extends SelectedEvent>(event: T) => ({
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

const getOwnedEventDetails = async (ownerId: string, eventId: string) => {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      ownerId,
    },
    select: eventDetailsSelect,
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
  const eventType = toEventType(input.eventType);

  const event = await prisma.$transaction(async (transaction) => {
    const createdEvent = await transaction.event.create({
      data: {
        ownerId,
        name: input.name,
        eventType,
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
      select: {
        id: true,
      },
    });

    await transaction.eventStatusHistory.create({
      data: {
        eventId: createdEvent.id,
        previousStatus: null,
        newStatus: EventStatus.DRAFT,
        changedById: ownerId,
        note: 'Event created in the draft stage.',
      },
    });

    const createdEventDetails = await transaction.event.findUnique({
      where: {
        id: createdEvent.id,
      },
      select: eventDetailsSelect,
    });

    if (!createdEventDetails) {
      throw new AppError(
        500,
        'The event was created but could not be retrieved',
        'EVENT_CREATION_RETRIEVAL_FAILED',
      );
    }

    return createdEventDetails;
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
  const event = await getOwnedEventDetails(ownerId, eventId);

  return formatEvent(event);
};

export const updateCustomerEvent = async (
  ownerId: string,
  eventId: string,
  input: UpdateCustomerEventInput,
) => {
  const event = await getOwnedEvent(ownerId, eventId);

  if (!canMutateEventWorkspace(event.status, 'EVENT_DETAILS')) {
    throw new AppError(
      409,
      getWorkspaceLockedMessage(event.status, 'EVENT_DETAILS'),
      'EVENT_NOT_EDITABLE',
    );
  }

  const isInvitationDesignUpdate =
    input.eventType !== undefined ||
    input.invitationTemplate !== undefined ||
    input.invitationArtwork !== undefined ||
    input.invitationFont !== undefined ||
    input.invitationGradient !== undefined ||
    input.invitationAccentColor !== undefined ||
    input.invitationArtworkPosition !== undefined;

  if (event.invitationDesignConfirmedAt && isInvitationDesignUpdate) {
    throw new AppError(
      409,
      'The invitation design for this event has already been confirmed and can no longer be changed',
      'INVITATION_DESIGN_LOCKED',
    );
  }

  const nextEventType =
    input.eventType !== undefined ? toEventType(input.eventType) : event.eventType;

  const nextInvitationTemplate =
    input.invitationTemplate !== undefined ? input.invitationTemplate : event.invitationTemplate;

  assertInvitationTemplateMatchesEventType(nextEventType, nextInvitationTemplate);

  const updatedEvent = await prisma.event.update({
    where: {
      id: eventId,
    },
    data: {
      ...(input.name !== undefined && {
        name: input.name,
      }),

      ...(input.eventType !== undefined && {
        eventType: nextEventType,
      }),

      ...(input.invitationTemplate !== undefined && {
        invitationTemplate: input.invitationTemplate,
      }),

      ...(input.invitationArtwork !== undefined && {
        invitationArtwork: input.invitationArtwork,
      }),

      ...(input.invitationFont !== undefined && {
        invitationFont: input.invitationFont,
      }),

      ...(input.invitationGradient !== undefined && {
        invitationGradient: input.invitationGradient,
      }),

      ...(input.invitationAccentColor !== undefined && {
        invitationAccentColor: input.invitationAccentColor,
      }),

      ...(input.invitationArtworkPosition !== undefined && {
        invitationArtworkPosition: input.invitationArtworkPosition,
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
    select: eventDetailsSelect,
  });

  return formatEvent(updatedEvent);
};

export const confirmCustomerInvitationDesign = async (ownerId: string, eventId: string) => {
  const event = await getOwnedEvent(ownerId, eventId);

  if (event.status === EventStatus.COMPLETED || event.status === EventStatus.CANCELLED) {
    throw new AppError(
      409,
      'Completed or cancelled events cannot confirm an invitation design',
      'EVENT_NOT_EDITABLE',
    );
  }

  if (event.invitationDesignConfirmedAt) {
    throw new AppError(
      409,
      'The invitation design for this event has already been confirmed',
      'INVITATION_DESIGN_ALREADY_CONFIRMED',
    );
  }

  if (!event.invitationTemplate) {
    throw new AppError(
      400,
      'Choose and apply an invitation design before confirming it',
      'INVITATION_DESIGN_REQUIRED',
    );
  }

  const updatedEvent = await prisma.event.update({
    where: {
      id: eventId,
    },
    data: {
      invitationDesignConfirmedAt: new Date(),
    },
    select: eventDetailsSelect,
  });

  return formatEvent(updatedEvent);
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

  if (!canTransitionEventStatus(event.status, input.status)) {
    const allowedStatuses = getAllowedEventStatusTransitions(event.status);

    const allowedStatusMessage =
      allowedStatuses.length > 0
        ? ` Allowed next ${allowedStatuses.length === 1 ? 'status is' : 'statuses are'}: ${allowedStatuses.join(
            ', ',
          )}.`
        : ' This event is already in a terminal status and cannot transition further.';

    throw new AppError(
      409,
      `Event status cannot change from ${event.status} to ${input.status}.${allowedStatusMessage}`,
      'INVALID_EVENT_STATUS_TRANSITION',
    );
  }

  if (input.status === EventStatus.COMPLETED) {
    const unfinishedBookingCount = await prisma.booking.count({
      where: {
        eventId,
        status: {
          in: [
            BookingStatus.AWAITING_VENDOR_CONFIRMATION,
            BookingStatus.CONFIRMED,
            BookingStatus.DEPOSIT_PENDING,
            BookingStatus.ACTIVE,
            BookingStatus.DISPUTED,
          ],
        },
      },
    });

    if (unfinishedBookingCount > 0) {
      throw new AppError(
        409,
        `This event cannot be completed while ${unfinishedBookingCount} ${
          unfinishedBookingCount === 1 ? 'booking still requires' : 'bookings still require'
        } resolution or completion`,
        'EVENT_HAS_UNFINISHED_BOOKINGS',
      );
    }
  }

  const updatedEvent = await prisma.$transaction(async (transaction) => {
    const updateResult = await transaction.event.updateMany({
      where: {
        id: eventId,
        ownerId,
        status: event.status,
      },
      data: {
        status: input.status,
      },
    });

    if (updateResult.count !== 1) {
      throw new AppError(
        409,
        'The event status changed before this request could be completed. Refresh and try again.',
        'EVENT_STATUS_CONFLICT',
      );
    }

    await transaction.eventStatusHistory.create({
      data: {
        eventId,
        previousStatus: event.status,
        newStatus: input.status,
        changedById: ownerId,
        note: `Event status changed from ${event.status} to ${input.status}.`,
      },
    });

    const updatedEventDetails = await transaction.event.findUnique({
      where: {
        id: eventId,
      },
      select: eventDetailsSelect,
    });

    if (!updatedEventDetails) {
      throw new AppError(
        500,
        'The event status was updated but the event could not be retrieved',
        'EVENT_STATUS_UPDATE_RETRIEVAL_FAILED',
      );
    }

    return updatedEventDetails;
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

  if (!canDeleteEventAtStatus(event.status)) {
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
