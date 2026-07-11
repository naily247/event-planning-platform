import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { uploadSingleImage } from '../../middleware/upload.middleware.js';
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
  uploadVendorPortfolioImageHandler,
  getVendorPortfolioHandler,
  updateVendorPortfolioItemHandler,
  reorderVendorPortfolioItemsHandler,
  deleteVendorPortfolioItemHandler,
  getPublicVendorPortfolioHandler,
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
  uploadVendorPortfolioImageSchema,
  updateVendorPortfolioItemSchema,
  reorderVendorPortfolioItemsSchema,
  deleteVendorPortfolioItemSchema,
  getPublicVendorPortfolioSchema,
} from './vendor.schemas.js';

export const vendorRouter = Router();

const vendorOnly = [requireAuth, authorize(UserRole.VENDOR)] as const;

vendorRouter.get('/', validate(getPublicVendorsSchema), getPublicVendorsHandler);

vendorRouter.get('/me/onboarding', ...vendorOnly, getVendorOnboardingProfileHandler);

vendorRouter.patch(
  '/me/onboarding',
  ...vendorOnly,
  validate(updateVendorProfileSchema),
  updateVendorOnboardingProfileHandler,
);

vendorRouter.put(
  '/me/onboarding/categories',
  ...vendorOnly,
  validate(updateVendorCategoriesSchema),
  updateVendorCategoriesHandler,
);

vendorRouter.post('/me/onboarding/submit', ...vendorOnly, submitVendorOnboardingProfileHandler);

vendorRouter.get(
  '/me/availability',
  ...vendorOnly,
  validate(getVendorAvailabilitySchema),
  getVendorAvailabilityHandler,
);

vendorRouter.post(
  '/me/availability/blocks',
  ...vendorOnly,
  validate(createVendorAvailabilityBlockSchema),
  createVendorAvailabilityBlockHandler,
);

vendorRouter.delete(
  '/me/availability/blocks/:blockId',
  ...vendorOnly,
  validate(deleteVendorAvailabilityBlockSchema),
  deleteVendorAvailabilityBlockHandler,
);

vendorRouter.post(
  '/me/portfolio/upload',
  ...vendorOnly,
  uploadSingleImage,
  validate(uploadVendorPortfolioImageSchema),
  uploadVendorPortfolioImageHandler,
);

vendorRouter.get('/me/portfolio', ...vendorOnly, getVendorPortfolioHandler);

vendorRouter.patch(
  '/me/portfolio/reorder',
  ...vendorOnly,
  validate(reorderVendorPortfolioItemsSchema),
  reorderVendorPortfolioItemsHandler,
);

vendorRouter.patch(
  '/me/portfolio/:portfolioItemId',
  ...vendorOnly,
  validate(updateVendorPortfolioItemSchema),
  updateVendorPortfolioItemHandler,
);

vendorRouter.delete(
  '/me/portfolio/:portfolioItemId',
  ...vendorOnly,
  validate(deleteVendorPortfolioItemSchema),
  deleteVendorPortfolioItemHandler,
);

vendorRouter.get(
  '/:slug/reviews',
  validate(getPublicVendorReviewsSchema),
  getPublicVendorReviewsHandler,
);

vendorRouter.get(
  '/:slug/availability',
  validate(getPublicVendorAvailabilitySchema),
  getPublicVendorAvailabilityHandler,
);

vendorRouter.get(
  '/:slug/portfolio',
  validate(getPublicVendorPortfolioSchema),
  getPublicVendorPortfolioHandler,
);

vendorRouter.get('/:slug', validate(getPublicVendorBySlugSchema), getPublicVendorBySlugHandler);
