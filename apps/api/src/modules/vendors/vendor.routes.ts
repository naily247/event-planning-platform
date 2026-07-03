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
  getPublicVendorAvailabilityHandler,
  getVendorAvailabilityHandler,
  createVendorAvailabilityBlockHandler,
  deleteVendorAvailabilityBlockHandler,
} from './vendor.controller.js';
import {
  updateVendorCategoriesSchema,
  updateVendorProfileSchema,
  getPublicVendorBySlugSchema,
  getPublicVendorsSchema,
  getPublicVendorReviewsSchema,
  getPublicVendorAvailabilitySchema,
  getVendorAvailabilitySchema,
  createVendorAvailabilityBlockSchema,
  deleteVendorAvailabilityBlockSchema,
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

vendorRouter.get(
  '/me/availability',
  requireAuth,
  authorize(UserRole.VENDOR),
  validate(getVendorAvailabilitySchema),
  getVendorAvailabilityHandler,
);

vendorRouter.post(
  '/me/availability/blocks',
  requireAuth,
  authorize(UserRole.VENDOR),
  validate(createVendorAvailabilityBlockSchema),
  createVendorAvailabilityBlockHandler,
);

vendorRouter.delete(
  '/me/availability/blocks/:blockId',
  requireAuth,
  authorize(UserRole.VENDOR),
  validate(deleteVendorAvailabilityBlockSchema),
  deleteVendorAvailabilityBlockHandler,
);

vendorRouter.get(
  '/:slug/availability',
  validate(getPublicVendorAvailabilitySchema),
  getPublicVendorAvailabilityHandler,
);
