import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { authorize } from '../../middleware/authorize.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { getCustomerDashboardHandler, getVendorDashboardHandler } from './dashboard.controller.js';
import { getCustomerDashboardSchema, getVendorDashboardSchema } from './dashboard.schemas.js';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/customer',
  requireAuth,
  authorize(UserRole.CUSTOMER),
  validate(getCustomerDashboardSchema),
  getCustomerDashboardHandler,
);

dashboardRouter.get(
  '/vendor',
  requireAuth,
  authorize(UserRole.VENDOR),
  validate(getVendorDashboardSchema),
  getVendorDashboardHandler,
);
