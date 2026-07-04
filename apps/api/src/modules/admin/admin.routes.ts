import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  getAdminPaymentByIdHandler,
  getPendingPaymentsHandler,
  rejectAdminPaymentHandler,
  verifyAdminPaymentHandler,
} from '../payments/payment.controller.js';
import {
  getAdminPaymentSchema,
  getPendingPaymentsSchema,
  rejectAdminPaymentSchema,
  verifyAdminPaymentSchema,
} from '../payments/payment.schemas.js';
import {
  approveVendorApplicationHandler,
  getPendingVendorApplicationsHandler,
  getVendorApplicationByIdHandler,
  rejectVendorApplicationHandler,
} from './admin.controller.js';
import { rejectVendorApplicationSchema } from './admin.schemas.js';

export const adminRouter = Router();

const adminOnly = [
  requireAuth,
  authorize(UserRole.ADMIN),
] as const;

adminRouter.get(
  '/payments/pending',
  ...adminOnly,
  validate(getPendingPaymentsSchema),
  getPendingPaymentsHandler,
);

adminRouter.get(
  '/payments/:paymentId',
  ...adminOnly,
  validate(getAdminPaymentSchema),
  getAdminPaymentByIdHandler,
);

adminRouter.patch(
  '/payments/:paymentId/verify',
  ...adminOnly,
  validate(verifyAdminPaymentSchema),
  verifyAdminPaymentHandler,
);

adminRouter.patch(
  '/payments/:paymentId/reject',
  ...adminOnly,
  validate(rejectAdminPaymentSchema),
  rejectAdminPaymentHandler,
);

adminRouter.get(
  '/vendors/pending',
  ...adminOnly,
  getPendingVendorApplicationsHandler,
);

adminRouter.get(
  '/vendors/:vendorId',
  ...adminOnly,
  getVendorApplicationByIdHandler,
);

adminRouter.patch(
  '/vendors/:vendorId/approve',
  ...adminOnly,
  approveVendorApplicationHandler,
);

adminRouter.patch(
  '/vendors/:vendorId/reject',
  ...adminOnly,
  validate(rejectVendorApplicationSchema),
  rejectVendorApplicationHandler,
);
