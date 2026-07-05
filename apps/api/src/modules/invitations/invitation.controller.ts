import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type {
  CreateInvitationBody,
  InvitationEventParams,
  InvitationGuestParams,
  InvitationListQuery,
  InvitationTokenParams,
  PublicRsvpBody,
  RegenerateInvitationBody,
} from './invitation.schemas.js';
import {
  createInvitation,
  getEventInvitations,
  getInvitation,
  getPublicInvitation,
  regenerateInvitation,
  revokeInvitation,
  submitPublicRsvp,
} from './invitation.service.js';

export const createInvitationHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, guestId } = req.params as InvitationGuestParams;

  const result = await createInvitation(
    req.auth!.userId,
    eventId,
    guestId,
    req.body as CreateInvitationBody,
  );

  res.status(201).json({
    success: true,
    message: 'Invitation created successfully',
    data: {
      ...result.invitation,
      token: result.token,
      invitationUrl: result.invitationUrl,
    },
  });
});

export const regenerateInvitationHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, guestId } = req.params as InvitationGuestParams;

  const result = await regenerateInvitation(
    req.auth!.userId,
    eventId,
    guestId,
    req.body as RegenerateInvitationBody,
  );

  res.status(200).json({
    success: true,
    message: 'Invitation regenerated successfully',
    data: {
      ...result.invitation,
      token: result.token,
      invitationUrl: result.invitationUrl,
    },
  });
});

export const revokeInvitationHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, guestId } = req.params as InvitationGuestParams;

  const invitation = await revokeInvitation(req.auth!.userId, eventId, guestId);

  res.status(200).json({
    success: true,
    message: 'Invitation revoked successfully',
    data: invitation,
  });
});

export const getInvitationHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, guestId } = req.params as InvitationGuestParams;

  const invitation = await getInvitation(req.auth!.userId, eventId, guestId);

  res.status(200).json({
    success: true,
    data: invitation,
  });
});

export const getEventInvitationsHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as InvitationEventParams;

  const result = await getEventInvitations(
    req.auth!.userId,
    eventId,
    req.query as unknown as InvitationListQuery,
  );

  res.status(200).json({
    success: true,
    data: result.invitations,
    pagination: result.pagination,
  });
});

export const getPublicInvitationHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { token } = req.params as InvitationTokenParams;

  const invitation = await getPublicInvitation(token);

  res.status(200).json({
    success: true,
    data: invitation,
  });
});

export const submitPublicRsvpHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { token } = req.params as InvitationTokenParams;

  const invitation = await submitPublicRsvp(token, req.body as PublicRsvpBody);

  res.status(200).json({
    success: true,
    message: 'RSVP submitted successfully',
    data: invitation,
  });
});
