import { EventTaskPriority, EventTaskStatus } from '@prisma/client';
import { z } from 'zod';

const eventIdSchema = z.string().cuid('Event ID must be valid');

const taskIdSchema = z.string().cuid('Task ID must be valid');

const optionalDateSchema = z
  .string()
  .datetime({
    message: 'Due date must be a valid ISO 8601 date and time',
  })
  .optional()
  .nullable();

const emptyRequestPartSchema = z.object({}).strict();

export const eventTaskSortOptions = [
  'newest',
  'oldest',
  'due_soon',
  'due_latest',
  'priority_highest',
  'priority_lowest',
] as const;

export const overdueFilterOptions = ['all', 'overdue', 'not_overdue'] as const;

export const eventTaskEventParamsSchema = z.object({
  eventId: eventIdSchema,
});

export const eventTaskParamsSchema = z.object({
  eventId: eventIdSchema,
  taskId: taskIdSchema,
});

export const createEventTaskBodySchema = z.object({
  title: z.string().trim().min(2).max(150),

  description: z.string().trim().max(2000).optional().nullable(),

  status: z.nativeEnum(EventTaskStatus).optional(),

  priority: z.nativeEnum(EventTaskPriority).optional(),

  dueDate: optionalDateSchema,
});

export const updateEventTaskBodySchema = z
  .object({
    title: z.string().trim().min(2).max(150).optional(),

    description: z.string().trim().max(2000).optional().nullable(),

    priority: z.nativeEnum(EventTaskPriority).optional(),

    dueDate: optionalDateSchema,
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one task field must be provided',
  });

export const updateEventTaskStatusBodySchema = z.object({
  status: z.nativeEnum(EventTaskStatus),
});

export const eventTaskQuerySchema = z.object({
  status: z.nativeEnum(EventTaskStatus).optional(),

  priority: z.nativeEnum(EventTaskPriority).optional(),

  overdue: z.enum(overdueFilterOptions).default('all'),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  sort: z.enum(eventTaskSortOptions).default('due_soon'),
});

export const createEventTaskRequestSchema = z.object({
  params: eventTaskEventParamsSchema,
  body: createEventTaskBodySchema,
  query: emptyRequestPartSchema.optional(),
});

export const getEventTasksRequestSchema = z.object({
  params: eventTaskEventParamsSchema,
  body: emptyRequestPartSchema.optional(),
  query: eventTaskQuerySchema,
});

export const getEventTaskByIdRequestSchema = z.object({
  params: eventTaskParamsSchema,
  body: emptyRequestPartSchema.optional(),
  query: emptyRequestPartSchema.optional(),
});

export const updateEventTaskRequestSchema = z.object({
  params: eventTaskParamsSchema,
  body: updateEventTaskBodySchema,
  query: emptyRequestPartSchema.optional(),
});

export const updateEventTaskStatusRequestSchema = z.object({
  params: eventTaskParamsSchema,
  body: updateEventTaskStatusBodySchema,
  query: emptyRequestPartSchema.optional(),
});

export const deleteEventTaskRequestSchema = z.object({
  params: eventTaskParamsSchema,
  body: emptyRequestPartSchema.optional(),
  query: emptyRequestPartSchema.optional(),
});

export const getEventTaskSummaryRequestSchema = z.object({
  params: eventTaskEventParamsSchema,
  body: emptyRequestPartSchema.optional(),
  query: emptyRequestPartSchema.optional(),
});

export type CreateEventTaskInput = z.infer<typeof createEventTaskBodySchema>;

export type UpdateEventTaskInput = z.infer<typeof updateEventTaskBodySchema>;

export type UpdateEventTaskStatusInput = z.infer<typeof updateEventTaskStatusBodySchema>;

export type EventTaskQueryInput = z.infer<typeof eventTaskQuerySchema>;

export type EventTaskEventParams = z.infer<typeof eventTaskEventParamsSchema>;

export type EventTaskParams = z.infer<typeof eventTaskParamsSchema>;
