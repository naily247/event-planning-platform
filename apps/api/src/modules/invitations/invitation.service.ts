import { createHash, randomBytes } from 'node:crypto';
import { GuestStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type {
  CreateInvitationBody,
  InvitationListQuery,
  PublicRsvpBody,
  RegenerateInvitationBody,
} from './invitation.schemas.js';
import { id } from 'zod/v4/locales';

const DEFAULT_EXPIRY_DAYS = 14;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const respondedGuestStatuses: GuestStatus[] = [
  GuestStatus.CONFIRMED,
  GuestStatus.DECLINED,
  GuestStatus.MAYBE,
];

const invitationSelect = {
  id: true,
  guestId: true,
  expiresAt: true,
  revokedAt: true,
  lastSentAt: true,
  createdAt: true,
  updatedAt: true,

  guest: {
    select: {
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
    },
  },
} as const;

type SelectedInvitation = Prisma.EventInvitationGetPayload<{
  select: typeof invitationSelect;
}>;

const publicInvitationSelect = {
  expiresAt: true,
  revokedAt: true,

  guest: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      partySize: true,
      mealPreference: true,
      dietaryRequirements: true,
      respondedAt: true,

      event: {
        select: {
          id: true,
          name: true,
          eventType: true,
          eventDate: true,
          location: true,
          theme: true,
        },
      },
    },
  },
} as const;

type SelectedPublicInvitation = Prisma.EventInvitationGetPayload<{
  select: typeof publicInvitationSelect;
}>;

const generateRawToken = () => randomBytes(32).toString('hex');

const hashInvitationToken = (token: string) => createHash('sha256').update(token).digest('hex');

const calculateExpiryDate = (expiresInDays?: number) => {
  const days = expiresInDays ?? DEFAULT_EXPIRY_DAYS;

  return new Date(Date.now() + days * MILLISECONDS_PER_DAY);
};

const buildInvitationUrl = (rawToken: string) => {
  const clientUrl = process.env.CLIENT_URL?.replace(/\/+$/, '') ?? 'http://localhost:5173';

  return `${clientUrl}/invitations/respond/${rawToken}`;
};

const isInvitationExpired = (expiresAt: Date) => expiresAt.getTime() <= Date.now();

const isGuestResponded = (status: GuestStatus) => respondedGuestStatuses.includes(status);

const formatInvitation = (invitation: SelectedInvitation) => {
  const expired = isInvitationExpired(invitation.expiresAt);
  const revoked = invitation.revokedAt !== null;

  return {
    ...invitation,
    isExpired: expired,
    isRevoked: revoked,
    isActive: !expired && !revoked,
    hasResponded: isGuestResponded(invitation.guest.status),
  };
};

const formatPublicInvitation = (invitation: SelectedPublicInvitation) => ({
  event: {
    id: invitation.guest.event.id,
    name: invitation.guest.event.name,
    eventType: invitation.guest.event.eventType,
    eventDate: invitation.guest.event.eventDate,
    location: invitation.guest.event.location,
    theme: invitation.guest.event.theme,
  },

  guest: {
    id: invitation.guest.id,
    firstName: invitation.guest.firstName,
    lastName: invitation.guest.lastName,
    status: invitation.guest.status,
    partySize: invitation.guest.partySize,
    mealPreference: invitation.guest.mealPreference,
    dietaryRequirements: invitation.guest.dietaryRequirements,
  },

  invitation: {
    expiresAt: invitation.expiresAt,
    hasResponded: invitation.guest.respondedAt !== null,
  },
});

const getOwnedEvent = async (ownerId: string, eventId: string) => {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      ownerId,
    },
    select: {
      id: true,
      name: true,
      eventType: true,
      eventDate: true,
      location: true,
      theme: true,
    },
  });

  if (!event) {
    throw new AppError(404, 'Event not found', 'EVENT_NOT_FOUND');
  }

  return event;
};

const getOwnedGuest = async (ownerId: string, eventId: string, guestId: string) => {
  await getOwnedEvent(ownerId, eventId);

  const guest = await prisma.guest.findFirst({
    where: {
      id: guestId,
      eventId,

      event: {
        ownerId,
      },
    },
    select: {
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
    },
  });

  if (!guest) {
    throw new AppError(404, 'Guest not found', 'GUEST_NOT_FOUND');
  }

  return guest;
};

