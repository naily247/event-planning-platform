import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type {
  AdminPaymentParams,
  CustomerPaymentParams,
  GetPendingPaymentsQuery,
  RejectAdminPaymentInput,
  SubmitCustomerPaymentInput,
} from './payment.schemas.js';
import {
  getAdminPaymentById,
  getCustomerBookingPayments,
  getPendingPayments,
  rejectAdminPayment,
  submitCustomerPayment,
  verifyAdminPayment,
} from './payment.service.js';

export const submitCustomerPaymentHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { bookingId } = req.params as CustomerPaymentParams;

  const payment = await submitCustomerPayment(
    req.auth!.userId,
    bookingId,
    req.body as SubmitCustomerPaymentInput,
  );

  res.status(201).json({
    success: true,
    data: payment,
    message: 'Deposit payment submitted successfully',
  });
});

export const getCustomerBookingPaymentsHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { bookingId } = req.params as CustomerPaymentParams;

  const payments = await getCustomerBookingPayments(req.auth!.userId, bookingId);

  res.status(200).json({
    success: true,
    data: payments,
    meta: {
      count: payments.length,
    },
  });
});

export const getPendingPaymentsHandler: RequestHandler = asyncHandler(async (req, res) => {
  const result = await getPendingPayments(req.query as unknown as GetPendingPaymentsQuery);

  res.status(200).json({
    success: true,
    data: result.payments,
    meta: {
      pagination: result.pagination,
    },
  });
});

export const getAdminPaymentByIdHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { paymentId } = req.params as AdminPaymentParams;

  const payment = await getAdminPaymentById(paymentId);

  res.status(200).json({
    success: true,
    data: payment,
  });
});

export const verifyAdminPaymentHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { paymentId } = req.params as AdminPaymentParams;

  const payment = await verifyAdminPayment(req.auth!.userId, paymentId);

  res.status(200).json({
    success: true,
    data: payment,
    message: 'Payment verified successfully',
  });
});

export const rejectAdminPaymentHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { paymentId } = req.params as AdminPaymentParams;

  const payment = await rejectAdminPayment(
    req.auth!.userId,
    paymentId,
    req.body as RejectAdminPaymentInput,
  );

  res.status(200).json({
    success: true,
    data: payment,
    message: 'Payment rejected successfully',
  });
});
