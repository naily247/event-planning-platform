import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type {
  ComplaintParams,
  CreateComplaintInput,
  GetMyComplaintsQuery,
  AddComplaintMessageInput,
  CloseComplaintInput,
} from './complaint.schemas.js';
import {
  createComplaint,
  getComplaintById,
  getMyComplaints,
  addComplaintMessage,
  closeComplaint,
} from './complaint.service.js';

export const createComplaintHandler: RequestHandler = asyncHandler(async (req, res) => {
  const complaint = await createComplaint(req.auth!.userId, req.body as CreateComplaintInput);

  res.status(201).json({
    success: true,
    data: complaint,
  });
});

export const getMyComplaintsHandler: RequestHandler = asyncHandler(async (req, res) => {
  const result = await getMyComplaints(
    req.auth!.userId,
    req.query as unknown as GetMyComplaintsQuery,
  );

  res.status(200).json({
    success: true,
    data: result.complaints,
    meta: {
      pagination: result.pagination,
    },
  });
});

export const getComplaintByIdHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { complaintId } = req.params as ComplaintParams;

  const complaint = await getComplaintById(req.auth!.userId, complaintId);

  res.status(200).json({
    success: true,
    data: complaint,
  });
});

export const addComplaintMessageHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { complaintId } = req.params as ComplaintParams;

  const message = await addComplaintMessage(
    req.auth!.userId,
    complaintId,
    req.body as AddComplaintMessageInput,
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

export const closeComplaintHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { complaintId } = req.params as ComplaintParams;

  const complaint = await closeComplaint(
    req.auth!.userId,
    complaintId,
    req.body as CloseComplaintInput,
  );

  res.status(200).json({
    success: true,
    data: complaint,
  });
});
