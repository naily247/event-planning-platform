import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createCustomerQuotationRequestHandler,
  getCustomerQuotationRequestByIdHandler,
  getCustomerQuotationRequestsHandler,
  getVendorQuotationRequestByIdHandler,
  getVendorQuotationRequestsHandler,
  markVendorQuotationRequestViewedHandler,
} from './quotationRequest.controller.js';
import {
  createQuotationRequestSchema,
  getCustomerQuotationRequestSchema,
  getCustomerQuotationRequestsSchema,
  getVendorQuotationRequestSchema,
  getVendorQuotationRequestsSchema,
  markVendorQuotationRequestViewedSchema,
} from './quotationRequest.schemas.js';

export const quotationRequestRouter = Router();

const customerOnly = [requireAuth, authorize(UserRole.CUSTOMER)] as const;
const vendorOnly = [requireAuth, authorize(UserRole.VENDOR)] as const;

quotationRequestRouter.get(
  '/vendor/incoming',
  ...vendorOnly,
  validate(getVendorQuotationRequestsSchema),
  getVendorQuotationRequestsHandler,
);

quotationRequestRouter.get(
  '/vendor/incoming/:quotationRequestId',
  ...vendorOnly,
  validate(getVendorQuotationRequestSchema),
  getVendorQuotationRequestByIdHandler,
);

quotationRequestRouter.patch(
  '/vendor/incoming/:quotationRequestId/viewed',
  ...vendorOnly,
  validate(markVendorQuotationRequestViewedSchema),
  markVendorQuotationRequestViewedHandler,
);

quotationRequestRouter.get(
  '/',
  ...customerOnly,
  validate(getCustomerQuotationRequestsSchema),
  getCustomerQuotationRequestsHandler,
);

quotationRequestRouter.post(
  '/',
  ...customerOnly,
  validate(createQuotationRequestSchema),
  createCustomerQuotationRequestHandler,
);

quotationRequestRouter.get(
  '/:quotationRequestId',
  ...customerOnly,
  validate(getCustomerQuotationRequestSchema),
  getCustomerQuotationRequestByIdHandler,
);
