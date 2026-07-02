import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type {
  CancelCustomerBookingInput,
  CancelVendorBookingInput,
  ConfirmVendorBookingInput,
  CreateCustomerBookingInput,
  CustomerBookingParams,
  GetCustomerBookingsQuery,
  GetVendorBookingsQuery,
  RejectVendorBookingInput,
  VendorBookingParams,
} from './booking.schemas.js';
import {
  cancelCustomerBooking,
  cancelVendorBooking,
  confirmVendorBooking,
  createCustomerBooking,
  getCustomerBookingById,
  getCustomerBookings,
  getVendorBookingById,
  getVendorBookings,
  rejectVendorBooking,
  completeVendorBooking,
} from './booking.service.js';

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

export const getCustomerBookingsHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const result = await getCustomerBookings(
      req.auth!.userId,
      req.query as unknown as GetCustomerBookingsQuery,
    );

    res.status(200).json({
      success: true,
      data: result.bookings,
      meta: {
        pagination: result.pagination,
      },
    });
  },
);

export const getCustomerBookingByIdHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const { bookingId } = req.params as CustomerBookingParams;

    const booking = await getCustomerBookingById(
      req.auth!.userId,
      bookingId,
    );

    res.status(200).json({
      success: true,
      data: booking,
    });
  },
);

export const cancelCustomerBookingHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const { bookingId } = req.params as CustomerBookingParams;

    const booking = await cancelCustomerBooking(
      req.auth!.userId,
      bookingId,
      req.body as CancelCustomerBookingInput,
    );

    res.status(200).json({
      success: true,
      data: booking,
    });
  },
);

export const getVendorBookingsHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const result = await getVendorBookings(
      req.auth!.userId,
      req.query as unknown as GetVendorBookingsQuery,
    );

    res.status(200).json({
      success: true,
      data: result.bookings,
      meta: {
        pagination: result.pagination,
      },
    });
  },
);

export const getVendorBookingByIdHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const { bookingId } = req.params as VendorBookingParams;

    const booking = await getVendorBookingById(
      req.auth!.userId,
      bookingId,
    );

    res.status(200).json({
      success: true,
      data: booking,
    });
  },
);

export const confirmVendorBookingHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const { bookingId } = req.params as VendorBookingParams;

    const booking = await confirmVendorBooking(
      req.auth!.userId,
      bookingId,
      req.body as ConfirmVendorBookingInput,
    );

    res.status(200).json({
      success: true,
      data: booking,
    });
  },
);

export const rejectVendorBookingHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const { bookingId } = req.params as VendorBookingParams;

    const booking = await rejectVendorBooking(
      req.auth!.userId,
      bookingId,
      req.body as RejectVendorBookingInput,
    );

    res.status(200).json({
      success: true,
      data: booking,
    });
  },
);

export const cancelVendorBookingHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const { bookingId } = req.params as VendorBookingParams;

    const booking = await cancelVendorBooking(
      req.auth!.userId,
      bookingId,
      req.body as CancelVendorBookingInput,
    );

    res.status(200).json({
      success: true,
      data: booking,
    });
  },
);

export const completeVendorBookingHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const { bookingId } = req.params as VendorBookingParams;

    const booking = await completeVendorBooking(
      req.auth!.userId,
      bookingId,
    );

    res.status(200).json({
      success: true,
      data: booking,
    });
  },
);