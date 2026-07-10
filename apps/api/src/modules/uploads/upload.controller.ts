import type { RequestHandler } from 'express';

import { asyncHandler } from '../../utils/asyncHandler.js';
import { uploadAsset, uploadAssets } from './upload.service.js';

const UPLOAD_FOLDERS = {
  image: 'event-platform/images',
  document: 'event-platform/documents',
  paymentProof: 'event-platform/payment-proofs',
  complaintAttachment: 'event-platform/complaint-attachments',
} as const;

export const uploadImageHandler: RequestHandler = asyncHandler(async (request, response) => {
  const file = await uploadAsset({
    file: request.file,
    folder: UPLOAD_FOLDERS.image,
  });

  response.status(201).json({
    data: {
      file,
    },
  });
});

export const uploadDocumentHandler: RequestHandler = asyncHandler(async (request, response) => {
  const file = await uploadAsset({
    file: request.file,
    folder: UPLOAD_FOLDERS.document,
  });

  response.status(201).json({
    data: {
      file,
    },
  });
});

export const uploadEventDocumentFilesHandler: RequestHandler = asyncHandler(
  async (request, response) => {
    const files = await uploadAssets(
      Array.isArray(request.files) ? request.files : undefined,
      UPLOAD_FOLDERS.document,
    );

    response.status(201).json({
      data: {
        files,
      },
    });
  },
);

export const uploadPaymentProofHandler: RequestHandler = asyncHandler(async (request, response) => {
  const file = await uploadAsset({
    file: request.file,
    folder: UPLOAD_FOLDERS.paymentProof,
  });

  response.status(201).json({
    data: {
      file,
    },
  });
});

export const uploadComplaintAttachmentHandler: RequestHandler = asyncHandler(
  async (request, response) => {
    const file = await uploadAsset({
      file: request.file,
      folder: UPLOAD_FOLDERS.complaintAttachment,
    });

    response.status(201).json({
      data: {
        file,
      },
    });
  },
);