import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type { CreateCustomerBookingInput } from './booking.schemas.js';
import { createCustomerBooking } from './booking.service.js';

export const createCustomerBookingHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const booking = await createCustomerBooking(
      req.auth!.userId,
      req.body as CreateCustomerBookingInput,
    );

    res.status(201).json({
      success: true,
      data: booking,
    });
  },
);