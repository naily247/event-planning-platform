import { MoodBoardCategory, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { deleteCloudinaryAsset } from '../../services/cloudinary.service.js';
import { AppError } from '../../utils/AppError.js';
import type {
  CreateMoodBoardItemInput,
  ListMoodBoardItemsQuery,
  UpdateMoodBoardItemInput,
} from './moodBoard.schemas.js';

const moodBoardItemSelect = {
  id: true,
  eventId: true,
  vendorId: true,
  title: true,
  description: true,
  category: true,
  imageUrl: true,
  imagePublicId: true,
  sourceUrl: true,
  colorTags: true,
  createdAt: true,
  updatedAt: true,

  vendor: {
    select: {
      id: true,
      businessName: true,
      slug: true,
      verificationStatus: true,
    },
  },
} as const;

const normalizeOptionalText = (value: string | null | undefined) => {
  if (value === undefined) {
    return undefined;
  }

  return value === null ? null : value.trim();
};

const normalizeOptionalUrl = (value: string | null | undefined) => {
  if (value === undefined) {
    return undefined;
  }

  return value === null ? null : value.trim();
};

const normalizeColorTags = (colorTags: string[] | undefined) => {
  if (colorTags === undefined) {
    return undefined;
  }

  return [...new Set(colorTags.map((tag) => tag.trim()))];
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
    },
  });

  if (!event) {
    throw new AppError(404, 'Event not found', 'EVENT_NOT_FOUND');
  }

  return event;
};

const getOwnedMoodBoardItem = async (ownerId: string, eventId: string, itemId: string) => {
  const item = await prisma.moodBoardItem.findFirst({
    where: {
      id: itemId,
      eventId,

      event: {
        ownerId,
      },
    },

    select: moodBoardItemSelect,
  });

  if (!item) {
    throw new AppError(404, 'Mood-board item not found', 'MOOD_BOARD_ITEM_NOT_FOUND');
  }

  return item;
};

const ensureVendorExists = async (vendorId: string | null | undefined) => {
  if (!vendorId) {
    return;
  }

  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      id: vendorId,
    },

    select: {
      id: true,
    },
  });

  if (!vendor) {
    throw new AppError(404, 'Vendor not found', 'VENDOR_NOT_FOUND');
  }
};

const ensureItemHasVisualOrSource = (imageUrl: string | null, sourceUrl: string | null) => {
  if (!imageUrl && !sourceUrl) {
    throw new AppError(
      400,
      'Either an image URL or source URL must be provided',
      'MOOD_BOARD_IMAGE_OR_SOURCE_REQUIRED',
    );
  }
};

