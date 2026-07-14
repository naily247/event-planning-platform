import { api } from '../../lib/api';

export const moodBoardCategories = [
  'DECORATION',
  'FLOWERS',
  'OUTFIT',
  'CAKE',
  'INVITATION',
  'PHOTOGRAPHY',
  'VENUE',
  'TABLE_SETTING',
  'COLOR_PALETTE',
  'ENTERTAINMENT',
  'OTHER',
] as const;

export const moodBoardSortOptions = [
  'newest',
  'oldest',
  'title_asc',
  'title_desc',
  'category_asc',
  'category_desc',
] as const;

export type MoodBoardCategory = (typeof moodBoardCategories)[number];

export type MoodBoardSort = (typeof moodBoardSortOptions)[number];

export type MoodBoardEventStatus = 'DRAFT' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type MoodBoardVendorVerificationStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type MoodBoardVendor = {
  id: string;
  businessName: string;
  slug: string;
  verificationStatus: MoodBoardVendorVerificationStatus;
};

export type MoodBoardItem = {
  id: string;
  eventId: string;
  vendorId: string | null;
  title: string;
  description: string | null;
  category: MoodBoardCategory;
  imageUrl: string | null;
  imagePublicId: string | null;
  sourceUrl: string | null;
  colorTags: string[];
  createdAt: string;
  updatedAt: string;
  vendor: MoodBoardVendor | null;
};

export type MoodBoardPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type MoodBoardCategoryCounts = Record<MoodBoardCategory, number>;

export type MoodBoardSummary = {
  event: {
    id: string;
    name: string;
    eventDate: string;
    status: MoodBoardEventStatus;
  };

  summary: {
    totalItems: number;
    itemsWithImages: number;
    itemsWithSources: number;
    linkedVendorItems: number;
    categoryCounts: MoodBoardCategoryCounts;
  };
};

export type UploadedMoodBoardAsset = {
  fileUrl: string;
  filePublicId: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  resourceType: string;
};

export type CreateMoodBoardItemInput = {
  title: string;
  description?: string | null;
  category?: MoodBoardCategory;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  sourceUrl?: string | null;
  colorTags?: string[];
  vendorId?: string | null;
};

export type CreateMoodBoardItemWithUploadInput = {
  image: File;
  title: string;
  description?: string | null;
  category?: MoodBoardCategory;
  sourceUrl?: string | null;
  colorTags?: string[];
  vendorId?: string | null;
};

export type UpdateMoodBoardItemInput = {
  title?: string;
  description?: string | null;
  category?: MoodBoardCategory;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  sourceUrl?: string | null;
  colorTags?: string[];
  vendorId?: string | null;
};

export type GetMoodBoardItemsParams = {
  category?: MoodBoardCategory;
  vendorId?: string;
  hasImage?: boolean;
  hasSource?: boolean;
  search?: string;
  sort?: MoodBoardSort;
  page?: number;
  limit?: number;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

type MoodBoardItemListResponse = ApiSuccessResponse<MoodBoardItem[]> & {
  pagination: MoodBoardPagination;
};

type MoodBoardUploadResponse = ApiSuccessResponse<MoodBoardItem> & {
  upload: UploadedMoodBoardAsset;
};

export async function getMoodBoardSummary(eventId: string) {
  const response = await api.get<ApiSuccessResponse<MoodBoardSummary>>(
    `/mood-boards/events/${eventId}/summary`,
  );

  return response.data.data;
}

export async function getMoodBoardItems(eventId: string, params: GetMoodBoardItemsParams = {}) {
  const response = await api.get<MoodBoardItemListResponse>(
    `/mood-Boards/events/${eventId}/items`,
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

        ...(params.hasImage !== undefined && {
          hasImage: String(params.hasImage),
        }),

        ...(params.hasSource !== undefined && {
          hasSource: String(params.hasSource),
        }),

        ...(params.search?.trim() && {
          search: params.search.trim(),
        }),
      },
    },
  );

  return {
    items: response.data.data,
    pagination: response.data.pagination,
  };
}

export async function getMoodBoardItemById(eventId: string, itemId: string) {
  const response = await api.get<ApiSuccessResponse<MoodBoardItem>>(
    `/mood-Boards/events/${eventId}/items/${itemId}`,
  );

  return response.data.data;
}

export async function createMoodBoardItem(eventId: string, input: CreateMoodBoardItemInput) {
  const response = await api.post<ApiSuccessResponse<MoodBoardItem>>(
    `/mood-Boards/events/${eventId}/items`,
    input,
  );

  return response.data.data;
}

export async function createMoodBoardItemWithUpload(
  eventId: string,
  input: CreateMoodBoardItemWithUploadInput,
) {
  const formData = new FormData();

  formData.append('file', input.image);
  formData.append('title', input.title);

  if (input.description !== undefined && input.description !== null) {
    formData.append('description', input.description);
  }

  if (input.category) {
    formData.append('category', input.category);
  }

  if (input.sourceUrl !== undefined && input.sourceUrl !== null) {
    formData.append('sourceUrl', input.sourceUrl);
  }

  if (input.colorTags !== undefined) {
    formData.append('colorTags', JSON.stringify(input.colorTags));
  }

  if (input.vendorId !== undefined && input.vendorId !== null) {
    formData.append('vendorId', input.vendorId);
  }

  const response = await api.post<MoodBoardUploadResponse>(
    `/mood-Boards/events/${eventId}/items/upload`,
    formData,
  );

  return {
    item: response.data.data,
    upload: response.data.upload,
  };
}

export async function updateMoodBoardItem(
  eventId: string,
  itemId: string,
  input: UpdateMoodBoardItemInput,
) {
  const response = await api.patch<ApiSuccessResponse<MoodBoardItem>>(
    `/mood-Boards/events/${eventId}/items/${itemId}`,
    input,
  );

  return response.data.data;
}

export async function deleteMoodBoardItem(eventId: string, itemId: string) {
  await api.delete(`/mood-Boards/events/${eventId}/items/${itemId}`);
}
