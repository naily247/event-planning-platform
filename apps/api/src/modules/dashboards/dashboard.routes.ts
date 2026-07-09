import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { getCustomerDashboardHandler } from './dashboard.controller.js';
import { getCustomerDashboardSchema } from './dashboard.schemas.js';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/customer',
  requireAuth,
  authorize(UserRole.CUSTOMER),
  validate(getCustomerDashboardSchema),
  getCustomerDashboardHandler,
);
