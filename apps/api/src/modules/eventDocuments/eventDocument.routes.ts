import { UserRole } from '@prisma/client';
import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  uploadMultipleDocuments,
  uploadSingleDocument,
} from '../../middleware/upload.middleware.js';
import {
  addEventDocumentFilesHandler,
  addEventDocumentFilesWithUploadHandler,
  createEventDocumentHandler,
  deleteEventDocumentFileHandler,
  deleteEventDocumentHandler,
  getEventDocumentByIdHandler,
  getEventDocumentsHandler,
  getEventDocumentSummaryHandler,
  replaceEventDocumentFileHandler,
  replaceEventDocumentFileWithUploadHandler,
  updateEventDocumentHandler,
} from './eventDocument.controller.js';
import {
  addEventDocumentFilesRequestSchema,
  addEventDocumentFilesWithUploadRequestSchema,
  createEventDocumentRequestSchema,
  deleteEventDocumentFileRequestSchema,
  deleteEventDocumentRequestSchema,
  EVENT_DOCUMENT_MAX_FILES,
  getEventDocumentByIdRequestSchema,
  getEventDocumentsRequestSchema,
  getEventDocumentSummaryRequestSchema,
  replaceEventDocumentFileRequestSchema,
  replaceEventDocumentFileWithUploadRequestSchema,
  updateEventDocumentRequestSchema,
} from './eventDocument.schemas.js';

export const eventDocumentRouter = Router();

const customerOnly = [requireAuth, authorize(UserRole.CUSTOMER)] as const;

eventDocumentRouter.get(
  '/events/:eventId/summary',
  ...customerOnly,
  validate(getEventDocumentSummaryRequestSchema),
  getEventDocumentSummaryHandler,
);

eventDocumentRouter.post(
  '/events/:eventId/documents',
  ...customerOnly,
  validate(createEventDocumentRequestSchema),
  createEventDocumentHandler,
);

eventDocumentRouter.get(
  '/events/:eventId/documents',
  ...customerOnly,
  validate(getEventDocumentsRequestSchema),
  getEventDocumentsHandler,
);

eventDocumentRouter.get(
  '/events/:eventId/documents/:documentId',
  ...customerOnly,
  validate(getEventDocumentByIdRequestSchema),
  getEventDocumentByIdHandler,
);

eventDocumentRouter.patch(
  '/events/:eventId/documents/:documentId',
  ...customerOnly,
  validate(updateEventDocumentRequestSchema),
  updateEventDocumentHandler,
);

eventDocumentRouter.delete(
  '/events/:eventId/documents/:documentId',
  ...customerOnly,
  validate(deleteEventDocumentRequestSchema),
  deleteEventDocumentHandler,
);

eventDocumentRouter.post(
  '/events/:eventId/documents/:documentId/files',
  ...customerOnly,
  validate(addEventDocumentFilesRequestSchema),
  addEventDocumentFilesHandler,
);

eventDocumentRouter.patch(
  '/events/:eventId/documents/:documentId/files/:fileId',
  ...customerOnly,
  validate(replaceEventDocumentFileRequestSchema),
  replaceEventDocumentFileHandler,
);

eventDocumentRouter.delete(
  '/events/:eventId/documents/:documentId/files/:fileId',
  ...customerOnly,
  validate(deleteEventDocumentFileRequestSchema),
  deleteEventDocumentFileHandler,
);

eventDocumentRouter.post(
  '/events/:eventId/documents/:documentId/files/upload',
  ...customerOnly,
  uploadMultipleDocuments(EVENT_DOCUMENT_MAX_FILES),
  validate(addEventDocumentFilesWithUploadRequestSchema),
  addEventDocumentFilesWithUploadHandler,
);
eventDocumentRouter.patch(
  '/events/:eventId/documents/:documentId/files/:fileId/upload',
  ...customerOnly,
  uploadSingleDocument,
  validate(replaceEventDocumentFileWithUploadRequestSchema),
  replaceEventDocumentFileWithUploadHandler,
);