import { api } from '../../lib/api';

export const eventTaskStatuses = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

export const eventTaskPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export const eventTaskSortOptions = [
  'newest',
  'oldest',
  'due_soon',
  'due_latest',
  'priority_highest',
  'priority_lowest',
] as const;

export const eventTaskOverdueFilters = ['all', 'overdue', 'not_overdue'] as const;

export type EventTaskStatus = (typeof eventTaskStatuses)[number];

export type EventTaskPriority = (typeof eventTaskPriorities)[number];

export type EventTaskSort = (typeof eventTaskSortOptions)[number];

export type EventTaskOverdueFilter = (typeof eventTaskOverdueFilters)[number];

export type EventTaskEventStatus = 'DRAFT' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type EventTask = {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  status: EventTaskStatus;
  priority: EventTaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
  isDueSoon: boolean;
};

export type EventTaskPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type EventTaskSummary = {
  event: {
    id: string;
    name: string;
    eventDate: string;
    status: EventTaskEventStatus;
  };

  summary: {
    total: number;
    todo: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    overdue: number;
    dueSoon: number;
    activeTaskTotal: number;
    completionPercentage: number;
  };
};

export type CreateEventTaskInput = {
  title: string;
  description?: string | null;
  status?: EventTaskStatus;
  priority?: EventTaskPriority;
  dueDate?: string | null;
};

export type UpdateEventTaskInput = {
  title?: string;
  description?: string | null;
  priority?: EventTaskPriority;
  dueDate?: string | null;
};

export type UpdateEventTaskStatusInput = {
  status: EventTaskStatus;
};

export type GetEventTasksParams = {
  status?: EventTaskStatus;
  priority?: EventTaskPriority;
  overdue?: EventTaskOverdueFilter;
  sort?: EventTaskSort;
  page?: number;
  limit?: number;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

type EventTaskListResponse = ApiSuccessResponse<EventTask[]> & {
  pagination: EventTaskPagination;
};

export async function getEventTaskSummary(eventId: string) {
  const response = await api.get<ApiSuccessResponse<EventTaskSummary>>(
    `/event-tasks/events/${eventId}/summary`,
  );

  return response.data.data;
}

export async function getEventTasks(eventId: string, params: GetEventTasksParams = {}) {
  const response = await api.get<EventTaskListResponse>(`/event-tasks/events/${eventId}/tasks`, {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      sort: params.sort ?? 'due_soon',
      overdue: params.overdue ?? 'all',

      ...(params.status && {
        status: params.status,
      }),

      ...(params.priority && {
        priority: params.priority,
      }),
    },
  });

  return {
    tasks: response.data.data,
    pagination: response.data.pagination,
  };
}

export async function getEventTaskById(eventId: string, taskId: string) {
  const response = await api.get<ApiSuccessResponse<EventTask>>(
    `/event-tasks/events/${eventId}/tasks/${taskId}`,
  );

  return response.data.data;
}

export async function createEventTask(eventId: string, input: CreateEventTaskInput) {
  const response = await api.post<ApiSuccessResponse<EventTask>>(
    `/event-tasks/events/${eventId}/tasks`,
    input,
  );

  return response.data.data;
}

export async function updateEventTask(
  eventId: string,
  taskId: string,
  input: UpdateEventTaskInput,
) {
  const response = await api.patch<ApiSuccessResponse<EventTask>>(
    `/event-tasks/events/${eventId}/tasks/${taskId}`,
    input,
  );

  return response.data.data;
}

export async function updateEventTaskStatus(
  eventId: string,
  taskId: string,
  input: UpdateEventTaskStatusInput,
) {
  const response = await api.patch<ApiSuccessResponse<EventTask>>(
    `/event-tasks/events/${eventId}/tasks/${taskId}/status`,
    input,
  );

  return response.data.data;
}

export async function deleteEventTask(eventId: string, taskId: string) {
  await api.delete(`/event-tasks/events/${eventId}/tasks/${taskId}`);
}
