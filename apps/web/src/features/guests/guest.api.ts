import { api } from '../../lib/api';

export const guestStatuses = ['NOT_INVITED', 'INVITED', 'CONFIRMED', 'DECLINED', 'MAYBE'] as const;

export const guestSortOptions = [
  'newest',
  'oldest',
  'name_asc',
  'name_desc',
  'party_size_highest',
  'party_size_lowest',
] as const;

export type GuestStatus = (typeof guestStatuses)[number];

export type GuestSort = (typeof guestSortOptions)[number];

export type GuestEventStatus = 'DRAFT' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type Guest = {
  id: string;
  eventId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  groupName: string | null;
  status: GuestStatus;
  partySize: number;
  mealPreference: string | null;
  dietaryRequirements: string | null;
  notes: string | null;
  invitedAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GuestSummary = {
  event: {
    id: string;
    name: string;
    eventDate: string;
    status: GuestEventStatus;
    plannedGuestCount: number | null;
  };

  summary: {
    totalGuests: number;
    totalExpectedAttendees: number;
    notInvited: number;
    invited: number;
    confirmed: number;
    declined: number;
    maybe: number;
    confirmedAttendees: number;
    invitedGuests: number;
    respondedGuests: number;
    responseRate: number;
  };
};

export type GuestPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type CreateGuestInput = {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  groupName?: string | null;
  status?: GuestStatus;
  partySize?: number;
  mealPreference?: string | null;
  dietaryRequirements?: string | null;
  notes?: string | null;
};

export type UpdateGuestInput = {
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  groupName?: string | null;
  partySize?: number;
  mealPreference?: string | null;
  dietaryRequirements?: string | null;
  notes?: string | null;
};

export type UpdateGuestRsvpInput = {
  status: GuestStatus;
};

export type GetGuestsParams = {
  status?: GuestStatus;
  groupName?: string;
  search?: string;
  sort?: GuestSort;
  page?: number;
  limit?: number;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

type GuestListResponse = ApiSuccessResponse<Guest[]> & {
  pagination: GuestPagination;
};

export async function getGuestSummary(eventId: string) {
  const response = await api.get<ApiSuccessResponse<GuestSummary>>(
    `/guests/events/${eventId}/summary`,
  );

  return response.data.data;
}

export async function getGuests(eventId: string, params: GetGuestsParams = {}) {
  const response = await api.get<GuestListResponse>(`/guests/events/${eventId}`, {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      sort: params.sort ?? 'newest',

      ...(params.status && {
        status: params.status,
      }),

      ...(params.groupName?.trim() && {
        groupName: params.groupName.trim(),
      }),

      ...(params.search?.trim() && {
        search: params.search.trim(),
      }),
    },
  });

  return {
    guests: response.data.data,
    pagination: response.data.pagination,
  };
}

export async function getGuestById(eventId: string, guestId: string) {
  const response = await api.get<ApiSuccessResponse<Guest>>(`/guests/events/${eventId}/${guestId}`);

  return response.data.data;
}

export async function createGuest(eventId: string, input: CreateGuestInput) {
  const response = await api.post<ApiSuccessResponse<Guest>>(`/guests/events/${eventId}`, input);

  return response.data.data;
}

export async function updateGuest(eventId: string, guestId: string, input: UpdateGuestInput) {
  const response = await api.patch<ApiSuccessResponse<Guest>>(
    `/guests/events/${eventId}/${guestId}`,
    input,
  );

  return response.data.data;
}

export async function updateGuestRsvp(
  eventId: string,
  guestId: string,
  input: UpdateGuestRsvpInput,
) {
  const response = await api.patch<ApiSuccessResponse<Guest>>(
    `/guests/events/${eventId}/${guestId}/rsvp`,
    input,
  );

  return response.data.data;
}

export async function deleteGuest(eventId: string, guestId: string) {
  await api.delete(`/guests/events/${eventId}/${guestId}`);
}
