import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type {
  CreateGuestInput,
  GuestEventParams,
  GuestParams,
  ListGuestsQuery,
  UpdateGuestInput,
  UpdateGuestRsvpInput,
} from './guest.schemas.js';
import {
  createGuest,
  deleteGuest,
  getEventGuests,
  getGuestById,
  getGuestSummary,
  updateGuest,
  updateGuestRsvp,
} from './guest.service.js';

export const createGuestHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as GuestEventParams;

  const guest = await createGuest(req.auth!.userId, eventId, req.body as CreateGuestInput);

  res.status(201).json({
    success: true,
    data: guest,
    message: 'Guest created successfully',
  });
});

export const getEventGuestsHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as GuestEventParams;

  const result = await getEventGuests(
    req.auth!.userId,
    eventId,
    req.query as unknown as ListGuestsQuery,
  );

  res.status(200).json({
    success: true,
    data: result.guests,
    pagination: result.pagination,
  });
});

export const getGuestByIdHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, guestId } = req.params as GuestParams;

  const guest = await getGuestById(req.auth!.userId, eventId, guestId);

  res.status(200).json({
    success: true,
    data: guest,
  });
});

export const updateGuestHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, guestId } = req.params as GuestParams;

  const guest = await updateGuest(req.auth!.userId, eventId, guestId, req.body as UpdateGuestInput);

  res.status(200).json({
    success: true,
    data: guest,
    message: 'Guest updated successfully',
  });
});

export const updateGuestRsvpHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, guestId } = req.params as GuestParams;

  const guest = await updateGuestRsvp(
    req.auth!.userId,
    eventId,
    guestId,
    req.body as UpdateGuestRsvpInput,
  );

  res.status(200).json({
    success: true,
    data: guest,
    message: 'Guest RSVP status updated successfully',
  });
});

export const deleteGuestHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, guestId } = req.params as GuestParams;

  await deleteGuest(req.auth!.userId, eventId, guestId);

  res.status(204).send();
});

export const getGuestSummaryHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as GuestEventParams;

  const summary = await getGuestSummary(req.auth!.userId, eventId);

  res.status(200).json({
    success: true,
    data: summary,
  });
});
