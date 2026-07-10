import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiOptions, UploadApiResponse } from 'cloudinary';

import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

type CloudinaryDestroyResourceType = 'image' | 'raw' | 'video';
type CloudinaryUploadResourceType = CloudinaryDestroyResourceType | 'auto';

type UploadCloudinaryAssetInput = {
  buffer: Buffer;
  folder: string;
  originalName?: string;
  resourceType?: CloudinaryUploadResourceType;
};

type UploadedCloudinaryAsset = {
  fileUrl: string;
  filePublicId: string;
  resourceType: string;
  bytes: number;
  format?: string;
};

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

const normalizeRequiredText = (value: string, errorMessage: string, errorCode: string) => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new AppError(400, errorMessage, errorCode);
  }

  return normalizedValue;
};

const normalizeOptionalText = (value: string | undefined) => {
  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = value.trim();
  return normalizedValue || undefined;
};

const uploadBufferToCloudinary = async (
  buffer: Buffer,
  options: UploadApiOptions,
): Promise<UploadApiResponse> =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      if (!result) {
        reject(new AppError(502, 'Cloudinary did not return an upload result', 'CLOUDINARY_UPLOAD_FAILED'));
        return;
      }

      resolve(result);
    });

    uploadStream.end(buffer);
  });

export const uploadCloudinaryAsset = async ({
  buffer,
  folder,
  originalName,
  resourceType = 'auto',
}: UploadCloudinaryAssetInput): Promise<UploadedCloudinaryAsset> => {
  if (!buffer || buffer.length === 0) {
    throw new AppError(400, 'Upload file buffer is required', 'CLOUDINARY_FILE_BUFFER_REQUIRED');
  }

  const normalizedFolder = normalizeRequiredText(
    folder,
    'Cloudinary folder is required',
    'CLOUDINARY_FOLDER_REQUIRED',
  );

  configureCloudinary();

  try {
    const result = await uploadBufferToCloudinary(buffer, {
      folder: normalizedFolder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      filename_override: normalizeOptionalText(originalName),
    });

    return {
      fileUrl: result.secure_url,
      filePublicId: result.public_id,
      resourceType: result.resource_type,
      bytes: result.bytes,
      format: result.format,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(502, 'Cloudinary asset upload failed', 'CLOUDINARY_UPLOAD_FAILED');
  }
};

const deleteCloudinaryAssetByResourceType = async (
  publicId: string,
  resourceType: CloudinaryDestroyResourceType,
) =>
  cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    type: 'upload',
    invalidate: true,
  });

export const deleteCloudinaryAsset = async (publicId: string): Promise<void> => {
  const normalizedPublicId = normalizeRequiredText(
    publicId,
    'Cloudinary public ID is required',
    'CLOUDINARY_PUBLIC_ID_REQUIRED',
  );

  configureCloudinary();

  try {
    for (const resourceType of ['image', 'raw', 'video'] satisfies CloudinaryDestroyResourceType[]) {
  const result = await deleteCloudinaryAssetByResourceType(normalizedPublicId, resourceType);

  if (result.result === 'ok') {
    return;
  }

  if (result.result !== 'not found') {
    throw new AppError(
      502,
      'Cloudinary could not delete the requested asset',
      'CLOUDINARY_DELETE_FAILED',
      {
        publicId: normalizedPublicId,
        resourceType,
        result: result.result,
      },
    );
  }
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