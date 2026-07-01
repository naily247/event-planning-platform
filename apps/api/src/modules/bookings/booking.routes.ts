import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createCustomerBookingHandler } from './booking.controller.js';
import { createCustomerBookingSchema } from './booking.schemas.js';

export const bookingRouter = Router();

bookingRouter.post(
  '/',
  requireAuth,
  authorize(UserRole.CUSTOMER),
  validate(createCustomerBookingSchema),
  createCustomerBookingHandler,
);