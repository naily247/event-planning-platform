import { EventDocumentCategory, Prisma } from '@prisma/client';

import { prisma } from '../../config/prisma.js';
import {
  deleteCloudinaryAsset,
  deleteCloudinaryAssets,
} from '../../services/cloudinary.service.js';
import { AppError } from '../../utils/AppError.js';
import type {
  AddEventDocumentFilesInput,
  CreateEventDocumentInput,
  EventDocumentFileInput,
  ListEventDocumentsQuery,
  ReplaceEventDocumentFileInput,
  UpdateEventDocumentInput,
} from './eventDocument.schemas.js';
import { EVENT_DOCUMENT_MAX_FILES } from './eventDocument.schemas.js';

const eventDocumentFileSelect = {
  id: true,
  documentId: true,
  fileUrl: true,
  filePublicId: true,
  originalName: true,
  mimeType: true,
  fileSize: true,
  createdAt: true,
  updatedAt: true,
} as const;

const eventDocumentSelect = {
  id: true,
  eventId: true,
  vendorId: true,
  title: true,
  description: true,
  category: true,
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

  files: {
    select: eventDocumentFileSelect,
    orderBy: {
      createdAt: 'asc',
    },
  },

  _count: {
    select: {
      files: true,
    },
  },
} as const;

const normalizeOptionalText = (value: string | null | undefined) => {
  if (value === undefined) {
    return undefined;
  }

  return value === null ? null : value.trim();
};

const normalizeFileInput = (file: EventDocumentFileInput) => ({
  fileUrl: file.fileUrl.trim(),
  filePublicId: file.filePublicId.trim(),
  originalName: file.originalName.trim(),
  mimeType: file.mimeType,
  fileSize: file.fileSize,
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
      eventDate: true,
      status: true,
    },
  });

  if (!event) {
    throw new AppError(404, 'Event not found', 'EVENT_NOT_FOUND');
  }

  return event;
};

const getOwnedEventDocument = async (ownerId: string, eventId: string, documentId: string) => {
  const document = await prisma.eventDocument.findFirst({
    where: {
      id: documentId,
      eventId,

      event: {
        ownerId,
      },
    },

    select: eventDocumentSelect,
  });

  if (!document) {
    throw new AppError(404, 'Event document not found', 'EVENT_DOCUMENT_NOT_FOUND');
  }

  return document;
};

const getOwnedEventDocumentFile = async (
  ownerId: string,
  eventId: string,
  documentId: string,
  fileId: string,
) => {
  const file = await prisma.eventDocumentFile.findFirst({
    where: {
      id: fileId,
      documentId,

      document: {
        eventId,

        event: {
          ownerId,
        },
      },
    },

    select: eventDocumentFileSelect,
  });

  if (!file) {
    throw new AppError(404, 'Event document file not found', 'EVENT_DOCUMENT_FILE_NOT_FOUND');
  }

  return file;
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

const ensureDocumentFileLimit = (existingFileCount: number, incomingFileCount: number) => {
  if (existingFileCount + incomingFileCount > EVENT_DOCUMENT_MAX_FILES) {
    throw new AppError(
      409,
      `A document cannot contain more than ${EVENT_DOCUMENT_MAX_FILES} files`,
      'EVENT_DOCUMENT_FILE_LIMIT_EXCEEDED',
      {
        existingFileCount,
        incomingFileCount,
        maximumFileCount: EVENT_DOCUMENT_MAX_FILES,
      },
    );
  }
};

const getEventDocumentOrderBy = (
  sort: ListEventDocumentsQuery['sort'],
): Prisma.EventDocumentOrderByWithRelationInput[] => {
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
        {
          id: 'desc',
        },
      ];
  }
};

const throwMappedPrismaError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError(
      409,
      'One or more Cloudinary public IDs are already in use',
      'EVENT_DOCUMENT_FILE_PUBLIC_ID_CONFLICT',
    );
  }

  throw error;
};

export const createEventDocument = async (
  ownerId: string,
  eventId: string,
  input: CreateEventDocumentInput,
) => {
  await getOwnedEvent(ownerId, eventId);
  await ensureVendorExists(input.vendorId);

  try {
    return await prisma.eventDocument.create({
      data: {
        eventId,
        vendorId: input.vendorId ?? null,
        title: input.title.trim(),
        description: normalizeOptionalText(input.description) ?? null,
        category: input.category ?? EventDocumentCategory.OTHER,

        files: {
          create: input.files.map(normalizeFileInput),
        },
      },

      select: eventDocumentSelect,
    });
  } catch (error) {
    throwMappedPrismaError(error);
  }
};

