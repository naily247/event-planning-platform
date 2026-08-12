import { api } from '../../lib/api';

export const eventTypeOptions = [
  'Birthday',
  'Wedding',
  'Graduation',
  'Corporate',
  'Party',
  'Baby Shower',
  'Engagement',
  'Festival',
  'Anniversary',
  'Reception',
  'Product Launch',
] as const;

export type EventTypeOption = (typeof eventTypeOptions)[number];

export const eventInvitationTemplateOptions = [
  'BIRTHDAY_CONFETTI',
  'BIRTHDAY_ELEGANT',
  'BIRTHDAY_NEON',

  'WEDDING_IVORY',
  'WEDDING_BOTANICAL',
  'WEDDING_GOLD',

  'BABY_SHOWER_TEDDY',
  'BABY_SHOWER_CLOUDS',
  'BABY_SHOWER_STORYBOOK',

  'GRADUATION_CLASSIC',
  'GRADUATION_MODERN',
  'GRADUATION_GALA',

  'CORPORATE_MINIMAL',
  'CORPORATE_PREMIUM',
  'CORPORATE_EXECUTIVE',

  'PARTY_RETRO',
  'PARTY_NEON',
  'PARTY_LUXE',

  'ENGAGEMENT_ROMANCE',
  'ENGAGEMENT_GARDEN',
  'ENGAGEMENT_ROSE_GOLD',

  'FESTIVAL_VIBRANT',
  'FESTIVAL_TRADITIONAL',
  'FESTIVAL_MODERN',

  'ANNIVERSARY_CLASSIC',
  'ANNIVERSARY_GOLDEN',
  'ANNIVERSARY_ROMANTIC',

  'RECEPTION_ELEGANT',
  'RECEPTION_CRYSTAL',
  'RECEPTION_GRAND',

  'PRODUCT_LAUNCH_TECH',
  'PRODUCT_LAUNCH_MINIMAL',
  'PRODUCT_LAUNCH_PREMIUM',
] as const;

export type EventInvitationTemplate = (typeof eventInvitationTemplateOptions)[number];

export type EventStatus = 'DRAFT' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type CustomerEvent = {
  id: string;
  name: string;
  eventType: EventTypeOption;

  invitationTemplate: EventInvitationTemplate | null;
  invitationArtwork: number | null;
  invitationFont: string | null;
  invitationGradient: string | null;
  invitationAccentColor: string | null;
  invitationArtworkPosition: string | null;
  invitationDesignConfirmedAt: string | null;

  eventDate: string;
  location: string;
  guestCount: number | null;
  plannedBudget: string | null;
  theme: string | null;
  requirements: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
};

export type EventPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type EventsResponse = {
  success: true;
  data: CustomerEvent[];
  meta: {
    pagination: EventPagination;
  };
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type CreateEventPayload = {
  name: string;
  eventType: EventTypeOption;
  eventDate: string;
  location: string;
  guestCount?: number;
  plannedBudget?: number;
  theme?: string;
  requirements?: string;
};

export type UpdateEventPayload = {
  name?: string;
  eventType?: EventTypeOption;

  invitationTemplate?: EventInvitationTemplate | null;
  invitationArtwork?: number | null;
  invitationFont?: string | null;
  invitationGradient?: string | null;
  invitationAccentColor?: string | null;
  invitationArtworkPosition?: string | null;

  eventDate?: string;
  location?: string;
  guestCount?: number | null;
  plannedBudget?: number | null;
  theme?: string | null;
  requirements?: string | null;
};

export type GetCustomerEventsParams = {
  status?: EventStatus;
  page?: number;
  limit?: number;
  sort?: 'upcoming' | 'newest' | 'oldest';
};

export const getCustomerEvents = async (params: GetCustomerEventsParams = {}) => {
  const response = await api.get<EventsResponse>('/events', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      sort: params.sort ?? 'upcoming',
      ...(params.status && {
        status: params.status,
      }),
    },
  });

  return {
    events: response.data.data,
    pagination: response.data.meta.pagination,
  };
};

export const getCustomerEventById = async (eventId: string) => {
  const response = await api.get<ApiSuccessResponse<CustomerEvent>>(`/events/${eventId}`);

  return response.data.data;
};

export const createCustomerEvent = async (payload: CreateEventPayload) => {
  const response = await api.post<ApiSuccessResponse<CustomerEvent>>('/events', payload);

  return response.data.data;
};

export const updateCustomerEvent = async (eventId: string, payload: UpdateEventPayload) => {
  const response = await api.patch<ApiSuccessResponse<CustomerEvent>>(
    `/events/${eventId}`,
    payload,
  );

  return response.data.data;
};

export const confirmCustomerInvitationDesign = async (eventId: string) => {
  const response = await api.patch<ApiSuccessResponse<CustomerEvent>>(
    `/events/${eventId}/invitation-design/confirm`,
  );

  return response.data.data;
};
