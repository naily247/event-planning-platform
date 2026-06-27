import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type { UpdateVendorProfileInput } from './vendor.schemas.js';
import {
  getVendorOnboardingProfile,
  updateVendorOnboardingProfile,
} from './vendor.service.js';

export const getVendorOnboardingProfileHandler: RequestHandler =
  asyncHandler(async (req, res) => {
    const result = await getVendorOnboardingProfile(
      req.auth!.userId,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  });

export const updateVendorOnboardingProfileHandler: RequestHandler =
  asyncHandler(async (req, res) => {
    const result = await updateVendorOnboardingProfile(
      req.auth!.userId,
      req.body as UpdateVendorProfileInput,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  });
