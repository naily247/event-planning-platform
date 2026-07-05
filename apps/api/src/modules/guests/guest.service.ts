import { GuestStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type {
  CreateGuestInput,
  ListGuestsQuery,
  UpdateGuestInput,
  UpdateGuestRsvpInput,
} from './guest.schemas.js';

const guestSelect = {
  id: true,
  eventId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  groupName: true,
  status: true,
  partySize: true,
  mealPreference: true,
  dietaryRequirements: true,
  notes: true,
  invitedAt: true,
  respondedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const respondedStatuses: GuestStatus[] = [
  GuestStatus.CONFIRMED,
  GuestStatus.DECLINED,
  GuestStatus.MAYBE,
];

const normalizeOptionalText = (value: string | null | undefined) => {
  if (value === undefined) {
    return undefined;
  }

  return value === null ? null : value.trim();
};

const normalizeEmail = (email: string | null | undefined) => {
  if (email === undefined) {
    return undefined;
  }

  return email === null ? null : email.trim().toLowerCase();
};

const getGuestTimestampsForStatus = (
  status: GuestStatus,
  existingInvitedAt: Date | null = null,
) => {
  const now = new Date();

  switch (status) {
    case GuestStatus.NOT_INVITED:
      return {
        invitedAt: null,
        respondedAt: null,
      };

    case GuestStatus.INVITED:
      return {
        invitedAt: existingInvitedAt ?? now,
        respondedAt: null,
      };

    case GuestStatus.CONFIRMED:
    case GuestStatus.DECLINED:
    case GuestStatus.MAYBE:
      return {
        invitedAt: existingInvitedAt ?? now,
        respondedAt: now,
      };
  }
};

const getOwnedEvent = async (ownerId: string, eventId: string) => {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      ownerId,
    },

    select: {
      id: true,
      name: true,
      eventDate: true,
      status: true,
      guestCount: true,
    },
  });

  if (!event) {
    throw new AppError(404, 'Event not found', 'EVENT_NOT_FOUND');
  }

  return event;
};

const getOwnedGuest = async (ownerId: string, eventId: string, guestId: string) => {
  const guest = await prisma.guest.findFirst({
    where: {
      id: guestId,
      eventId,

      event: {
        ownerId,
      },
    },

    select: guestSelect,
  });

  if (!guest) {
    throw new AppError(404, 'Guest not found', 'GUEST_NOT_FOUND');
  }

  return guest;
};

const ensureUniqueGuestEmail = async (
  eventId: string,
  email: string | null | undefined,
  excludedGuestId?: string,
) => {
  if (!email) {
    return;
  }

  const existingGuest = await prisma.guest.findFirst({
    where: {
      eventId,
      email,

      ...(excludedGuestId && {
        id: {
          not: excludedGuestId,
        },
      }),
    },

    select: {
      id: true,
    },
  });

  if (existingGuest) {
    throw new AppError(
      409,
      'A guest with this email already exists for the event',
      'GUEST_EMAIL_ALREADY_EXISTS',
    );
  }
};

const handleGuestPrismaError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError(
      409,
      'A guest with this email already exists for the event',
      'GUEST_EMAIL_ALREADY_EXISTS',
    );
  }

  throw error;
};