export const getEventDocuments = async (
  ownerId: string,
  eventId: string,
  query: ListEventDocumentsQuery,
) => {
  await getOwnedEvent(ownerId, eventId);

  const mimeTypeFilter: Prisma.EventDocumentFileWhereInput | undefined =
    query.mimeType === 'PDF'
      ? {
          mimeType: 'application/pdf',
        }
      : query.mimeType === 'IMAGE'
        ? {
            mimeType: {
              in: ['image/jpeg', 'image/png', 'image/webp'],
            },
          }
        : undefined;

  const where: Prisma.EventDocumentWhereInput = {
    eventId,

    ...(query.category && {
      category: query.category,
    }),

    ...(query.vendorId && {
      vendorId: query.vendorId,
    }),

    ...(query.hasVendor !== undefined && {
      vendorId: query.hasVendor
        ? {
            not: null,
          }
        : null,
    }),

    ...(mimeTypeFilter && {
      files: {
        some: mimeTypeFilter,
      },
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
          vendor: {
            businessName: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
        },
        {
          files: {
            some: {
              originalName: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          },
        },
      ],
    }),
  };

  const skip = (query.page - 1) * query.limit;

  const [documents, total] = await prisma.$transaction([
    prisma.eventDocument.findMany({
      where,
      select: eventDocumentSelect,
      orderBy: getEventDocumentOrderBy(query.sort),
      skip,
      take: query.limit,
    }),

    prisma.eventDocument.count({
      where,
    }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

  return {
    documents,

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

export const getEventDocumentById = async (ownerId: string, eventId: string, documentId: string) =>
  getOwnedEventDocument(ownerId, eventId, documentId);

export const updateEventDocument = async (
  ownerId: string,
  eventId: string,
  documentId: string,
  input: UpdateEventDocumentInput,
) => {
  await getOwnedEventDocument(ownerId, eventId, documentId);

  if (input.vendorId !== undefined) {
    await ensureVendorExists(input.vendorId);
  }

  return prisma.eventDocument.update({
    where: {
      id: documentId,
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

      ...(input.vendorId !== undefined && {
        vendorId: input.vendorId,
      }),
    },

    select: eventDocumentSelect,
  });
};

export const deleteEventDocument = async (ownerId: string, eventId: string, documentId: string) => {
  const document = await getOwnedEventDocument(ownerId, eventId, documentId);

  await prisma.eventDocument.delete({
    where: {
      id: documentId,
    },
  });

  await deleteCloudinaryAssets(document.files.map((file) => file.filePublicId));
};

export const addEventDocumentFiles = async (
  ownerId: string,
  eventId: string,
  documentId: string,
  input: AddEventDocumentFilesInput,
) => {
  const document = await getOwnedEventDocument(ownerId, eventId, documentId);

  ensureDocumentFileLimit(document.files.length, input.files.length);

  try {
    return await prisma.$transaction(async (transaction) => {
      for (const file of input.files) {
        await transaction.eventDocumentFile.create({
          data: {
            documentId,
            ...normalizeFileInput(file),
          },
        });
      }

      return transaction.eventDocument.findUniqueOrThrow({
        where: {
          id: documentId,
        },

        select: eventDocumentSelect,
      });
    });
  } catch (error) {
    throwMappedPrismaError(error);
  }
};

export const replaceEventDocumentFile = async (
  ownerId: string,
  eventId: string,
  documentId: string,
  fileId: string,
  input: ReplaceEventDocumentFileInput,
) => {
  const existingFile = await getOwnedEventDocumentFile(ownerId, eventId, documentId, fileId);

  const replacementFile = normalizeFileInput(input.file);

  try {
    const updatedFile = await prisma.eventDocumentFile.update({
      where: {
        id: fileId,
      },

      data: replacementFile,

      select: eventDocumentFileSelect,
    });

    if (existingFile.filePublicId !== updatedFile.filePublicId) {
      await deleteCloudinaryAsset(existingFile.filePublicId);
    }

    return updatedFile;
  } catch (error) {
    throwMappedPrismaError(error);
  }
};

export const deleteEventDocumentFile = async (
  ownerId: string,
  eventId: string,
  documentId: string,
  fileId: string,
) => {
  const document = await getOwnedEventDocument(ownerId, eventId, documentId);

  const file = document.files.find((documentFile) => documentFile.id === fileId);

  if (!file) {
    throw new AppError(404, 'Event document file not found', 'EVENT_DOCUMENT_FILE_NOT_FOUND');
  }

  if (document.files.length <= 1) {
    throw new AppError(
      409,
      'A document must contain at least one file',
      'EVENT_DOCUMENT_LAST_FILE_REQUIRED',
    );
  }

  await prisma.eventDocumentFile.delete({
    where: {
      id: fileId,
    },
  });

  await deleteCloudinaryAsset(file.filePublicId);
};

export const getEventDocumentSummary = async (ownerId: string, eventId: string) => {
  const event = await getOwnedEvent(ownerId, eventId);

  const [
    totalDocuments,
    totalFiles,
    pdfFiles,
    imageFiles,
    linkedVendorDocuments,
    documentCategories,
  ] = await prisma.$transaction([
    prisma.eventDocument.count({
      where: {
        eventId,
      },
    }),

    prisma.eventDocumentFile.count({
      where: {
        document: {
          eventId,
        },
      },
    }),

    prisma.eventDocumentFile.count({
      where: {
        document: {
          eventId,
        },

        mimeType: 'application/pdf',
      },
    }),

    prisma.eventDocumentFile.count({
      where: {
        document: {
          eventId,
        },

        mimeType: {
          in: ['image/jpeg', 'image/png', 'image/webp'],
        },
      },
    }),

    prisma.eventDocument.count({
      where: {
        eventId,

        vendorId: {
          not: null,
        },
      },
    }),

    prisma.eventDocument.findMany({
      where: {
        eventId,
      },

      select: {
        category: true,
      },
    }),
  ]);

  const categoryCounts = Object.values(EventDocumentCategory).reduce(
    (counts, category) => {
      counts[category] = 0;
      return counts;
    },
    {} as Record<EventDocumentCategory, number>,
  );

  for (const document of documentCategories) {
    categoryCounts[document.category] += 1;
  }

  return {
    event: {
      id: event.id,
      name: event.name,
      eventDate: event.eventDate,
      status: event.status,
    },

    summary: {
      totalDocuments,
      totalFiles,
      pdfFiles,
      imageFiles,
      linkedVendorDocuments,
      categoryCounts,
    },
  };
};
