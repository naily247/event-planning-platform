import { api } from '../../lib/api';

export const eventDocumentCategories = [
  'CONTRACT',
  'QUOTATION',
  'INVOICE',
  'PAYMENT_RECEIPT',
  'SCHEDULE',
  'GUEST_LIST',
  'MENU',
  'FLOOR_PLAN',
  'PERMIT',
  'VENDOR_DOCUMENT',
  'REFERENCE',
  'OTHER',
] as const;

export const eventDocumentSortOptions = [
  'newest',
  'oldest',
  'title_asc',
  'title_desc',
  'category_asc',
  'category_desc',
] as const;

export const eventDocumentMimeTypeFilters = ['PDF', 'IMAGE'] as const;

export const eventDocumentAllowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const EVENT_DOCUMENT_MAX_FILES = 3;
export const EVENT_DOCUMENT_MAX_FILE_SIZE = 10 * 1024 * 1024;

export type EventDocumentCategory = (typeof eventDocumentCategories)[number];

export type EventDocumentSort = (typeof eventDocumentSortOptions)[number];

export type EventDocumentMimeTypeFilter = (typeof eventDocumentMimeTypeFilters)[number];

export type EventDocumentAllowedMimeType = (typeof eventDocumentAllowedMimeTypes)[number];

export type EventDocumentEventStatus = 'DRAFT' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type EventDocumentVendorVerificationStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type EventDocumentVendor = {
  id: string;
  businessName: string;
  slug: string;
  verificationStatus: EventDocumentVendorVerificationStatus;
};

export type EventDocumentFile = {
  id: string;
  documentId: string;
  fileUrl: string;
  filePublicId: string;
  originalName: string;
  mimeType: EventDocumentAllowedMimeType;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
};

export type EventDocumentFileInput = {
  fileUrl: string;
  filePublicId: string;
  originalName: string;
  mimeType: EventDocumentAllowedMimeType;
  fileSize: number;
};

export type EventDocument = {
  id: string;
  eventId: string;
  vendorId: string | null;
  title: string;
  description: string | null;
  category: EventDocumentCategory;
  createdAt: string;
  updatedAt: string;
  vendor: EventDocumentVendor | null;
  files: EventDocumentFile[];
  _count: {
    files: number;
  };
};

export type EventDocumentPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type EventDocumentCategoryCounts = Record<EventDocumentCategory, number>;

export type EventDocumentSummary = {
  event: {
    id: string;
    name: string;
    eventDate: string;
    status: EventDocumentEventStatus;
  };

  summary: {
    totalDocuments: number;
    totalFiles: number;
    pdfFiles: number;
    imageFiles: number;
    linkedVendorDocuments: number;
    categoryCounts: EventDocumentCategoryCounts;
  };
};

export type UploadedEventDocumentAsset = {
  fileUrl: string;
  filePublicId: string;
  originalName: string;
  mimeType: EventDocumentAllowedMimeType;
  fileSize: number;
  resourceType: string;
};

export type CreateEventDocumentInput = {
  title: string;
  description?: string | null;
  category?: EventDocumentCategory;
  vendorId?: string | null;
  files: EventDocumentFileInput[];
};

export type UpdateEventDocumentInput = {
  title?: string;
  description?: string | null;
  category?: EventDocumentCategory;
  vendorId?: string | null;
};

export type AddEventDocumentFilesInput = {
  files: EventDocumentFileInput[];
};

export type AddEventDocumentFilesWithUploadInput = {
  files: File[];
};

export type ReplaceEventDocumentFileInput = {
  file: EventDocumentFileInput;
};

export type ReplaceEventDocumentFileWithUploadInput = {
  file: File;
};

