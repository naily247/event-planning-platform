import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  cancelCustomerBookingHandler,
  confirmVendorBookingHandler,
  createCustomerBookingHandler,
  getCustomerBookingByIdHandler,
  getCustomerBookingsHandler,
  getVendorBookingByIdHandler,
  getVendorBookingsHandler,
  rejectVendorBookingHandler,
} from './booking.controller.js';
import {
  cancelCustomerBookingSchema,
  confirmVendorBookingSchema,
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

bookingRouter.post(
  '/',
  ...customerOnly,
  validate(createCustomerBookingSchema),
  createCustomerBookingHandler,
);