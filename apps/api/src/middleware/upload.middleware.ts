import multer from 'multer';

import { AppError } from '../utils/AppError.js';

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const PAYMENT_PROOF_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const COMPLAINT_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_IMAGE_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

type AllowedMimeTypeGroup = readonly string[];

type CreateUploadMiddlewareOptions = {
  allowedMimeTypes: AllowedMimeTypeGroup;
  maxFileSizeBytes: number;
};

const createUploadMiddleware = ({
  allowedMimeTypes,
  maxFileSizeBytes,
}: CreateUploadMiddlewareOptions) =>
  multer({
    storage: multer.memoryStorage(),

    limits: {
      fileSize: maxFileSizeBytes,
    },

    fileFilter: (_request, file, callback) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        callback(
          new AppError(400, 'Unsupported file type', 'UNSUPPORTED_FILE_TYPE', {
            allowedMimeTypes,
            receivedMimeType: file.mimetype,
          }),
        );
        return;
      }

      callback(null, true);
    },
  });

export const uploadSingleImage = createUploadMiddleware({
  allowedMimeTypes: IMAGE_MIME_TYPES,
  maxFileSizeBytes: MAX_IMAGE_UPLOAD_SIZE_BYTES,
}).single('file');

export const uploadSingleDocument = createUploadMiddleware({
  allowedMimeTypes: DOCUMENT_MIME_TYPES,
  maxFileSizeBytes: MAX_DOCUMENT_UPLOAD_SIZE_BYTES,
}).single('file');

export const uploadMultipleDocuments = (maxFileCount: number) =>
  createUploadMiddleware({
    allowedMimeTypes: DOCUMENT_MIME_TYPES,
    maxFileSizeBytes: MAX_DOCUMENT_UPLOAD_SIZE_BYTES,
  }).array('files', maxFileCount);

export const uploadSinglePaymentProof = createUploadMiddleware({
  allowedMimeTypes: PAYMENT_PROOF_MIME_TYPES,
  maxFileSizeBytes: MAX_DOCUMENT_UPLOAD_SIZE_BYTES,
}).single('file');

export const uploadSingleComplaintAttachment = createUploadMiddleware({
  allowedMimeTypes: COMPLAINT_ATTACHMENT_MIME_TYPES,
  maxFileSizeBytes: MAX_DOCUMENT_UPLOAD_SIZE_BYTES,
}).single('file');