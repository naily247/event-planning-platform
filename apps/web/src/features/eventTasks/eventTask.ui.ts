import type { EventTaskPriority, EventTaskStatus } from './eventTask.api';

export const eventTaskStatusLabels: Record<EventTaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const eventTaskPriorityLabels: Record<EventTaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const eventTaskStatusDescriptions: Record<EventTaskStatus, string> = {
  TODO: 'The task has not been started yet.',
  IN_PROGRESS: 'Work on this task is currently underway.',
  COMPLETED: 'The task has been successfully completed.',
  CANCELLED: 'The task is no longer required.',
};

export const eventTaskPriorityDescriptions: Record<EventTaskPriority, string> = {
  LOW: 'Helpful, but not currently time-sensitive.',
  MEDIUM: 'An ordinary planning task requiring attention.',
  HIGH: 'Important and should be handled soon.',
  URGENT: 'Time-sensitive and requires immediate attention.',
};

export const eventTaskStatusTones: Record<EventTaskStatus, 'gray' | 'blue' | 'green' | 'rose'> = {
  TODO: 'gray',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'rose',
};

export const eventTaskPriorityTones: Record<EventTaskPriority, 'gray' | 'blue' | 'plum' | 'rose'> =
  {
    LOW: 'gray',
    MEDIUM: 'blue',
    HIGH: 'plum',
    URGENT: 'rose',
  };

export const eventTaskSortLabels = {
  due_soon: 'Due soon',
  due_latest: 'Due latest',
  priority_highest: 'Highest priority',
  priority_lowest: 'Lowest priority',
  newest: 'Newest first',
  oldest: 'Oldest first',
} as const;

export const formatEventTaskDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value));

export const formatEventTaskCompactDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const toLocalDateTimeInput = (value: string | null) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return '';
  }

  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

export const toIsoDateTimeOrNull = (value: string) => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const date = new Date(normalizedValue);

  if (!Number.isFinite(date.getTime())) {
    throw new Error('Choose a valid due date and time.');
  }

  return date.toISOString();
};

export const validateEventTaskTitle = (value: string) => {
  const normalizedValue = value.trim();

  if (normalizedValue.length < 2) {
    throw new Error('Task title must contain at least 2 characters.');
  }

  if (normalizedValue.length > 150) {
    throw new Error('Task title cannot exceed 150 characters.');
  }

  return normalizedValue;
};

export const validateEventTaskDescription = (value: string) => {
  const normalizedValue = value.trim();

  if (normalizedValue.length > 2000) {
    throw new Error('Task description cannot exceed 2000 characters.');
  }

  return normalizedValue || null;
};

export const getEventTaskTimingLabel = ({
  dueDate,
  isOverdue,
  isDueSoon,
}: {
  dueDate: string | null;
  isOverdue: boolean;
  isDueSoon: boolean;
}) => {
  if (!dueDate) {
    return 'No due date';
  }

  if (isOverdue) {
    return 'Overdue';
  }

  if (isDueSoon) {
    return 'Due soon';
  }

  return formatEventTaskCompactDate(dueDate);
};

export const isFinishedEventTaskStatus = (status: EventTaskStatus) =>
  status === 'COMPLETED' || status === 'CANCELLED';
