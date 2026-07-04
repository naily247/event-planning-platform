import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  getCustomerBookingPaymentsHandler,
  submitCustomerPaymentHandler,
} from '../payments/payment.controller.js';
import {
  getCustomerPaymentsSchema,
  submitCustomerPaymentSchema,
} from '../payments/payment.schemas.js';
import {
  cancelCustomerBookingHandler,
  cancelVendorBookingHandler,
  completeVendorBookingHandler,
  confirmVendorBookingHandler,
  createCustomerBookingHandler,
  createCustomerBookingReviewHandler,
  getCustomerBookingByIdHandler,
  getCustomerBookingsHandler,
  getVendorBookingByIdHandler,
  getVendorBookingsHandler,
  rejectVendorBookingHandler,
} from './booking.controller.js';
import {
  cancelCustomerBookingSchema,
  cancelVendorBookingSchema,
  completeVendorBookingSchema,
  confirmVendorBookingSchema,
  createCustomerBookingReviewSchema,
  createCustomerBookingSchema,
  getCustomerBookingSchema,
  getCustomerBookingsSchema,
  getVendorBookingSchema,
  getVendorBookingsSchema,
  rejectVendorBookingSchema,
} from './booking.schemas.js';

export const bookingRouter = Router();

const customerOnly = [
  requireAuth,
  authorize(UserRole.CUSTOMER),
] as const;

const vendorOnly = [
  requireAuth,
  authorize(UserRole.VENDOR),
] as const;

bookingRouter.get(
  '/customer',
  ...customerOnly,
  validate(getCustomerBookingsSchema),
  getCustomerBookingsHandler,
);

bookingRouter.post(
  '/customer/:bookingId/payments',
  ...customerOnly,
  validate(submitCustomerPaymentSchema),
  submitCustomerPaymentHandler,
);

bookingRouter.get(
  '/customer/:bookingId/payments',
  ...customerOnly,
  validate(getCustomerPaymentsSchema),
  getCustomerBookingPaymentsHandler,
);

bookingRouter.get(
  '/customer/:bookingId',
  ...customerOnly,
  validate(getCustomerBookingSchema),
  getCustomerBookingByIdHandler,
);

bookingRouter.patch(
  '/customer/:bookingId/cancel',
  ...customerOnly,
  validate(cancelCustomerBookingSchema),
  cancelCustomerBookingHandler,
);

bookingRouter.post(
  '/customer/:bookingId/review',
  ...customerOnly,
  validate(createCustomerBookingReviewSchema),
  createCustomerBookingReviewHandler,
);

bookingRouter.get(
  '/vendor/incoming',
  ...vendorOnly,
  validate(getVendorBookingsSchema),
  getVendorBookingsHandler,
);

bookingRouter.get(
  '/vendor/incoming/:bookingId',
  ...vendorOnly,
  validate(getVendorBookingSchema),
  getVendorBookingByIdHandler,
);

bookingRouter.patch(
  '/vendor/incoming/:bookingId/confirm',
  ...vendorOnly,
  validate(confirmVendorBookingSchema),
  confirmVendorBookingHandler,
);

bookingRouter.patch(
  '/vendor/incoming/:bookingId/reject',
  ...vendorOnly,
  validate(rejectVendorBookingSchema),
  rejectVendorBookingHandler,
);

bookingRouter.patch(
  '/vendor/incoming/:bookingId/cancel',
  ...vendorOnly,
  validate(cancelVendorBookingSchema),
  cancelVendorBookingHandler,
);

bookingRouter.patch(
  '/vendor/incoming/:bookingId/complete',
  ...vendorOnly,
  validate(completeVendorBookingSchema),
  completeVendorBookingHandler,
);

bookingRouter.post(
  '/',
  ...customerOnly,
  validate(createCustomerBookingSchema),
  createCustomerBookingHandler,
);