import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type {
  CreateEventInput,
  CustomerEventParams,
  GetCustomerEventsQuery,
  UpdateCustomerEventInput,
  UpdateCustomerEventStatusInput,
} from './event.schemas.js';
import {
  createCustomerEvent,
  deleteCustomerEvent,
  getCustomerEventById,
  getCustomerEvents,
  updateCustomerEvent,
  updateCustomerEventStatus,
} from './event.service.js';

export const createCustomerEventHandler: RequestHandler = asyncHandler(async (req, res) => {
  const event = await createCustomerEvent(req.auth!.userId, req.body as CreateEventInput);

  res.status(201).json({
    success: true,
    data: event,
  });
});

export const getCustomerEventsHandler: RequestHandler = asyncHandler(async (req, res) => {
  const result = await getCustomerEvents(
    req.auth!.userId,
    req.query as unknown as GetCustomerEventsQuery,
  );

  res.status(200).json({
    success: true,
    data: result.events,
    meta: {
      pagination: result.pagination,
    },
  });
});

export const getCustomerEventByIdHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as CustomerEventParams;

  const event = await getCustomerEventById(req.auth!.userId, eventId);

  res.status(200).json({
    success: true,
    data: event,
  });
});

export const updateCustomerEventHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as CustomerEventParams;

  const event = await updateCustomerEvent(
    req.auth!.userId,
    eventId,
    req.body as UpdateCustomerEventInput,
  );

  res.status(200).json({
    success: true,
    data: event,
  });
});

export const updateCustomerEventStatusHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as CustomerEventParams;

  const event = await updateCustomerEventStatus(
    req.auth!.userId,
    eventId,
    req.body as UpdateCustomerEventStatusInput,
  );

  res.status(200).json({
    success: true,
    data: event,
  });
});

export const deleteCustomerEventHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as CustomerEventParams;

  await deleteCustomerEvent(req.auth!.userId, eventId);

  res.status(204).send();
});
