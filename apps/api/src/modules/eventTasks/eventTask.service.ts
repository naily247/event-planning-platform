import { EventTaskPriority, EventTaskStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type {
  CreateEventTaskInput,
  EventTaskQueryInput,
  UpdateEventTaskInput,
  UpdateEventTaskStatusInput,
} from './eventTask.schemas.js';

const eventTaskSelect = {
  id: true,
  eventId: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

type SelectedEventTask = Prisma.EventTaskGetPayload<{
  select: typeof eventTaskSelect;
}>;

const isFinishedStatus = (status: EventTaskStatus) =>
  status === EventTaskStatus.COMPLETED || status === EventTaskStatus.CANCELLED;

const isTaskOverdue = (task: Pick<SelectedEventTask, 'status' | 'dueDate'>, now = new Date()) =>
  task.dueDate !== null && task.dueDate.getTime() < now.getTime() && !isFinishedStatus(task.status);

const isTaskDueSoon = (task: Pick<SelectedEventTask, 'status' | 'dueDate'>, now = new Date()) => {
  if (!task.dueDate || isFinishedStatus(task.status)) {
    return false;
  }

  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  return (
    task.dueDate.getTime() >= now.getTime() && task.dueDate.getTime() <= sevenDaysFromNow.getTime()
  );
};

const formatEventTask = (task: SelectedEventTask, now = new Date()) => ({
  ...task,
  isOverdue: isTaskOverdue(task, now),
  isDueSoon: isTaskDueSoon(task, now),
});

const getOwnedEvent = async (ownerId: string, eventId: string) => {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      ownerId,
    },

    select: {
      id: true,
      name: true,
      eventDate: true,
      status: true,
    },
  });

  if (!event) {
    throw new AppError(404, 'Event not found', 'EVENT_NOT_FOUND');
  }

  return event;
};

const getOwnedEventTask = async (ownerId: string, eventId: string, taskId: string) => {
  const task = await prisma.eventTask.findFirst({
    where: {
      id: taskId,
      eventId,

      event: {
        ownerId,
      },
    },

    select: eventTaskSelect,
  });

  if (!task) {
    throw new AppError(404, 'Event task not found', 'EVENT_TASK_NOT_FOUND');
  }

  return task;
};

