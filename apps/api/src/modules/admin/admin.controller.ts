import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import {
  approveVendorApplication,
  getAdminReviewById,
  getAdminReviews,
  getPendingVendorApplications,
  getVendorApplicationById,
  moderateAdminReview,
  rejectVendorApplication,
} from './admin.service.js';

export const getPendingVendorApplicationsHandler: RequestHandler = asyncHandler(
  async (_req, res) => {
    const vendors = await getPendingVendorApplications();

    res.status(200).json({
      success: true,
      data: vendors,
      meta: {
        count: vendors.length,
      },
    });
  },
);

export const getVendorApplicationByIdHandler: RequestHandler = asyncHandler(async (req, res) => {
  const vendorId = req.params.vendorId;

  if (typeof vendorId !== 'string' || vendorId.trim().length === 0) {
    throw new AppError(400, 'Vendor ID is required', 'VENDOR_ID_REQUIRED');
  }

  const vendor = await getVendorApplicationById(vendorId);

  res.status(200).json({
    success: true,
    data: vendor,
  });
});

export const approveVendorApplicationHandler: RequestHandler = asyncHandler(async (req, res) => {
  const vendorId = req.params.vendorId;

  if (typeof vendorId !== 'string' || vendorId.trim().length === 0) {
    throw new AppError(400, 'Vendor ID is required', 'VENDOR_ID_REQUIRED');
  }

  const vendor = await approveVendorApplication(vendorId);

  res.status(200).json({
    success: true,
    data: vendor,
    message: 'Vendor application approved successfully',
  });
});

export const rejectVendorApplicationHandler: RequestHandler = asyncHandler(async (req, res) => {
  const vendorId = req.params.vendorId;

  if (typeof vendorId !== 'string' || vendorId.trim().length === 0) {
    throw new AppError(400, 'Vendor ID is required', 'VENDOR_ID_REQUIRED');
  }

  const vendor = await rejectVendorApplication(vendorId, req.body);

  res.status(200).json({
    success: true,
    data: vendor,
    message: 'Vendor application rejected successfully',
  });
});

export const getAdminReviewsHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const result = await getAdminReviews(req.query as never);

    res.status(200).json({
      success: true,
      data: result.reviews,
      meta: {
        pagination: result.pagination,
      },
    });
  },
);

export const getAdminReviewByIdHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const { reviewId } = req.params as { reviewId: string };

    const review = await getAdminReviewById(reviewId);

    res.status(200).json({
      success: true,
      data: review,
    });
  },
);

export const moderateAdminReviewHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const { reviewId } = req.params as { reviewId: string };

    const review = await moderateAdminReview(
      req.auth!.userId,
      reviewId,
      req.body,
    );

    res.status(200).json({
      success: true,
      data: review,
      message:
        req.body.action === 'HIDE'
          ? 'Review hidden successfully'
          : 'Review restored successfully',
    });
  },
);