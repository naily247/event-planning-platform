import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { rejectVendorApplicationSchema } from './admin.schemas.js';
import {
  getPendingVendorApplicationsHandler,
  getVendorApplicationByIdHandler,
  approveVendorApplicationHandler,
  rejectVendorApplicationHandler,
} from './admin.controller.js';

export const adminRouter = Router();

adminRouter.get(
  '/vendors/pending',
  requireAuth,
  authorize(UserRole.ADMIN),
  getPendingVendorApplicationsHandler,
);

adminRouter.get(
  '/vendors/:vendorId',
  requireAuth,
  authorize(UserRole.ADMIN),
  getVendorApplicationByIdHandler,
);

adminRouter.patch(
  '/vendors/:vendorId/approve',
  requireAuth,
  authorize(UserRole.ADMIN),
  approveVendorApplicationHandler,
);

adminRouter.patch(
  '/vendors/:vendorId/reject',
  requireAuth,
  authorize(UserRole.ADMIN),
  validate(rejectVendorApplicationSchema),
  rejectVendorApplicationHandler,
);
