import { EventDocumentCategory } from '@prisma/client';
import { z } from 'zod';

export const EVENT_DOCUMENT_MAX_FILES = 3;
export const EVENT_DOCUMENT_MAX_FILE_SIZE = 10 * 1024 * 1024;

export const EVENT_DOCUMENT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

const cuidSchema = z.string().trim().cuid('The provided ID must be a valid CUID');

const optionalNullableText = (fieldName: string, maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} cannot be empty`)
    .max(maxLength, `${fieldName} must not exceed ${maxLength} characters`)
    .nullable()
    .optional();

const optionalNullableCuid = z
  .string()
  .trim()
  .cuid('Vendor ID must be a valid CUID')
  .nullable()
  .optional();

const optionalBooleanQuery = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();

export const eventDocumentFileSchema = z.object({
  fileUrl: z
    .string()
    .trim()
    .url('File URL must be a valid URL')
    .max(2048, 'File URL must not exceed 2048 characters'),

  filePublicId: z
    .string()
    .trim()
    .min(1, 'File public ID is required')
    .max(255, 'File public ID must not exceed 255 characters'),

  originalName: z
    .string()
    .trim()
    .min(1, 'Original filename is required')
    .max(255, 'Original filename must not exceed 255 characters'),

  mimeType: z.enum(EVENT_DOCUMENT_ALLOWED_MIME_TYPES, {
    errorMap: () => ({
      message: 'File type must be PDF, JPEG, PNG, or WebP',
    }),
  }),

  fileSize: z
    .number({
      required_error: 'File size is required',
      invalid_type_error: 'File size must be a number',
    })
    .int('File size must be a whole number')
    .positive('File size must be greater than zero')
    .max(EVENT_DOCUMENT_MAX_FILE_SIZE, 'Each file must not exceed 10 MB'),
});

const documentFilesSchema = z
  .array(eventDocumentFileSchema)
  .min(1, 'At least one file must be provided')
  .max(
    EVENT_DOCUMENT_MAX_FILES,
    `A document cannot contain more than ${EVENT_DOCUMENT_MAX_FILES} files`,
  );

export const eventDocumentEventParamsSchema = z.object({
  eventId: cuidSchema,
});

export const eventDocumentParamsSchema = z.object({
  eventId: cuidSchema,
  documentId: cuidSchema,
});

export const eventDocumentFileParamsSchema = z.object({
  eventId: cuidSchema,
  documentId: cuidSchema,
  fileId: cuidSchema,
});

export const createEventDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(150, 'Title must not exceed 150 characters'),

  description: optionalNullableText('Description', 2000),

  category: z.nativeEnum(EventDocumentCategory).optional(),

  vendorId: optionalNullableCuid,

  files: documentFilesSchema,
});

export const updateEventDocumentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(150, 'Title must not exceed 150 characters')
      .optional(),

    description: optionalNullableText('Description', 2000),

    category: z.nativeEnum(EventDocumentCategory).optional(),

    vendorId: optionalNullableCuid,
  })
  .superRefine((data, context) => {
    if (Object.keys(data).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one document field must be provided',
      });
    }
  });

export const addEventDocumentFilesSchema = z.object({
  files: documentFilesSchema,
});

export const replaceEventDocumentFileSchema = z.object({
  file: eventDocumentFileSchema,
});

export const listEventDocumentsQuerySchema = z.object({
  category: z.nativeEnum(EventDocumentCategory).optional(),

  vendorId: z.string().trim().cuid('Vendor ID must be a valid CUID').optional(),

  mimeType: z.enum(['PDF', 'IMAGE']).optional(),

  hasVendor: optionalBooleanQuery,

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

export type EventDocumentEventParams = z.infer<typeof eventDocumentEventParamsSchema>;

export type EventDocumentParams = z.infer<typeof eventDocumentParamsSchema>;

export type EventDocumentFileParams = z.infer<typeof eventDocumentFileParamsSchema>;

export type EventDocumentFileInput = z.infer<typeof eventDocumentFileSchema>;

export type CreateEventDocumentInput = z.infer<typeof createEventDocumentSchema>;

export type UpdateEventDocumentInput = z.infer<typeof updateEventDocumentSchema>;

export type AddEventDocumentFilesInput = z.infer<typeof addEventDocumentFilesSchema>;

export type ReplaceEventDocumentFileInput = z.infer<typeof replaceEventDocumentFileSchema>;

export type ListEventDocumentsQuery = z.infer<typeof listEventDocumentsQuerySchema>;

export const createEventDocumentRequestSchema = z.object({
  params: eventDocumentEventParamsSchema,
  body: createEventDocumentSchema,
});

export const getEventDocumentsRequestSchema = z.object({
  params: eventDocumentEventParamsSchema,
  query: listEventDocumentsQuerySchema,
});

export const getEventDocumentSummaryRequestSchema = z.object({
  params: eventDocumentEventParamsSchema,
});

export const getEventDocumentByIdRequestSchema = z.object({
  params: eventDocumentParamsSchema,
});

export const updateEventDocumentRequestSchema = z.object({
  params: eventDocumentParamsSchema,
  body: updateEventDocumentSchema,
});

export const deleteEventDocumentRequestSchema = z.object({
  params: eventDocumentParamsSchema,
});

export const addEventDocumentFilesRequestSchema = z.object({
  params: eventDocumentParamsSchema,
  body: addEventDocumentFilesSchema,
});

export const replaceEventDocumentFileRequestSchema = z.object({
  params: eventDocumentFileParamsSchema,
  body: replaceEventDocumentFileSchema,
});

export const deleteEventDocumentFileRequestSchema = z.object({
  params: eventDocumentFileParamsSchema,
});
