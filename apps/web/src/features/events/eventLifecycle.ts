import type { EventStatus } from './event.api';

export type EventWorkspace =
  | 'EVENT_DETAILS'
  | 'BUDGET'
  | 'TASKS'
  | 'GUESTS'
  | 'INVITATIONS'
  | 'QUOTATIONS'
  | 'BOOKINGS'
  | 'REVIEWS'
  | 'COMPLAINTS'
  | 'DOCUMENTS'
  | 'MOOD_BOARD';

const editableStatuses: Record<EventWorkspace, readonly EventStatus[]> = {
  EVENT_DETAILS: ['DRAFT', 'PLANNING'],

  BUDGET: ['DRAFT', 'PLANNING', 'ACTIVE'],

  TASKS: ['DRAFT', 'PLANNING', 'ACTIVE'],

  GUESTS: ['DRAFT', 'PLANNING', 'ACTIVE'],

  INVITATIONS: ['DRAFT', 'PLANNING', 'ACTIVE'],

  QUOTATIONS: ['PLANNING', 'ACTIVE'],

  BOOKINGS: ['PLANNING', 'ACTIVE'],

  REVIEWS: ['COMPLETED'],

  COMPLAINTS: ['DRAFT', 'PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED'],

  DOCUMENTS: ['DRAFT', 'PLANNING', 'ACTIVE'],

  MOOD_BOARD: ['DRAFT', 'PLANNING', 'ACTIVE'],
};

const workspaceMessages: Partial<Record<EventWorkspace, Partial<Record<EventStatus, string>>>> = {
  EVENT_DETAILS: {
    ACTIVE: 'Event details become read-only once the event is active.',
    COMPLETED: 'This event has been completed.',
    CANCELLED: 'This event has been cancelled.',
  },

  BUDGET: {
    COMPLETED: 'Budget is preserved for historical reference.',
    CANCELLED: 'Budget can no longer be modified.',
  },

  TASKS: {
    COMPLETED: 'Tasks are preserved for historical reference.',
    CANCELLED: 'Tasks can no longer be modified.',
  },

  GUESTS: {
    COMPLETED: 'Guest list is now read-only.',
    CANCELLED: 'Guest list can no longer be modified.',
  },

  INVITATIONS: {
    COMPLETED: 'Invitations are now historical records.',
    CANCELLED: 'Invitation management has been disabled.',
  },

  QUOTATIONS: {
    DRAFT: 'Quotation requests become available once planning begins.',
    COMPLETED: 'Quotation workflow has finished.',
    CANCELLED: 'Quotation workflow has been closed.',
  },

  BOOKINGS: {
    COMPLETED: 'Bookings are now historical records.',
    CANCELLED: 'Only booking cancellation remains available.',
  },

  REVIEWS: {
    DRAFT: 'Reviews become available after the event is completed.',
    PLANNING: 'Reviews become available after the event is completed.',
    ACTIVE: 'Reviews become available after the event is completed.',
    CANCELLED: 'Reviews are unavailable for cancelled events.',
  },

  DOCUMENTS: {
    COMPLETED: 'Documents are preserved for historical reference.',
    CANCELLED: 'Documents can no longer be modified.',
  },

  MOOD_BOARD: {
    COMPLETED: 'Mood board is now read-only.',
    CANCELLED: 'Mood board can no longer be modified.',
  },
};

export const canManageWorkspace = (status: EventStatus, workspace: EventWorkspace) =>
  editableStatuses[workspace].includes(status);

export const hasEventStarted = (eventDate: string, now: Date = new Date()): boolean => {
  const eventTime = new Date(eventDate).getTime();

  // Event dates should always be valid, but fail closed if bad data
  // somehow reaches the frontend.
  if (Number.isNaN(eventTime)) {
    return true;
  }

  return eventTime <= now.getTime();
};

export const canManageInvitationWorkflow = (
  status: EventStatus,
  eventDate: string,
  now: Date = new Date(),
): boolean => {
  if (!canManageWorkspace(status, 'INVITATIONS')) {
    return false;
  }

  return !hasEventStarted(eventDate, now);
};

export const canRespondToInvitation = (
  status: EventStatus,
  eventDate: string,
  now: Date = new Date(),
): boolean => {
  return canManageInvitationWorkflow(status, eventDate, now);
};

export const getInvitationWorkflowLockedMessage = (
  status: EventStatus,
  eventDate: string,
  now: Date = new Date(),
): string => {
  if (status === 'COMPLETED') {
    return 'This event is completed. Invitation activity and guest responses are now closed.';
  }

  if (status === 'CANCELLED') {
    return 'This event is cancelled. Invitation access and guest responses are now closed.';
  }

  if (hasEventStarted(eventDate, now)) {
    return 'This event has already started. New invitations, replacement links and guest responses are now closed.';
  }

  return getWorkspaceLockedMessage(status, 'INVITATIONS');
};

export const canManageBookings = (status: EventStatus) =>
  status === 'PLANNING' || status === 'ACTIVE';

export const canCancelBooking = (status: EventStatus) =>
  status === 'PLANNING' || status === 'ACTIVE' || status === 'CANCELLED';

export const canCompleteBooking = (status: EventStatus) => status === 'ACTIVE';

export const canReview = (status: EventStatus) => status === 'COMPLETED';

export const getWorkspaceLockedMessage = (status: EventStatus, workspace: EventWorkspace) =>
  workspaceMessages[workspace]?.[status] ??
  `This action is unavailable while the event is ${status.toLowerCase().replaceAll('_', ' ')}.`;
