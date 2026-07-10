import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.js';
import {
  uploadMultipleDocuments,
  uploadSingleComplaintAttachment,
  uploadSingleDocument,
  uploadSingleImage,
  uploadSinglePaymentProof,
} from '../../middleware/upload.middleware.js';
import {
  uploadComplaintAttachmentHandler,
  uploadDocumentHandler,
  uploadEventDocumentFilesHandler,
  uploadImageHandler,
  uploadPaymentProofHandler,
} from './upload.controller.js';

export const uploadRouter = Router();

uploadRouter.use(requireAuth);

uploadRouter.post('/images', uploadSingleImage, uploadImageHandler);
uploadRouter.post('/documents', uploadSingleDocument, uploadDocumentHandler);
uploadRouter.post('/event-document-files', uploadMultipleDocuments(10), uploadEventDocumentFilesHandler);
uploadRouter.post('/payment-proofs', uploadSinglePaymentProof, uploadPaymentProofHandler);
uploadRouter.post('/complaint-attachments', uploadSingleComplaintAttachment, uploadComplaintAttachmentHandler);