const getTaskOrderBy = (
  sort: EventTaskQueryInput['sort'],
): Prisma.EventTaskOrderByWithRelationInput[] => {
  switch (sort) {
    case 'oldest':
      return [
        {
          createdAt: 'asc',
        },
      ];

    case 'due_latest':
      return [
        {
          dueDate: {
            sort: 'desc',
            nulls: 'last',
          },
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'priority_highest':
      return [
        {
          priority: 'desc',
        },
        {
          dueDate: {
            sort: 'asc',
            nulls: 'last',
          },
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'priority_lowest':
      return [
        {
          priority: 'asc',
        },
        {
          dueDate: {
            sort: 'asc',
            nulls: 'last',
          },
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'due_soon':
      return [
        {
          dueDate: {
            sort: 'asc',
            nulls: 'last',
          },
        },
        {
          priority: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'newest':
    default:
      return [
        {
          createdAt: 'desc',
        },
      ];
  }
};

const getOverdueWhere = (
  overdue: EventTaskQueryInput['overdue'],
  now: Date,
): Prisma.EventTaskWhereInput => {
  if (overdue === 'overdue') {
    return {
      dueDate: {
        lt: now,
      },

      status: {
        notIn: [EventTaskStatus.COMPLETED, EventTaskStatus.CANCELLED],
      },
    };
  }

  if (overdue === 'not_overdue') {
    return {
      OR: [
        {
          dueDate: null,
        },
        {
          dueDate: {
            gte: now,
          },
        },
        {
          status: {
            in: [EventTaskStatus.COMPLETED, EventTaskStatus.CANCELLED],
          },
        },
      ],
    };
  }

  return {};
};

export const createEventTask = async (
  ownerId: string,
  eventId: string,
  input: CreateEventTaskInput,
) => {
  await getOwnedEvent(ownerId, eventId);

  const status = input.status ?? EventTaskStatus.TODO;

  const task = await prisma.eventTask.create({
    data: {
      eventId,
      title: input.title,
      description: input.description ?? null,
      status,
      priority: input.priority ?? EventTaskPriority.MEDIUM,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      completedAt: status === EventTaskStatus.COMPLETED ? new Date() : null,
    },

    select: eventTaskSelect,
  });

  return formatEventTask(task);
};

export const getEventTasks = async (
  ownerId: string,
  eventId: string,
  query: EventTaskQueryInput,
) => {
  await getOwnedEvent(ownerId, eventId);

  const now = new Date();

  const where: Prisma.EventTaskWhereInput = {
    eventId,

    ...(query.status && {
      status: query.status,
    }),

    ...(query.priority && {
      priority: query.priority,
    }),

    ...getOverdueWhere(query.overdue, now),
  };

  const skip = (query.page - 1) * query.limit;

  const [tasks, total] = await prisma.$transaction([
    prisma.eventTask.findMany({
      where,
      select: eventTaskSelect,
      orderBy: getTaskOrderBy(query.sort),
      skip,
      take: query.limit,
    }),

    prisma.eventTask.count({
      where,
    }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

  return {
    tasks: tasks.map((task) => formatEventTask(task, now)),

    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    },
  };
};

export const getEventTaskById = async (ownerId: string, eventId: string, taskId: string) => {
  const task = await getOwnedEventTask(ownerId, eventId, taskId);

  return formatEventTask(task);
};

export const updateEventTask = async (
  ownerId: string,
  eventId: string,
  taskId: string,
  input: UpdateEventTaskInput,
) => {
  await getOwnedEventTask(ownerId, eventId, taskId);

  const task = await prisma.eventTask.update({
    where: {
      id: taskId,
    },

    data: {
      ...(input.title !== undefined && {
        title: input.title,
      }),

      ...(input.description !== undefined && {
        description: input.description,
      }),

      ...(input.priority !== undefined && {
        priority: input.priority,
      }),

      ...(input.dueDate !== undefined && {
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      }),
    },

    select: eventTaskSelect,
  });

  return formatEventTask(task);
};

export const updateEventTaskStatus = async (
  ownerId: string,
  eventId: string,
  taskId: string,
  input: UpdateEventTaskStatusInput,
) => {
  const existingTask = await getOwnedEventTask(ownerId, eventId, taskId);

  if (existingTask.status === input.status) {
    throw new AppError(409, `Event task is already ${input.status}`, 'EVENT_TASK_STATUS_UNCHANGED');
  }

  const task = await prisma.eventTask.update({
    where: {
      id: taskId,
    },

    data: {
      status: input.status,

      completedAt: input.status === EventTaskStatus.COMPLETED ? new Date() : null,
    },

    select: eventTaskSelect,
  });

  return formatEventTask(task);
};

export const deleteEventTask = async (ownerId: string, eventId: string, taskId: string) => {
  await getOwnedEventTask(ownerId, eventId, taskId);

  await prisma.eventTask.delete({
    where: {
      id: taskId,
    },
  });
};

export const getEventTaskSummary = async (ownerId: string, eventId: string) => {
  const event = await getOwnedEvent(ownerId, eventId);

  const tasks = await prisma.eventTask.findMany({
    where: {
      eventId,
    },

    select: {
      status: true,
      dueDate: true,
    },
  });

  const now = new Date();

  let todo = 0;
  let inProgress = 0;
  let completed = 0;
  let cancelled = 0;
  let overdue = 0;
  let dueSoon = 0;

  for (const task of tasks) {
    switch (task.status) {
      case EventTaskStatus.TODO:
        todo += 1;
        break;

      case EventTaskStatus.IN_PROGRESS:
        inProgress += 1;
        break;

      case EventTaskStatus.COMPLETED:
        completed += 1;
        break;

      case EventTaskStatus.CANCELLED:
        cancelled += 1;
        break;
    }

    if (isTaskOverdue(task, now)) {
      overdue += 1;
    }

    if (isTaskDueSoon(task, now)) {
      dueSoon += 1;
    }
  }

  const activeTaskTotal = tasks.length - cancelled;

  const completionPercentage =
    activeTaskTotal === 0 ? 0 : Number(((completed / activeTaskTotal) * 100).toFixed(2));

  return {
    event: {
      id: event.id,
      name: event.name,
      eventDate: event.eventDate,
      status: event.status,
    },

    summary: {
      total: tasks.length,
      todo,
      inProgress,
      completed,
      cancelled,
      overdue,
      dueSoon,
      activeTaskTotal,
      completionPercentage,
    },
  };
};
