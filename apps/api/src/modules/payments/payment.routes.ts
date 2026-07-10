import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { uploadSinglePaymentProof } from '../../middleware/upload.middleware.js';
import { validate } from '../../middleware/validate.js';
import {
  createStripeCheckoutSessionHandler,
  getCustomerBookingPaymentsHandler,
  handleStripeWebhookHandler,
  submitCustomerPaymentHandler,
  submitCustomerPaymentWithProofHandler,
} from './payment.controller.js';
import {
  createStripeCheckoutSessionSchema,
  getCustomerPaymentsSchema,
  submitCustomerPaymentSchema,
  submitCustomerPaymentWithProofSchema,
} from './payment.schemas.js';

export const paymentRouter = Router();

const customerOnly = [requireAuth, authorize(UserRole.CUSTOMER)] as const;

paymentRouter.post('/stripe/webhook', handleStripeWebhookHandler);

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

paymentRouter.post(
  '/bookings/:bookingId/manual/proof',
  ...customerOnly,
  uploadSinglePaymentProof,
  validate(submitCustomerPaymentWithProofSchema),
  submitCustomerPaymentWithProofHandler,
);

paymentRouter.get(
  '/bookings/:bookingId',
  ...customerOnly,
  validate(getCustomerPaymentsSchema),
  getCustomerBookingPaymentsHandler,
);
