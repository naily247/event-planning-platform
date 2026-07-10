import { MoodBoardCategory } from '@prisma/client';
import { z } from 'zod';

const cuidSchema = z.string().trim().cuid('The provided ID must be a valid CUID');

const optionalNullableText = (fieldName: string, maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} cannot be empty`)
    .max(maxLength, `${fieldName} must not exceed ${maxLength} characters`)
    .nullable()
    .optional();

const optionalNullableUrl = (fieldName: string) =>
  z
    .string()
    .trim()
    .url(`${fieldName} must be a valid URL`)
    .max(2048, `${fieldName} must not exceed 2048 characters`)
    .nullable()
    .optional();

const optionalNullableCuid = z
  .string()
  .trim()
  .cuid('Vendor ID must be a valid CUID')
  .nullable()
  .optional();

const colorTagsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, 'Colour tags cannot be empty')
      .max(50, 'Each colour tag must not exceed 50 characters'),
  )
  .max(20, 'A mood-board item cannot contain more than 20 colour tags')
  .optional();

const multipartColorTagsSchema = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  if (trimmedValue.startsWith('[')) {
    try {
      return JSON.parse(trimmedValue);
    } catch {
      return value;
    }
  }

  return trimmedValue
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}, colorTagsSchema);

const optionalBooleanQuery = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();

export const moodBoardEventParamsSchema = z.object({
  eventId: cuidSchema,
});

export const moodBoardItemParamsSchema = z.object({
  eventId: cuidSchema,
  itemId: cuidSchema,
});

const moodBoardItemBaseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(150, 'Title must not exceed 150 characters'),

  description: optionalNullableText('Description', 2000),

  category: z.nativeEnum(MoodBoardCategory).optional(),

  sourceUrl: optionalNullableUrl('Source URL'),

  colorTags: colorTagsSchema,

  vendorId: optionalNullableCuid,
});

export const createMoodBoardItemSchema = moodBoardItemBaseSchema
  .extend({
    imageUrl: optionalNullableUrl('Image URL'),

    imagePublicId: optionalNullableText('Image public ID', 255),
  })
  .superRefine((data, context) => {
    if (!data.imageUrl && !data.sourceUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either an image URL or source URL must be provided',
        path: ['imageUrl'],
      });
    }

    if (data.imagePublicId && !data.imageUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'An image URL is required when an image public ID is provided',
        path: ['imageUrl'],
      });
    }
  });

export const createMoodBoardItemWithUploadSchema = moodBoardItemBaseSchema.extend({
  colorTags: multipartColorTagsSchema,
});

export const updateMoodBoardItemSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(150, 'Title must not exceed 150 characters')
      .optional(),

    description: optionalNullableText('Description', 2000),

    category: z.nativeEnum(MoodBoardCategory).optional(),

    imageUrl: optionalNullableUrl('Image URL'),

    imagePublicId: optionalNullableText('Image public ID', 255),

    sourceUrl: optionalNullableUrl('Source URL'),

    colorTags: colorTagsSchema,

    vendorId: optionalNullableCuid,
  })
  .superRefine((data, context) => {
    if (Object.keys(data).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one mood-board item field must be provided',
      });
    }

    if (data.imagePublicId && data.imageUrl === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'An image public ID cannot be kept when the image URL is removed',
        path: ['imagePublicId'],
      });
    }
  });

export const listMoodBoardItemsQuerySchema = z.object({
  category: z.nativeEnum(MoodBoardCategory).optional(),

  vendorId: z.string().trim().cuid('Vendor ID must be a valid CUID').optional(),

  hasImage: optionalBooleanQuery,

  hasSource: optionalBooleanQuery,

  search: z
    .string()
    .trim()
    .min(1, 'Search cannot be empty')
    .max(100, 'Search must not exceed 100 characters')
    .optional(),

  sort: z
    .enum(['newest', 'oldest', 'title_asc', 'title_desc', 'category_asc', 'category_desc'])
    .default('newest'),

  page: z.coerce
    .number()
    .int('Page must be a whole number')
    .min(1, 'Page must be at least 1')
    .default(1),

  limit: z.coerce
    .number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must not exceed 100')
    .default(20),
});

export type MoodBoardEventParams = z.infer<typeof moodBoardEventParamsSchema>;

export type MoodBoardItemParams = z.infer<typeof moodBoardItemParamsSchema>;

export type CreateMoodBoardItemInput = z.infer<typeof createMoodBoardItemSchema>;

export type CreateMoodBoardItemWithUploadInput = z.infer<typeof createMoodBoardItemWithUploadSchema>;

export type UpdateMoodBoardItemInput = z.infer<typeof updateMoodBoardItemSchema>;

export type ListMoodBoardItemsQuery = z.infer<typeof listMoodBoardItemsQuerySchema>;

export const createMoodBoardItemRequestSchema = z.object({
  params: moodBoardEventParamsSchema,
  body: createMoodBoardItemSchema,
});

export const createMoodBoardItemWithUploadRequestSchema = z.object({
  params: moodBoardEventParamsSchema,
  body: createMoodBoardItemWithUploadSchema,
});

export const getMoodBoardItemsRequestSchema = z.object({
  params: moodBoardEventParamsSchema,
  query: listMoodBoardItemsQuerySchema,
});

export const getMoodBoardSummaryRequestSchema = z.object({
  params: moodBoardEventParamsSchema,
});

export const getMoodBoardItemByIdRequestSchema = z.object({
  params: moodBoardItemParamsSchema,
});

export const updateMoodBoardItemRequestSchema = z.object({
  params: moodBoardItemParamsSchema,
  body: updateMoodBoardItemSchema,
});

export const deleteMoodBoardItemRequestSchema = z.object({
  params: moodBoardItemParamsSchema,
});