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
} from './vendor.controller.js';
import {
  updateVendorCategoriesSchema,
  updateVendorProfileSchema,
} from './vendor.schemas.js';

export const vendorRouter = Router();

vendorRouter.get('/', (_req, res) =>
  res.json({
    success: true,
    data: [],
    meta: {
      note: 'Public vendor discovery foundation.',
    },
  }),
);


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