import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type {
  UpdateVendorCategoriesInput,
  UpdateVendorProfileInput,
  GetPublicVendorBySlugParams,
  GetPublicVendorsQuery,
  GetPublicVendorReviewsParams,
  GetPublicVendorReviewsQuery,
  GetPublicVendorAvailabilityParams,
  GetPublicVendorAvailabilityQuery,
  GetVendorAvailabilityQuery,
  CreateVendorAvailabilityBlockInput,
  DeleteVendorAvailabilityBlockParams,
} from './vendor.schemas.js';
import {
  getVendorOnboardingProfile,
  updateVendorCategories,
  updateVendorOnboardingProfile,
  submitVendorOnboardingProfile,
  getPublicVendorBySlug,
  getPublicVendors,
  getPublicVendorReviews,
  getPublicVendorAvailability,
  getVendorAvailability,
  createVendorAvailabilityBlock,
  deleteVendorAvailabilityBlock,
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

export const getPublicVendorReviewsHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { slug } = req.params as GetPublicVendorReviewsParams;

  const result = await getPublicVendorReviews(
    slug,
    req.query as unknown as GetPublicVendorReviewsQuery,
  );

  res.status(200).json({
    success: true,
    data: result.reviews,
    meta: {
      summary: result.summary,
      pagination: result.pagination,
    },
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

export const updateVendorCategoriesHandler: RequestHandler = asyncHandler(
  async (req, res) => {
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

export const getPublicVendorAvailabilityHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const { slug } =
      req.params as GetPublicVendorAvailabilityParams;

    const result = await getPublicVendorAvailability(
      slug,
      req.query as unknown as GetPublicVendorAvailabilityQuery,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  });

export const getVendorAvailabilityHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const result = await getVendorAvailability(
      req.auth!.userId,
      req.query as unknown as GetVendorAvailabilityQuery,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  });

export const createVendorAvailabilityBlockHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const result = await createVendorAvailabilityBlock(
      req.auth!.userId,
      req.body as CreateVendorAvailabilityBlockInput,
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  });

export const deleteVendorAvailabilityBlockHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const { blockId } =
      req.params as DeleteVendorAvailabilityBlockParams;

    await deleteVendorAvailabilityBlock(
      req.auth!.userId,
      blockId,
    );

    res.status(204).send();
  });