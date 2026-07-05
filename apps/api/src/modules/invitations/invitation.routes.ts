import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createInvitationHandler,
  getEventInvitationsHandler,
  getInvitationHandler,
  getPublicInvitationHandler,
  regenerateInvitationHandler,
  revokeInvitationHandler,
  submitPublicRsvpHandler,
} from './invitation.controller.js';
import {
  createInvitationRequestSchema,
  getEventInvitationsRequestSchema,
  getInvitationRequestSchema,
  getPublicInvitationRequestSchema,
  regenerateInvitationRequestSchema,
  revokeInvitationRequestSchema,
  submitPublicRsvpRequestSchema,
} from './invitation.schemas.js';

export const invitationRouter = Router();

const customerOnly = [
  requireAuth,
  authorize(UserRole.CUSTOMER),
] as const;

/*
 * Public invitation routes must appear before the event routes.
 * This prevents "respond" from ever being interpreted as an event ID.
 */
invitationRouter.get(
  '/respond/:token',
  validate(getPublicInvitationRequestSchema),
  getPublicInvitationHandler,
);

invitationRouter.post(
  '/respond/:token',
  validate(submitPublicRsvpRequestSchema),
  submitPublicRsvpHandler,
);

invitationRouter.get(
  '/events/:eventId',
  ...customerOnly,
  validate(getEventInvitationsRequestSchema),
  getEventInvitationsHandler,
);

invitationRouter.post(
  '/events/:eventId/guests/:guestId',
  ...customerOnly,
  validate(createInvitationRequestSchema),
  createInvitationHandler,
);

invitationRouter.post(
  '/events/:eventId/guests/:guestId/regenerate',
  ...customerOnly,
  validate(regenerateInvitationRequestSchema),
  regenerateInvitationHandler,
);

invitationRouter.patch(
  '/events/:eventId/guests/:guestId/revoke',
  ...customerOnly,
  validate(revokeInvitationRequestSchema),
  revokeInvitationHandler,
);

invitationRouter.get(
  '/events/:eventId/guests/:guestId',
  ...customerOnly,
  validate(getInvitationRequestSchema),
  getInvitationHandler,
);