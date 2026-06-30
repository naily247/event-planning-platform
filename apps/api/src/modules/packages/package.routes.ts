import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createServicePackageHandler,
  deleteServicePackageHandler,
  getVendorServicePackageByIdHandler,
  getVendorServicePackagesHandler,
  updateServicePackageHandler,
  updateServicePackageStatusHandler,
} from './package.controller.js';
import {
  createServicePackageSchema,
  deleteServicePackageSchema,
  getServicePackageSchema,
  getVendorPackagesSchema,
  updateServicePackageSchema,
  updateServicePackageStatusSchema,
} from './package.schemas.js';

export const packageRouter = Router();

packageRouter.use(requireAuth, authorize(UserRole.VENDOR));

packageRouter.post('/', validate(createServicePackageSchema), createServicePackageHandler);

packageRouter.get('/me', validate(getVendorPackagesSchema), getVendorServicePackagesHandler);

packageRouter.get(
  '/:packageId',
  validate(getServicePackageSchema),
  getVendorServicePackageByIdHandler,
);

packageRouter.patch(
  '/:packageId',
  validate(updateServicePackageSchema),
  updateServicePackageHandler,
);

packageRouter.patch(
  '/:packageId/status',
  validate(updateServicePackageStatusSchema),
  updateServicePackageStatusHandler,
);

packageRouter.delete(
  '/:packageId',
  validate(deleteServicePackageSchema),
  deleteServicePackageHandler,
);
