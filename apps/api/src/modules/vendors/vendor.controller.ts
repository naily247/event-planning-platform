import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type {
  UpdateVendorCategoriesInput,
  UpdateVendorProfileInput,
} from './vendor.schemas.js';
import {
  getVendorOnboardingProfile,
  updateVendorCategories,
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

export const updateVendorCategoriesHandler: RequestHandler =
  asyncHandler(async (req, res) => {
    const result = await updateVendorCategories(
      req.auth!.userId,
      req.body as UpdateVendorCategoriesInput,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  });