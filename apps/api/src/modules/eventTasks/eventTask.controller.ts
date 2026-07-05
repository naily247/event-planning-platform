import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type {
  CreateEventTaskInput,
  EventTaskEventParams,
  EventTaskParams,
  EventTaskQueryInput,
  UpdateEventTaskInput,
  UpdateEventTaskStatusInput,
} from './eventTask.schemas.js';
import {
  createEventTask,
  deleteEventTask,
  getEventTaskById,
  getEventTasks,
  getEventTaskSummary,
  updateEventTask,
  updateEventTaskStatus,
} from './eventTask.service.js';

export const createEventTaskHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as EventTaskEventParams;

  const task = await createEventTask(req.auth!.userId, eventId, req.body as CreateEventTaskInput);

  res.status(201).json({
    success: true,
    data: task,
    message: 'Event task created successfully',
  });
});

export const getEventTasksHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as EventTaskEventParams;

  const result = await getEventTasks(
    req.auth!.userId,
    eventId,
    req.query as unknown as EventTaskQueryInput,
  );

  res.status(200).json({
    success: true,
    data: result.tasks,
    pagination: result.pagination,
  });
});

export const getEventTaskByIdHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, taskId } = req.params as EventTaskParams;

  const task = await getEventTaskById(req.auth!.userId, eventId, taskId);

  res.status(200).json({
    success: true,
    data: task,
  });
});

export const updateEventTaskHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, taskId } = req.params as EventTaskParams;

  const task = await updateEventTask(
    req.auth!.userId,
    eventId,
    taskId,
    req.body as UpdateEventTaskInput,
  );

  res.status(200).json({
    success: true,
    data: task,
    message: 'Event task updated successfully',
  });
});

export const updateEventTaskStatusHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, taskId } = req.params as EventTaskParams;

  const task = await updateEventTaskStatus(
    req.auth!.userId,
    eventId,
    taskId,
    req.body as UpdateEventTaskStatusInput,
  );

  res.status(200).json({
    success: true,
    data: task,
    message: 'Event task status updated successfully',
  });
});

export const deleteEventTaskHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, taskId } = req.params as EventTaskParams;

  await deleteEventTask(req.auth!.userId, eventId, taskId);

  res.status(204).send();
});

export const getEventTaskSummaryHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as EventTaskEventParams;

  const summary = await getEventTaskSummary(req.auth!.userId, eventId);

  res.status(200).json({
    success: true,
    data: summary,
  });
});
