import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  getVendorOnboardingProfileHandler,
  updateVendorOnboardingProfileHandler,
} from './vendor.controller.js';
import { updateVendorProfileSchema } from './vendor.schemas.js';

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
