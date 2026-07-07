import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createComplaintHandler,
  getComplaintByIdHandler,
  getMyComplaintsHandler,
  addComplaintMessageHandler,
  closeComplaintHandler,
} from './complaint.controller.js';
import {
  createComplaintSchema,
  getComplaintSchema,
  getMyComplaintsSchema,
  addComplaintMessageSchema,
  closeComplaintSchema,
} from './complaint.schemas.js';

export const complaintRouter = Router();

const customerOrVendor = [requireAuth, authorize(UserRole.CUSTOMER, UserRole.VENDOR)] as const;

complaintRouter.post(
  '/',
  ...customerOrVendor,
  validate(createComplaintSchema),
  createComplaintHandler,
);

complaintRouter.get(
  '/me',
  ...customerOrVendor,
  validate(getMyComplaintsSchema),
  getMyComplaintsHandler,
);

complaintRouter.post(
  '/:complaintId/messages',
  ...customerOrVendor,
  validate(addComplaintMessageSchema),
  addComplaintMessageHandler,
);

complaintRouter.patch(
  '/:complaintId/close',
  ...customerOrVendor,
  validate(closeComplaintSchema),
  closeComplaintHandler,
);

complaintRouter.get(
  '/:complaintId',
  ...customerOrVendor,
  validate(getComplaintSchema),
  getComplaintByIdHandler,
);
