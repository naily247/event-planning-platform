import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createStripeCheckoutSessionHandler,
  getCustomerBookingPaymentsHandler,
  handleStripeWebhookHandler,
  submitCustomerPaymentHandler,
} from './payment.controller.js';
import {
  createStripeCheckoutSessionSchema,
  getCustomerPaymentsSchema,
  submitCustomerPaymentSchema,
} from './payment.schemas.js';

export const paymentRouter = Router();

const customerOnly = [requireAuth, authorize(UserRole.CUSTOMER)] as const;

paymentRouter.post(
  '/stripe/webhook',
  handleStripeWebhookHandler,
);

paymentRouter.post(
  '/bookings/:bookingId/checkout-session',
  ...customerOnly,
  validate(createStripeCheckoutSessionSchema),
  createStripeCheckoutSessionHandler,
);

paymentRouter.post(
  '/bookings/:bookingId/manual',
  ...customerOnly,
  validate(submitCustomerPaymentSchema),
  submitCustomerPaymentHandler,
);

paymentRouter.get(
  '/bookings/:bookingId',
  ...customerOnly,
  validate(getCustomerPaymentsSchema),
  getCustomerBookingPaymentsHandler,
);