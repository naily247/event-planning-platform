import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type {
  UpdateVendorCategoriesInput,
  UpdateVendorProfileInput,
  GetPublicVendorBySlugParams,
  GetPublicVendorsQuery,
} from './vendor.schemas.js';
import {
  getVendorOnboardingProfile,
  updateVendorCategories,
  updateVendorOnboardingProfile,
  submitVendorOnboardingProfile,
  getPublicVendorBySlug,
  getPublicVendors,
} from './vendor.service.js';

export const getPublicVendorsHandler: RequestHandler = asyncHandler(async (req, res) => {
  const result = await getPublicVendors(req.query as unknown as GetPublicVendorsQuery);

  res.status(200).json({
    success: true,
    data: result.vendors,
    meta: {
      pagination: result.pagination,
    },
  });
});

export const getPublicVendorBySlugHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { slug } = req.params as GetPublicVendorBySlugParams;

  const vendor = await getPublicVendorBySlug(slug);

  res.status(200).json({
    success: true,
    data: vendor,
  });
});

export const getVendorOnboardingProfileHandler: RequestHandler = asyncHandler(async (req, res) => {
  const result = await getVendorOnboardingProfile(req.auth!.userId);

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const updateVendorOnboardingProfileHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const result = await updateVendorOnboardingProfile(
      req.auth!.userId,
      req.body as UpdateVendorProfileInput,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

export const updateVendorCategoriesHandler: RequestHandler = asyncHandler(async (req, res) => {
  const result = await updateVendorCategories(
    req.auth!.userId,
    req.body as UpdateVendorCategoriesInput,
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const submitVendorOnboardingProfileHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const result = await submitVendorOnboardingProfile(req.auth!.userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);
