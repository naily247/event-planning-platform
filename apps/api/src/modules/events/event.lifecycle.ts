import { EventStatus } from '@prisma/client';

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

const allowedEventStatusTransitions: Record<EventStatus, readonly EventStatus[]> = {
  [EventStatus.DRAFT]: [EventStatus.PLANNING, EventStatus.CANCELLED],

  [EventStatus.PLANNING]: [EventStatus.ACTIVE, EventStatus.CANCELLED],

  [EventStatus.ACTIVE]: [EventStatus.COMPLETED, EventStatus.CANCELLED],

  [EventStatus.COMPLETED]: [],

  [EventStatus.CANCELLED]: [],
};

const mutableWorkspaceStatuses: Record<EventWorkspace, readonly EventStatus[]> = {
  EVENT_DETAILS: [EventStatus.DRAFT, EventStatus.PLANNING],

  BUDGET: [EventStatus.DRAFT, EventStatus.PLANNING, EventStatus.ACTIVE],

  TASKS: [EventStatus.DRAFT, EventStatus.PLANNING, EventStatus.ACTIVE],

  GUESTS: [EventStatus.DRAFT, EventStatus.PLANNING, EventStatus.ACTIVE],

  INVITATIONS: [EventStatus.DRAFT, EventStatus.PLANNING, EventStatus.ACTIVE],

  QUOTATIONS: [EventStatus.PLANNING, EventStatus.ACTIVE],

  BOOKINGS: [EventStatus.DRAFT, EventStatus.PLANNING, EventStatus.ACTIVE],

  REVIEWS: [EventStatus.COMPLETED],

  COMPLAINTS: [
    EventStatus.DRAFT,
    EventStatus.PLANNING,
    EventStatus.ACTIVE,
    EventStatus.COMPLETED,
    EventStatus.CANCELLED,
  ],

  DOCUMENTS: [EventStatus.DRAFT, EventStatus.PLANNING, EventStatus.ACTIVE],

  MOOD_BOARD: [EventStatus.DRAFT, EventStatus.PLANNING, EventStatus.ACTIVE],
};

const workspaceLockedMessages: Record<EventWorkspace, Partial<Record<EventStatus, string>>> = {
  EVENT_DETAILS: {
    [EventStatus.ACTIVE]:
      'Core event details can no longer be changed after the event becomes active.',

    [EventStatus.COMPLETED]: 'This event is completed and its core details are now read-only.',

    [EventStatus.CANCELLED]: 'This event is cancelled and its core details are now read-only.',
  },

  BUDGET: {
    [EventStatus.COMPLETED]:
      'This event is completed and its budget is now preserved as a historical record.',

    [EventStatus.CANCELLED]: 'This event is cancelled and its budget can no longer be modified.',
  },

  TASKS: {
    [EventStatus.COMPLETED]:
      'This event is completed and its task history can no longer be modified.',

    [EventStatus.CANCELLED]: 'This event is cancelled and its tasks can no longer be modified.',
  },

  GUESTS: {
    [EventStatus.COMPLETED]: 'This event is completed and its guest list is now read-only.',

    [EventStatus.CANCELLED]:
      'This event is cancelled and its guest list can no longer be modified.',
  },

  INVITATIONS: {
    [EventStatus.COMPLETED]:
      'This event is completed and invitations are now available for historical reference only.',

    [EventStatus.CANCELLED]:
      'This event is cancelled and invitations can no longer be created or changed.',
  },

  QUOTATIONS: {
    [EventStatus.DRAFT]:
      'Quotation activity becomes available after the event enters the planning stage.',

    [EventStatus.COMPLETED]: 'This event is completed and quotation records are now read-only.',

    [EventStatus.CANCELLED]:
      'This event is cancelled and quotation activity can no longer continue.',
  },

  BOOKINGS: {
    [EventStatus.COMPLETED]:
      'This event is completed and its bookings are now preserved as historical records.',

    [EventStatus.CANCELLED]:
      'Normal booking changes are unavailable because this event is cancelled.',
  },

  REVIEWS: {
    [EventStatus.DRAFT]: 'Reviews become available after the event is completed.',

    [EventStatus.PLANNING]: 'Reviews become available after the event is completed.',

    [EventStatus.ACTIVE]: 'Reviews become available after the event is completed.',

    [EventStatus.CANCELLED]: 'Reviews are unavailable for cancelled events.',
  },

  COMPLAINTS: {},

  DOCUMENTS: {
    [EventStatus.COMPLETED]:
      'This event is completed and its documents are now preserved as historical records.',

    [EventStatus.CANCELLED]: 'This event is cancelled and its documents can no longer be modified.',
  },

  MOOD_BOARD: {
    [EventStatus.COMPLETED]: 'This event is completed and its mood board is now read-only.',

    [EventStatus.CANCELLED]:
      'This event is cancelled and its mood board can no longer be modified.',
  },
};

export const canTransitionEventStatus = (
  currentStatus: EventStatus,
  nextStatus: EventStatus,
): boolean => {
  if (currentStatus === nextStatus) {
    return false;
  }

  return allowedEventStatusTransitions[currentStatus].includes(nextStatus);
};

export const getAllowedEventStatusTransitions = (status: EventStatus): readonly EventStatus[] => {
  return allowedEventStatusTransitions[status];
};

export const isTerminalEventStatus = (status: EventStatus): boolean => {
  return status === EventStatus.COMPLETED || status === EventStatus.CANCELLED;
};

export const canMutateEventWorkspace = (
  status: EventStatus,
  workspace: EventWorkspace,
): boolean => {
  return mutableWorkspaceStatuses[workspace].includes(status);
};

export const canManageQuotationWorkflow = (eventStatus: EventStatus): boolean => {
  return eventStatus === EventStatus.PLANNING || eventStatus === EventStatus.ACTIVE;
};

export const canManageBookingWorkflow = (eventStatus: EventStatus): boolean => {
  return eventStatus === EventStatus.PLANNING || eventStatus === EventStatus.ACTIVE;
};

export const canCancelBookingForEvent = (eventStatus: EventStatus): boolean => {
  return (
    eventStatus === EventStatus.PLANNING ||
    eventStatus === EventStatus.ACTIVE ||
    eventStatus === EventStatus.CANCELLED
  );
};

export const canCompleteBookingForEvent = (eventStatus: EventStatus): boolean => {
  return eventStatus === EventStatus.ACTIVE;
};

export const canReviewEvent = (eventStatus: EventStatus): boolean => {
  return eventStatus === EventStatus.COMPLETED;
};

export const getWorkspaceLockedMessage = (
  status: EventStatus,
  workspace: EventWorkspace,
): string => {
  return (
    workspaceLockedMessages[workspace][status] ??
    `This action is unavailable while the event is ${status.toLowerCase().replaceAll('_', ' ')}.`
  );
};

export const canDeleteEventAtStatus = (status: EventStatus): boolean => {
  return status === EventStatus.DRAFT || status === EventStatus.CANCELLED;
};