const getGuestOrderBy = (sort: ListGuestsQuery['sort']): Prisma.GuestOrderByWithRelationInput[] => {
  switch (sort) {
    case 'oldest':
      return [
        {
          createdAt: 'asc',
        },
      ];

    case 'name_asc':
      return [
        {
          firstName: 'asc',
        },
        {
          lastName: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ];

    case 'name_desc':
      return [
        {
          firstName: 'desc',
        },
        {
          lastName: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'party_size_highest':
      return [
        {
          partySize: 'desc',
        },
        {
          firstName: 'asc',
        },
        {
          lastName: 'asc',
        },
      ];

    case 'party_size_lowest':
      return [
        {
          partySize: 'asc',
        },
        {
          firstName: 'asc',
        },
        {
          lastName: 'asc',
        },
      ];

    case 'newest':
    default:
      return [
        {
          createdAt: 'desc',
        },
      ];
  }
};

export const createGuest = async (ownerId: string, eventId: string, input: CreateGuestInput) => {
  await getOwnedEvent(ownerId, eventId);

  const email = normalizeEmail(input.email);
  const status = input.status ?? GuestStatus.NOT_INVITED;

  await ensureUniqueGuestEmail(eventId, email);

  const timestamps = getGuestTimestampsForStatus(status);

  try {
    return await prisma.guest.create({
      data: {
        eventId,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: email ?? null,
        phone: normalizeOptionalText(input.phone) ?? null,
        groupName: normalizeOptionalText(input.groupName) ?? null,
        status,
        partySize: input.partySize ?? 1,
        mealPreference: normalizeOptionalText(input.mealPreference) ?? null,
        dietaryRequirements: normalizeOptionalText(input.dietaryRequirements) ?? null,
        notes: normalizeOptionalText(input.notes) ?? null,
        invitedAt: timestamps.invitedAt,
        respondedAt: timestamps.respondedAt,
      },

      select: guestSelect,
    });
  } catch (error) {
    return handleGuestPrismaError(error);
  }
};

export const getEventGuests = async (ownerId: string, eventId: string, query: ListGuestsQuery) => {
  await getOwnedEvent(ownerId, eventId);

  const where: Prisma.GuestWhereInput = {
    eventId,

    ...(query.status && {
      status: query.status,
    }),

    ...(query.groupName && {
      groupName: {
        equals: query.groupName,
        mode: 'insensitive',
      },
    }),

    ...(query.search && {
      OR: [
        {
          firstName: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          lastName: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          phone: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          groupName: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ],
    }),
  };

  const skip = (query.page - 1) * query.limit;

  const [guests, total] = await prisma.$transaction([
    prisma.guest.findMany({
      where,
      select: guestSelect,
      orderBy: getGuestOrderBy(query.sort),
      skip,
      take: query.limit,
    }),

    prisma.guest.count({
      where,
    }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

  return {
    guests,

    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    },
  };
};

export const getGuestById = async (ownerId: string, eventId: string, guestId: string) =>
  getOwnedGuest(ownerId, eventId, guestId);

export const updateGuest = async (
  ownerId: string,
  eventId: string,
  guestId: string,
  input: UpdateGuestInput,
) => {
  await getOwnedGuest(ownerId, eventId, guestId);

  const email = normalizeEmail(input.email);

  if (email !== undefined) {
    await ensureUniqueGuestEmail(eventId, email, guestId);
  }

  try {
    return await prisma.guest.update({
      where: {
        id: guestId,
      },

      data: {
        ...(input.firstName !== undefined && {
          firstName: input.firstName.trim(),
        }),

        ...(input.lastName !== undefined && {
          lastName: input.lastName.trim(),
        }),

        ...(input.email !== undefined && {
          email: email ?? null,
        }),

        ...(input.phone !== undefined && {
          phone: normalizeOptionalText(input.phone),
        }),

        ...(input.groupName !== undefined && {
          groupName: normalizeOptionalText(input.groupName),
        }),

        ...(input.partySize !== undefined && {
          partySize: input.partySize,
        }),

        ...(input.mealPreference !== undefined && {
          mealPreference: normalizeOptionalText(input.mealPreference),
        }),

        ...(input.dietaryRequirements !== undefined && {
          dietaryRequirements: normalizeOptionalText(input.dietaryRequirements),
        }),

        ...(input.notes !== undefined && {
          notes: normalizeOptionalText(input.notes),
        }),
      },

      select: guestSelect,
    });
  } catch (error) {
    return handleGuestPrismaError(error);
  }
};

export const updateGuestRsvp = async (
  ownerId: string,
  eventId: string,
  guestId: string,
  input: UpdateGuestRsvpInput,
) => {
  const existingGuest = await getOwnedGuest(ownerId, eventId, guestId);

  if (existingGuest.status === input.status) {
    throw new AppError(409, `Guest status is already ${input.status}`, 'GUEST_STATUS_UNCHANGED');
  }

  const timestamps = getGuestTimestampsForStatus(input.status, existingGuest.invitedAt);

  return prisma.guest.update({
    where: {
      id: guestId,
    },

    data: {
      status: input.status,
      invitedAt: timestamps.invitedAt,
      respondedAt: timestamps.respondedAt,
    },

    select: guestSelect,
  });
};

export const deleteGuest = async (ownerId: string, eventId: string, guestId: string) => {
  await getOwnedGuest(ownerId, eventId, guestId);

  await prisma.guest.delete({
    where: {
      id: guestId,
    },
  });
};

export const getGuestSummary = async (ownerId: string, eventId: string) => {
  const event = await getOwnedEvent(ownerId, eventId);

  const guests = await prisma.guest.findMany({
    where: {
      eventId,
    },

    select: {
      status: true,
      partySize: true,
    },
  });

  let notInvited = 0;
  let invited = 0;
  let confirmed = 0;
  let declined = 0;
  let maybe = 0;
  let totalExpectedAttendees = 0;
  let confirmedAttendees = 0;
  let respondedGuests = 0;
  let invitedGuests = 0;

  for (const guest of guests) {
    switch (guest.status) {
      case GuestStatus.NOT_INVITED:
        notInvited += 1;
        break;

      case GuestStatus.INVITED:
        invited += 1;
        invitedGuests += 1;
        break;

      case GuestStatus.CONFIRMED:
        confirmed += 1;
        invitedGuests += 1;
        respondedGuests += 1;
        confirmedAttendees += guest.partySize;
        break;

      case GuestStatus.DECLINED:
        declined += 1;
        invitedGuests += 1;
        respondedGuests += 1;
        break;

      case GuestStatus.MAYBE:
        maybe += 1;
        invitedGuests += 1;
        respondedGuests += 1;
        break;
    }

    if (guest.status !== GuestStatus.DECLINED) {
      totalExpectedAttendees += guest.partySize;
    }
  }

  const responseRate =
    invitedGuests === 0 ? 0 : Number(((respondedGuests / invitedGuests) * 100).toFixed(2));

  return {
    event: {
      id: event.id,
      name: event.name,
      eventDate: event.eventDate,
      status: event.status,
      plannedGuestCount: event.guestCount,
    },

    summary: {
      totalGuests: guests.length,
      totalExpectedAttendees,
      notInvited,
      invited,
      confirmed,
      declined,
      maybe,
      confirmedAttendees,
      invitedGuests,
      respondedGuests,
      responseRate,
    },
  };
};
