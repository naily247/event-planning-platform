import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';

import {
  getAdminReviewByIdSchema,
  getAdminReviewsSchema,
  getAdminUserByIdSchema,
  getAdminUsersSchema,
  moderateAdminReviewSchema,
  rejectVendorApplicationSchema,
  updateAdminUserStatusSchema,
} from './admin.schemas.js';

import {
  approveVendorApplicationHandler,
  getAdminComplaintByIdHandler,
  getAdminComplaintsHandler,
  getAdminReviewByIdHandler,
  getAdminReviewsHandler,
  getAdminUserByIdHandler,
  getAdminUsersHandler,
  getPendingVendorApplicationsHandler,
  getVendorApplicationByIdHandler,
  moderateAdminReviewHandler,
  rejectVendorApplicationHandler,
  reopenAdminComplaintHandler,
  updateAdminComplaintAssignmentHandler,
  updateAdminComplaintPriorityHandler,
  updateAdminComplaintStatusHandler,
  updateAdminUserStatusHandler,
} from './admin.controller.js';

import {
  getAdminPaymentSchema,
  getPendingPaymentsSchema,
  rejectAdminPaymentSchema,
  verifyAdminPaymentSchema,
} from '../payments/payment.schemas.js';

import {
  getAdminPaymentByIdHandler,
  getPendingPaymentsHandler,
  rejectAdminPaymentHandler,
  verifyAdminPaymentHandler,
} from '../payments/payment.controller.js';

import {
  getAdminComplaintSchema,
  getAdminComplaintsSchema,
  reopenAdminComplaintSchema,
  updateAdminComplaintAssignmentSchema,
  updateAdminComplaintPrioritySchema,
  updateAdminComplaintStatusSchema,
} from '../complaints/complaint.schemas.js';

export const adminRouter = Router();

const adminOnly = [requireAuth, authorize(UserRole.ADMIN)] as const;

adminRouter.get('/users', ...adminOnly, validate(getAdminUsersSchema), getAdminUsersHandler);

adminRouter.get(
  '/users/:userId',
  ...adminOnly,
  validate(getAdminUserByIdSchema),
  getAdminUserByIdHandler,
);

adminRouter.patch(
  '/users/:userId/status',
  ...adminOnly,
  validate(updateAdminUserStatusSchema),
  updateAdminUserStatusHandler,
);

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

adminRouter.get('/vendors/pending', ...adminOnly, getPendingVendorApplicationsHandler);

adminRouter.get('/vendors/:vendorId', ...adminOnly, getVendorApplicationByIdHandler);

adminRouter.patch('/vendors/:vendorId/approve', ...adminOnly, approveVendorApplicationHandler);

adminRouter.patch(
  '/vendors/:vendorId/reject',
  ...adminOnly,
  validate(rejectVendorApplicationSchema),
  rejectVendorApplicationHandler,
);

adminRouter.get('/reviews', ...adminOnly, validate(getAdminReviewsSchema), getAdminReviewsHandler);

adminRouter.get(
  '/reviews/:reviewId',
  ...adminOnly,
  validate(getAdminReviewByIdSchema),
  getAdminReviewByIdHandler,
);

adminRouter.patch(
  '/reviews/:reviewId/moderation',
  ...adminOnly,
  validate(moderateAdminReviewSchema),
  moderateAdminReviewHandler,
);

adminRouter.get(
  '/complaints',
  ...adminOnly,
  validate(getAdminComplaintsSchema),
  getAdminComplaintsHandler,
);

adminRouter.get(
  '/complaints/:complaintId',
  ...adminOnly,
  validate(getAdminComplaintSchema),
  getAdminComplaintByIdHandler,
);

adminRouter.patch(
  '/complaints/:complaintId/status',
  ...adminOnly,
  validate(updateAdminComplaintStatusSchema),
  updateAdminComplaintStatusHandler,
);

adminRouter.patch(
  '/complaints/:complaintId/assignment',
  ...adminOnly,
  validate(updateAdminComplaintAssignmentSchema),
  updateAdminComplaintAssignmentHandler,
);

adminRouter.patch(
  '/complaints/:complaintId/priority',
  ...adminOnly,
  validate(updateAdminComplaintPrioritySchema),
  updateAdminComplaintPriorityHandler,
);

adminRouter.patch(
  '/complaints/:complaintId/reopen',
  ...adminOnly,
  validate(reopenAdminComplaintSchema),
  reopenAdminComplaintHandler,
);