const getMoodBoardItemOrderBy = (
  sort: ListMoodBoardItemsQuery['sort'],
): Prisma.MoodBoardItemOrderByWithRelationInput[] => {
  switch (sort) {
    case 'oldest':
      return [
        {
          createdAt: 'asc',
        },
      ];

    case 'title_asc':
      return [
        {
          title: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ];

    case 'title_desc':
      return [
        {
          title: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'category_asc':
      return [
        {
          category: 'asc',
        },
        {
          title: 'asc',
        },
      ];

    case 'category_desc':
      return [
        {
          category: 'desc',
        },
        {
          title: 'asc',
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

export const createMoodBoardItem = async (
  ownerId: string,
  eventId: string,
  input: CreateMoodBoardItemInput,
) => {
  await getOwnedEvent(ownerId, eventId);
  await ensureVendorExists(input.vendorId);

  const imageUrl = normalizeOptionalUrl(input.imageUrl) ?? null;
  const sourceUrl = normalizeOptionalUrl(input.sourceUrl) ?? null;

  ensureItemHasVisualOrSource(imageUrl, sourceUrl);

  return prisma.moodBoardItem.create({
    data: {
      eventId,
      vendorId: input.vendorId ?? null,
      title: input.title.trim(),
      description: normalizeOptionalText(input.description) ?? null,
      category: input.category ?? MoodBoardCategory.OTHER,
      imageUrl,
      imagePublicId: normalizeOptionalText(input.imagePublicId) ?? null,
      sourceUrl,
      colorTags: normalizeColorTags(input.colorTags) ?? [],
    },

    select: moodBoardItemSelect,
  });
};

export const getMoodBoardItems = async (
  ownerId: string,
  eventId: string,
  query: ListMoodBoardItemsQuery,
) => {
  await getOwnedEvent(ownerId, eventId);

  const where: Prisma.MoodBoardItemWhereInput = {
    eventId,

    ...(query.category && {
      category: query.category,
    }),

    ...(query.vendorId && {
      vendorId: query.vendorId,
    }),

    ...(query.hasImage !== undefined && {
      imageUrl: query.hasImage
        ? {
            not: null,
          }
        : null,
    }),

    ...(query.hasSource !== undefined && {
      sourceUrl: query.hasSource
        ? {
            not: null,
          }
        : null,
    }),

    ...(query.search && {
      OR: [
        {
          title: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          sourceUrl: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          vendor: {
            businessName: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
        },
      ],
    }),
  };

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await prisma.$transaction([
    prisma.moodBoardItem.findMany({
      where,
      select: moodBoardItemSelect,
      orderBy: getMoodBoardItemOrderBy(query.sort),
      skip,
      take: query.limit,
    }),

    prisma.moodBoardItem.count({
      where,
    }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

  return {
    items,

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

export const getMoodBoardItemById = async (ownerId: string, eventId: string, itemId: string) =>
  getOwnedMoodBoardItem(ownerId, eventId, itemId);

export const updateMoodBoardItem = async (
  ownerId: string,
  eventId: string,
  itemId: string,
  input: UpdateMoodBoardItemInput,
) => {
  const existingItem = await getOwnedMoodBoardItem(ownerId, eventId, itemId);

  if (input.vendorId !== undefined) {
    await ensureVendorExists(input.vendorId);
  }

  const normalizedImageUrl = normalizeOptionalUrl(input.imageUrl);
  const normalizedSourceUrl = normalizeOptionalUrl(input.sourceUrl);

  const finalImageUrl =
    normalizedImageUrl !== undefined ? normalizedImageUrl : existingItem.imageUrl;

  const finalSourceUrl =
    normalizedSourceUrl !== undefined ? normalizedSourceUrl : existingItem.sourceUrl;

  ensureItemHasVisualOrSource(finalImageUrl, finalSourceUrl);

  let finalImagePublicId = existingItem.imagePublicId;

  if (input.imageUrl === null) {
    finalImagePublicId = null;
  } else if (input.imagePublicId !== undefined) {
    finalImagePublicId = normalizeOptionalText(input.imagePublicId) ?? null;
  } else if (normalizedImageUrl !== undefined && normalizedImageUrl !== existingItem.imageUrl) {
    finalImagePublicId = null;
  }

  return prisma.moodBoardItem.update({
    where: {
      id: itemId,
    },

    data: {
      ...(input.title !== undefined && {
        title: input.title.trim(),
      }),

      ...(input.description !== undefined && {
        description: normalizeOptionalText(input.description),
      }),

      ...(input.category !== undefined && {
        category: input.category,
      }),

      ...(input.imageUrl !== undefined && {
        imageUrl: normalizedImageUrl,
      }),

      ...((input.imageUrl !== undefined || input.imagePublicId !== undefined) && {
        imagePublicId: finalImagePublicId,
      }),

      ...(input.sourceUrl !== undefined && {
        sourceUrl: normalizedSourceUrl,
      }),

      ...(input.colorTags !== undefined && {
        colorTags: normalizeColorTags(input.colorTags),
      }),

      ...(input.vendorId !== undefined && {
        vendorId: input.vendorId,
      }),
    },

    select: moodBoardItemSelect,
  });
};

export const deleteMoodBoardItem = async (ownerId: string, eventId: string, itemId: string) => {
  const existingItem = await getOwnedMoodBoardItem(ownerId, eventId, itemId);

  await prisma.moodBoardItem.delete({
    where: {
      id: itemId,
    },
  });

  if (existingItem.imagePublicId) {
    await deleteCloudinaryAsset(existingItem.imagePublicId).catch(() => undefined);
  }
};

export const getMoodBoardSummary = async (ownerId: string, eventId: string) => {
  const event = await getOwnedEvent(ownerId, eventId);

  const [totalItems, itemsWithImages, itemsWithSources, linkedVendorItems, itemCategories] =
    await prisma.$transaction([
      prisma.moodBoardItem.count({
        where: {
          eventId,
        },
      }),

      prisma.moodBoardItem.count({
        where: {
          eventId,
          imageUrl: {
            not: null,
          },
        },
      }),

      prisma.moodBoardItem.count({
        where: {
          eventId,
          sourceUrl: {
            not: null,
          },
        },
      }),

      prisma.moodBoardItem.count({
        where: {
          eventId,
          vendorId: {
            not: null,
          },
        },
      }),

      prisma.moodBoardItem.findMany({
        where: {
          eventId,
        },

        select: {
          category: true,
        },
      }),
    ]);

  const categoryCounts = Object.values(MoodBoardCategory).reduce(
    (counts, category) => {
      counts[category] = 0;
      return counts;
    },
    {} as Record<MoodBoardCategory, number>,
  );

  for (const item of itemCategories) {
    categoryCounts[item.category] += 1;
  }

  return {
    event: {
      id: event.id,
      name: event.name,
      eventDate: event.eventDate,
      status: event.status,
    },

    summary: {
      totalItems,
      itemsWithImages,
      itemsWithSources,
      linkedVendorItems,
      categoryCounts,
    },
  };
};
