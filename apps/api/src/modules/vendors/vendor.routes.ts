import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  getVendorOnboardingProfileHandler,
  updateVendorCategoriesHandler,
  updateVendorOnboardingProfileHandler,
  submitVendorOnboardingProfileHandler,
  getPublicVendorBySlugHandler,
  getPublicVendorsHandler,
  getPublicVendorReviewsHandler,
} from './vendor.controller.js';
import {
  updateVendorCategoriesSchema,
  updateVendorProfileSchema,
  getPublicVendorBySlugSchema,
  getPublicVendorsSchema,
  getPublicVendorReviewsSchema,
} from './vendor.schemas.js';

export const vendorRouter = Router();

vendorRouter.get('/', validate(getPublicVendorsSchema), getPublicVendorsHandler);

vendorRouter.get(
  '/me/onboarding',
  requireAuth,
  authorize(UserRole.VENDOR),
  getVendorOnboardingProfileHandler,
);

vendorRouter.patch(
  '/me/onboarding',
  requireAuth,
  authorize(UserRole.VENDOR),
  validate(updateVendorProfileSchema),
  updateVendorOnboardingProfileHandler,
);

vendorRouter.put(
  '/me/onboarding/categories',
  requireAuth,
  authorize(UserRole.VENDOR),
  validate(updateVendorCategoriesSchema),
  updateVendorCategoriesHandler,
);

vendorRouter.post(
  '/me/onboarding/submit',
  requireAuth,
  authorize(UserRole.VENDOR),
  submitVendorOnboardingProfileHandler,
);

vendorRouter.get(
  '/:slug', 
  validate(getPublicVendorBySlugSchema), 
  getPublicVendorBySlugHandler
);

vendorRouter.get(
  '/:slug/reviews',
  validate(getPublicVendorReviewsSchema),
  getPublicVendorReviewsHandler,
);