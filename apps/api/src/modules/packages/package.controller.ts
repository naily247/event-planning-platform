import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type {
  CreateServicePackageInput,
  GetVendorPackagesQuery,
  ServicePackageParams,
  UpdateServicePackageInput,
  UpdateServicePackageStatusInput,
} from './package.schemas.js';
import {
  createServicePackage,
  deleteServicePackage,
  getVendorServicePackageById,
  getVendorServicePackages,
  updateServicePackage,
  updateServicePackageStatus,
} from './package.service.js';

export const createServicePackageHandler: RequestHandler = asyncHandler(async (req, res) => {
  const servicePackage = await createServicePackage(
    req.auth!.userId,
    req.body as CreateServicePackageInput,
  );

  res.status(201).json({
    success: true,
    data: servicePackage,
  });
});

export const getVendorServicePackagesHandler: RequestHandler = asyncHandler(async (req, res) => {
  const servicePackages = await getVendorServicePackages(
    req.auth!.userId,
    req.query as unknown as GetVendorPackagesQuery,
  );

  res.status(200).json({
    success: true,
    data: servicePackages,
  });
});

export const getVendorServicePackageByIdHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { packageId } = req.params as ServicePackageParams;

  const servicePackage = await getVendorServicePackageById(req.auth!.userId, packageId);

  res.status(200).json({
    success: true,
    data: servicePackage,
  });
});

export const updateServicePackageHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { packageId } = req.params as ServicePackageParams;

  const servicePackage = await updateServicePackage(
    req.auth!.userId,
    packageId,
    req.body as UpdateServicePackageInput,
  );

  res.status(200).json({
    success: true,
    data: servicePackage,
  });
});

export const updateServicePackageStatusHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { packageId } = req.params as ServicePackageParams;

  const servicePackage = await updateServicePackageStatus(
    req.auth!.userId,
    packageId,
    req.body as UpdateServicePackageStatusInput,
  );

  res.status(200).json({
    success: true,
    data: servicePackage,
  });
});

export const deleteServicePackageHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { packageId } = req.params as ServicePackageParams;

  await deleteServicePackage(req.auth!.userId, packageId);

  res.status(204).send();
});