const getInvitationOrderBy = (
  sort: InvitationListQuery['sort'],
): Prisma.EventInvitationOrderByWithRelationInput[] => {
  switch (sort) {
    case 'oldest':
      return [
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ];

    case 'expires_soon':
      return [
        {
          expiresAt: 'asc',
        },
        {
          id: 'asc',
        },
      ];

    case 'guest_name_asc':
      return [
        {
          guest: {
            firstName: 'asc',
          },
        },
        {
          guest: {
            lastName: 'asc',
          },
        },
        {
          id: 'asc',
        },
      ];

    case 'guest_name_desc':
      return [
        {
          guest: {
            firstName: 'desc',
          },
        },
        {
          guest: {
            lastName: 'desc',
          },
        },
        {
          id: 'desc',
        },
      ];

    case 'newest':
    default:
      return [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ];
  }
};

const getPublicInvitationByToken = async (rawToken: string) => {
  const tokenHash = hashInvitationToken(rawToken);

  const invitation = await prisma.eventInvitation.findUnique({
    where: {
      tokenHash,
    },
    select: publicInvitationSelect,
  });

  if (!invitation) {
    throw new AppError(404, 'Invitation not found', 'INVITATION_NOT_FOUND');
  }

  if (invitation.revokedAt) {
    throw new AppError(410, 'The invitation has been revoked', 'INVITATION_REVOKED');
  }

  if (isInvitationExpired(invitation.expiresAt)) {
    throw new AppError(410, 'The invitation has expired', 'INVITATION_EXPIRED');
  }

  return invitation;
};

export const createInvitation = async (
  ownerId: string,
  eventId: string,
  guestId: string,
  input: CreateInvitationBody,
) => {
  const guest = await getOwnedGuest(ownerId, eventId, guestId);

  const existingInvitation = await prisma.eventInvitation.findUnique({
    where: {
      guestId: guest.id,
    },
    select: {
      id: true,
    },
  });

  if (existingInvitation) {
    throw new AppError(
      409,
      'An invitation already exists for this guest',
      'INVITATION_ALREADY_EXISTS',
    );
  }

  const rawToken = generateRawToken();
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = calculateExpiryDate(input.expiresInDays);
  const now = new Date();

  const invitation = await prisma.$transaction(async (transaction) => {
    const createdInvitation = await transaction.eventInvitation.create({
      data: {
        guestId: guest.id,
        tokenHash,
        expiresAt,
        lastSentAt: now,
      },
      select: invitationSelect,
    });

    await transaction.guest.update({
      where: {
        id: guest.id,
      },
      data: {
        status: GuestStatus.INVITED,
        invitedAt: now,
        respondedAt: null,
      },
    });

    return transaction.eventInvitation.findUniqueOrThrow({
      where: {
        id: createdInvitation.id,
      },
      select: invitationSelect,
    });
  });

  return {
    invitation: formatInvitation(invitation),
    token: rawToken,
    invitationUrl: buildInvitationUrl(rawToken),
  };
};

export const regenerateInvitation = async (
  ownerId: string,
  eventId: string,
  guestId: string,
  input: RegenerateInvitationBody,
) => {
  const guest = await getOwnedGuest(ownerId, eventId, guestId);

  const existingInvitation = await prisma.eventInvitation.findUnique({
    where: {
      guestId: guest.id,
    },
    select: {
      id: true,
    },
  });

  if (!existingInvitation) {
    throw new AppError(404, 'Invitation not found', 'INVITATION_NOT_FOUND');
  }

  const rawToken = generateRawToken();
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = calculateExpiryDate(input.expiresInDays);
  const now = new Date();

  const invitation = await prisma.$transaction(async (transaction) => {
    await transaction.eventInvitation.update({
      where: {
        id: existingInvitation.id,
      },
      data: {
        tokenHash,
        expiresAt,
        revokedAt: null,
        lastSentAt: now,
      },
    });

    await transaction.guest.update({
      where: {
        id: guest.id,
      },
      data: {
        status: GuestStatus.INVITED,
        invitedAt: now,
        respondedAt: null,
      },
    });

    return transaction.eventInvitation.findUniqueOrThrow({
      where: {
        id: existingInvitation.id,
      },
      select: invitationSelect,
    });
  });

  return {
    invitation: formatInvitation(invitation),
    token: rawToken,
    invitationUrl: buildInvitationUrl(rawToken),
  };
};

