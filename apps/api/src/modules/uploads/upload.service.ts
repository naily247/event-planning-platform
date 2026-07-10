import { uploadCloudinaryAsset } from '../../services/cloudinary.service.js';
import { AppError } from '../../utils/AppError.js';

type UploadAssetInput = {
  file: Express.Multer.File | undefined;
  folder: string;
};

export type UploadedAssetResponse = {
  fileUrl: string;
  filePublicId: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  resourceType: string;
  format?: string;
};

const normalizeRequiredText = (value: string, errorMessage: string, errorCode: string) => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new AppError(400, errorMessage, errorCode);
  }

  return normalizedValue;
};

export const uploadAsset = async ({
  file,
  folder,
}: UploadAssetInput): Promise<UploadedAssetResponse> => {
  if (!file) {
    throw new AppError(400, 'File is required', 'UPLOAD_FILE_REQUIRED');
  }

  const normalizedFolder = normalizeRequiredText(folder, 'Upload folder is required', 'UPLOAD_FOLDER_REQUIRED');

  const uploadedAsset = await uploadCloudinaryAsset({
    buffer: file.buffer,
    folder: normalizedFolder,
    originalName: file.originalname,
    resourceType: 'auto',
  });

  return {
    fileUrl: uploadedAsset.fileUrl,
    filePublicId: uploadedAsset.filePublicId,
    originalName: file.originalname,
    mimeType: file.mimetype,
    fileSize: file.size,
    resourceType: uploadedAsset.resourceType,
    format: uploadedAsset.format,
  };
};

export const uploadAssets = async (
  files: Express.Multer.File[] | undefined,
  folder: string,
): Promise<UploadedAssetResponse[]> => {
  if (!files || files.length === 0) {
    throw new AppError(400, 'At least one file is required', 'UPLOAD_FILES_REQUIRED');
  }

  const uploadedAssets: UploadedAssetResponse[] = [];

  for (const file of files) {
    const uploadedAsset = await uploadAsset({
      file,
      folder,
    });

    uploadedAssets.push(uploadedAsset);
  }

  return uploadedAssets;
};