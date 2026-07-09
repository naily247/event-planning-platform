import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type { GetCustomerDashboardQuery, GetVendorDashboardQuery } from './dashboard.schemas.js';
import { getCustomerDashboard, getVendorDashboard } from './dashboard.service.js';

export const getCustomerDashboardHandler: RequestHandler = asyncHandler(async (req, res) => {
  const dashboard = await getCustomerDashboard(
    req.auth!.userId,
    req.query as unknown as GetCustomerDashboardQuery,
  );

  res.status(200).json({
    success: true,
    data: dashboard,
  });
});

export const getVendorDashboardHandler: RequestHandler = asyncHandler(async (req, res) => {
  const dashboard = await getVendorDashboard(
    req.auth!.userId,
    req.query as unknown as GetVendorDashboardQuery,
  );

  res.status(200).json({
    success: true,
    data: dashboard,
  });
});