export const revokeInvitation = async (ownerId: string, eventId: string, guestId: string) => {
  const guest = await getOwnedGuest(ownerId, eventId, guestId);

  const invitation = await prisma.eventInvitation.findUnique({
    where: {
      guestId: guest.id,
    },
    select: {
      id: true,
      revokedAt: true,
    },
  });

  if (!invitation) {
    throw new AppError(404, 'Invitation not found', 'INVITATION_NOT_FOUND');
  }

  if (invitation.revokedAt) {
    throw new AppError(
      409,
      'The invitation has already been revoked',
      'INVITATION_ALREADY_REVOKED',
    );
  }

  const revokedInvitation = await prisma.eventInvitation.update({
    where: {
      id: invitation.id,
    },
    data: {
      revokedAt: new Date(),
    },
    select: invitationSelect,
  });

  return formatInvitation(revokedInvitation);
};

export const getInvitation = async (ownerId: string, eventId: string, guestId: string) => {
  const guest = await getOwnedGuest(ownerId, eventId, guestId);

  const invitation = await prisma.eventInvitation.findUnique({
    where: {
      guestId: guest.id,
    },
    select: invitationSelect,
  });

  if (!invitation) {
    throw new AppError(404, 'Invitation not found', 'INVITATION_NOT_FOUND');
  }

  return formatInvitation(invitation);
};

export const getEventInvitations = async (
  ownerId: string,
  eventId: string,
  query: InvitationListQuery,
) => {
  await getOwnedEvent(ownerId, eventId);

  const { status, search, page, limit, sort } = query;
  const now = new Date();

  const where: Prisma.EventInvitationWhereInput = {
    guest: {
      eventId,

      event: {
        ownerId,
      },

      ...(search && {
        OR: [
          {
            firstName: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    },

    ...(status === 'active' && {
      revokedAt: null,
      expiresAt: {
        gt: now,
      },
    }),

    ...(status === 'expired' && {
      revokedAt: null,
      expiresAt: {
        lte: now,
      },
    }),

    ...(status === 'revoked' && {
      revokedAt: {
        not: null,
      },
    }),

    ...(status === 'responded' && {
      guest: {
        eventId,

        event: {
          ownerId,
        },

        status: {
          in: respondedGuestStatuses,
        },

        ...(search && {
          OR: [
            {
              firstName: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              lastName: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }),
      },
    }),

    ...(status === 'unresponded' && {
      guest: {
        eventId,

        event: {
          ownerId,
        },

        status: {
          notIn: respondedGuestStatuses,
        },

        ...(search && {
          OR: [
            {
              firstName: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              lastName: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }),
      },
    }),
  };

  const skip = (page - 1) * limit;

  const [invitations, total] = await prisma.$transaction([
    prisma.eventInvitation.findMany({
      where,
      select: invitationSelect,
      orderBy: getInvitationOrderBy(sort),
      skip,
      take: limit,
    }),

    prisma.eventInvitation.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    invitations: invitations.map(formatInvitation),

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

export const getPublicInvitation = async (rawToken: string) => {
  const invitation = await getPublicInvitationByToken(rawToken);

  return formatPublicInvitation(invitation);
};

export const submitPublicRsvp = async (rawToken: string, input: PublicRsvpBody) => {
  const tokenHash = hashInvitationToken(rawToken);

  const invitation = await prisma.eventInvitation.findUnique({
    where: {
      tokenHash,
    },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,

      guest: {
        select: {
          id: true,
          invitedAt: true,
        },
      },
    },
  });

  if (!invitation) {
    throw new AppError(404, 'Invitation not found', 'INVITATION_NOT_FOUND');
  }

  if (invitation.revokedAt) {
    throw new AppError(410, 'The invitation has been revoked', 'INVITATION_REVOKED');
  }

  if (isInvitationExpired(invitation.expiresAt)) {
    throw new AppError(410, 'The invitation has expired', 'INVITATION_EXPIRED');
  }

  const now = new Date();

  await prisma.guest.update({
    where: {
      id: invitation.guest.id,
    },
    data: {
      status: input.status,
      partySize: input.partySize,

      ...(input.mealPreference !== undefined && {
        mealPreference: input.mealPreference,
      }),

      ...(input.dietaryRequirements !== undefined && {
        dietaryRequirements: input.dietaryRequirements,
      }),

      invitedAt: invitation.guest.invitedAt ?? now,
      respondedAt: now,
    },
  });

  const updatedInvitation = await prisma.eventInvitation.findUniqueOrThrow({
    where: {
      id: invitation.id,
    },
    select: publicInvitationSelect,
  });

  return formatPublicInvitation(updatedInvitation);
};