export type GetEventDocumentsParams = {
  category?: EventDocumentCategory;
  vendorId?: string;
  mimeType?: EventDocumentMimeTypeFilter;
  hasVendor?: boolean;
  search?: string;
  sort?: EventDocumentSort;
  page?: number;
  limit?: number;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

type EventDocumentListResponse = ApiSuccessResponse<EventDocument[]> & {
  pagination: EventDocumentPagination;
};

type AddEventDocumentFilesUploadResponse = ApiSuccessResponse<EventDocument> & {
  upload: UploadedEventDocumentAsset[];
};

type ReplaceEventDocumentFileUploadResponse = ApiSuccessResponse<EventDocumentFile> & {
  upload: UploadedEventDocumentAsset;
};

export async function getEventDocumentSummary(eventId: string) {
  const response = await api.get<ApiSuccessResponse<EventDocumentSummary>>(
    `/event-documents/events/${eventId}/summary`,
  );

  return response.data.data;
}

export async function getEventDocuments(eventId: string, params: GetEventDocumentsParams = {}) {
  const response = await api.get<EventDocumentListResponse>(
    `/event-documents/events/${eventId}/documents`,
    {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        sort: params.sort ?? 'newest',

        ...(params.category && {
          category: params.category,
        }),

        ...(params.vendorId?.trim() && {
          vendorId: params.vendorId.trim(),
        }),

        ...(params.mimeType && {
          mimeType: params.mimeType,
        }),

        ...(params.hasVendor !== undefined && {
          hasVendor: String(params.hasVendor),
        }),

        ...(params.search?.trim() && {
          search: params.search.trim(),
        }),
      },
    },
  );

  return {
    documents: response.data.data,
    pagination: response.data.pagination,
  };
}

export async function getEventDocumentById(eventId: string, documentId: string) {
  const response = await api.get<ApiSuccessResponse<EventDocument>>(
    `/event-documents/events/${eventId}/documents/${documentId}`,
  );

  return response.data.data;
}

export async function createEventDocument(eventId: string, input: CreateEventDocumentInput) {
  const response = await api.post<ApiSuccessResponse<EventDocument>>(
    `/event-documents/events/${eventId}/documents`,
    input,
  );

  return response.data.data;
}

export async function updateEventDocument(
  eventId: string,
  documentId: string,
  input: UpdateEventDocumentInput,
) {
  const response = await api.patch<ApiSuccessResponse<EventDocument>>(
    `/event-documents/events/${eventId}/documents/${documentId}`,
    input,
  );

  return response.data.data;
}

export async function deleteEventDocument(eventId: string, documentId: string) {
  await api.delete(`/event-documents/events/${eventId}/documents/${documentId}`);
}

export async function addEventDocumentFiles(
  eventId: string,
  documentId: string,
  input: AddEventDocumentFilesInput,
) {
  const response = await api.post<ApiSuccessResponse<EventDocument>>(
    `/event-documents/events/${eventId}/documents/${documentId}/files`,
    input,
  );

  return response.data.data;
}

export async function addEventDocumentFilesWithUpload(
  eventId: string,
  documentId: string,
  input: AddEventDocumentFilesWithUploadInput,
) {
  const formData = new FormData();

  for (const file of input.files) {
    formData.append('files', file);
  }

  const response = await api.post<AddEventDocumentFilesUploadResponse>(
    `/event-documents/events/${eventId}/documents/${documentId}/files/upload`,
    formData,
  );

  return {
    document: response.data.data,
    uploads: response.data.upload,
  };
}

export async function replaceEventDocumentFile(
  eventId: string,
  documentId: string,
  fileId: string,
  input: ReplaceEventDocumentFileInput,
) {
  const response = await api.patch<ApiSuccessResponse<EventDocumentFile>>(
    `/event-documents/events/${eventId}/documents/${documentId}/files/${fileId}`,
    input,
  );

  return response.data.data;
}

export async function replaceEventDocumentFileWithUpload(
  eventId: string,
  documentId: string,
  fileId: string,
  input: ReplaceEventDocumentFileWithUploadInput,
) {
  const formData = new FormData();

  formData.append('file', input.file);

  const response = await api.patch<ReplaceEventDocumentFileUploadResponse>(
    `/event-documents/events/${eventId}/documents/${documentId}/files/${fileId}/upload`,
    formData,
  );

  return {
    file: response.data.data,
    upload: response.data.upload,
  };
}

export async function deleteEventDocumentFile(eventId: string, documentId: string, fileId: string) {
  await api.delete(`/event-documents/events/${eventId}/documents/${documentId}/files/${fileId}`);
}

type UploadInitialEventDocumentFilesResponse = {
  data: {
    files: UploadedEventDocumentAsset[];
  };
};

export async function uploadInitialEventDocumentFiles(files: File[]) {
  const formData = new FormData();

  for (const file of files) {
    formData.append('files', file);
  }

  const response = await api.post<UploadInitialEventDocumentFilesResponse>(
    '/uploads/event-document-files',
    formData,
  );

  return response.data.data.files;
}
