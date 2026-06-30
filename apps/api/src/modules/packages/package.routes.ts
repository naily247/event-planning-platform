import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createServicePackageHandler,
  deleteServicePackageHandler,
  getPublicServicePackageByIdHandler,
  getPublicServicePackagesHandler,
  getVendorServicePackageByIdHandler,
  getVendorServicePackagesHandler,
  updateServicePackageHandler,
  updateServicePackageStatusHandler,
} from './package.controller.js';
import {
  createServicePackageSchema,
  deleteServicePackageSchema,
  getPublicPackageByIdSchema,
  getPublicPackagesSchema,
  getServicePackageSchema,
  getVendorPackagesSchema,
  updateServicePackageSchema,
  updateServicePackageStatusSchema,
} from './package.schemas.js';

export const packageRouter = Router();

const vendorOnly = [requireAuth, authorize(UserRole.VENDOR)] as const;

packageRouter.get('/', validate(getPublicPackagesSchema), getPublicServicePackagesHandler);

packageRouter.get(
  '/me',
  ...vendorOnly,
  validate(getVendorPackagesSchema),
  getVendorServicePackagesHandler,
);

packageRouter.post(
  '/',
  ...vendorOnly,
  validate(createServicePackageSchema),
  createServicePackageHandler,
);

packageRouter.patch(
  '/:packageId/status',
  ...vendorOnly,
  validate(updateServicePackageStatusSchema),
  updateServicePackageStatusHandler,
);

packageRouter.patch(
  '/:packageId',
  ...vendorOnly,
  validate(updateServicePackageSchema),
  updateServicePackageHandler,
);

packageRouter.delete(
  '/:packageId',
  ...vendorOnly,
  validate(deleteServicePackageSchema),
  deleteServicePackageHandler,
);

packageRouter.get(
  '/:packageId',
  validate(getPublicPackageByIdSchema),
  getPublicServicePackageByIdHandler,
);

packageRouter.get(
  '/:packageId/manage',
  ...vendorOnly,
  validate(getServicePackageSchema),
  getVendorServicePackageByIdHandler,
);
