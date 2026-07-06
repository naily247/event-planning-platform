import { v2 as cloudinary } from 'cloudinary';

import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

let isCloudinaryConfigured = false;

const configureCloudinary = () => {
  if (isCloudinaryConfigured) {
    return;
  }

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new AppError(503, 'Cloudinary is not configured', 'CLOUDINARY_NOT_CONFIGURED');
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  isCloudinaryConfigured = true;
};

export const deleteCloudinaryAsset = async (publicId: string): Promise<void> => {
  const normalizedPublicId = publicId.trim();

  if (!normalizedPublicId) {
    throw new AppError(400, 'Cloudinary public ID is required', 'CLOUDINARY_PUBLIC_ID_REQUIRED');
  }

  configureCloudinary();

  try {
    const result = await cloudinary.uploader.destroy(normalizedPublicId, {
      resource_type: 'image',
      type: 'upload',
      invalidate: true,
    });

    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new AppError(
        502,
        'Cloudinary could not delete the requested asset',
        'CLOUDINARY_DELETE_FAILED',
        {
          publicId: normalizedPublicId,
          result: result.result,
        },
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(502, 'Cloudinary asset deletion failed', 'CLOUDINARY_DELETE_FAILED', {
      publicId: normalizedPublicId,
    });
  }
};

export const deleteCloudinaryAssets = async (publicIds: string[]): Promise<void> => {
  const uniquePublicIds = [
    ...new Set(publicIds.map((publicId) => publicId.trim()).filter(Boolean)),
  ];

  for (const publicId of uniquePublicIds) {
    await deleteCloudinaryAsset(publicId);
  }
};
