import { api } from '../../lib/api';

export const invitationStatuses = [
  'active',
  'expired',
  'revoked',
  'responded',
  'unresponded',
] as const;

export const invitationSortOptions = [
  'newest',
  'oldest',
  'expires_soon',
  'guest_name_asc',
  'guest_name_desc',
] as const;

export const publicRsvpStatuses = ['CONFIRMED', 'DECLINED', 'MAYBE'] as const;

export type InvitationStatusFilter = (typeof invitationStatuses)[number];

export type InvitationSort = (typeof invitationSortOptions)[number];

export type PublicRsvpStatus = (typeof publicRsvpStatuses)[number];

export type InvitationGuestStatus = 'NOT_INVITED' | 'INVITED' | 'CONFIRMED' | 'DECLINED' | 'MAYBE';

export type InvitationGuest = {
  id: string;
  eventId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  groupName: string | null;
  status: InvitationGuestStatus;
  partySize: number;
  mealPreference: string | null;
  dietaryRequirements: string | null;
  notes: string | null;
  invitedAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Invitation = {
  id: string;
  guestId: string;
  expiresAt: string;
  revokedAt: string | null;
  lastSentAt: string | null;
  createdAt: string;
  updatedAt: string;
  guest: InvitationGuest;
  isExpired: boolean;
  isRevoked: boolean;
  isActive: boolean;
  hasResponded: boolean;
};

export type InvitationWithLink = Invitation & {
  token: string;
  invitationUrl: string;
};

export type InvitationPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type CreateInvitationInput = {
  expiresInDays?: number;
};

export type RegenerateInvitationInput = {
  expiresInDays?: number;
};

export type GetInvitationsParams = {
  status?: InvitationStatusFilter;
  search?: string;
  page?: number;
  limit?: number;
  sort?: InvitationSort;
};

export type PublicInvitation = {
  event: {
    id: string;
    name: string;
    eventType: string;
    eventDate: string;
    location: string;
    theme: string | null;
  };

  guest: {
    id: string;
    firstName: string;
    lastName: string;
    status: InvitationGuestStatus;
    partySize: number;
    mealPreference: string | null;
    dietaryRequirements: string | null;
  };

  invitation: {
    expiresAt: string;
    hasResponded: boolean;
  };
};

export type SubmitPublicRsvpInput = {
  status: PublicRsvpStatus;
  partySize: number;
  mealPreference?: string | null;
  dietaryRequirements?: string | null;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

type InvitationListResponse = ApiSuccessResponse<Invitation[]> & {
  pagination: InvitationPagination;
};

export async function getEventInvitations(eventId: string, params: GetInvitationsParams = {}) {
  const response = await api.get<InvitationListResponse>(`/invitations/events/${eventId}`, {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      sort: params.sort ?? 'newest',

      ...(params.status && {
        status: params.status,
      }),

      ...(params.search?.trim() && {
        search: params.search.trim(),
      }),
    },
  });

  return {
    invitations: response.data.data,
    pagination: response.data.pagination,
  };
}

export async function getInvitation(eventId: string, guestId: string) {
  const response = await api.get<ApiSuccessResponse<Invitation>>(
    `/invitations/events/${eventId}/guests/${guestId}`,
  );

  return response.data.data;
}

export async function createInvitation(
  eventId: string,
  guestId: string,
  input: CreateInvitationInput = {},
) {
  const response = await api.post<ApiSuccessResponse<InvitationWithLink>>(
    `/invitations/events/${eventId}/guests/${guestId}`,
    input,
  );

  return response.data.data;
}

export async function regenerateInvitation(
  eventId: string,
  guestId: string,
  input: RegenerateInvitationInput = {},
) {
  const response = await api.post<ApiSuccessResponse<InvitationWithLink>>(
    `/invitations/events/${eventId}/guests/${guestId}/regenerate`,
    input,
  );

  return response.data.data;
}

export async function revokeInvitation(eventId: string, guestId: string) {
  const response = await api.patch<ApiSuccessResponse<Invitation>>(
    `/invitations/events/${eventId}/guests/${guestId}/revoke`,
  );

  return response.data.data;
}

export async function getPublicInvitation(token: string) {
  const response = await api.get<ApiSuccessResponse<PublicInvitation>>(
    `/invitations/respond/${token}`,
  );

  return response.data.data;
}

export async function submitPublicRsvp(token: string, input: SubmitPublicRsvpInput) {
  const response = await api.post<ApiSuccessResponse<PublicInvitation>>(
    `/invitations/respond/${token}`,
    input,
  );

  return response.data.data;
}
