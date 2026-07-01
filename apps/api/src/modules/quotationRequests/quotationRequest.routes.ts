import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createCustomerQuotationRequestHandler,
  createVendorQuotationDraftHandler,
  getCustomerQuotationRequestByIdHandler,
  getCustomerQuotationRequestsHandler,
  getCustomerQuotationsHandler,
  getVendorQuotationRequestByIdHandler,
  getVendorQuotationRequestsHandler,
  markVendorQuotationRequestViewedHandler,
  getVendorQuotationDraftHandler,
  updateVendorQuotationDraftHandler,
  sendVendorQuotationDraftHandler,
} from './quotationRequest.controller.js';
import {
  createQuotationRequestSchema,
  createVendorQuotationDraftSchema,
  getCustomerQuotationRequestSchema,
  getCustomerQuotationRequestsSchema,
  getVendorQuotationRequestSchema,
  getVendorQuotationRequestsSchema,
  markVendorQuotationRequestViewedSchema,
  getVendorQuotationDraftSchema,
  updateVendorQuotationDraftSchema,
  sendVendorQuotationDraftSchema,
  getCustomerQuotationSchema,
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

quotationRequestRouter.post(
  '/vendor/incoming/:quotationRequestId/quotations',
  ...vendorOnly,
  validate(createVendorQuotationDraftSchema),
  createVendorQuotationDraftHandler,
);

quotationRequestRouter.get(
  '/vendor/incoming/:quotationRequestId/quotations/draft',
  ...vendorOnly,
  validate(getVendorQuotationDraftSchema),
  getVendorQuotationDraftHandler,
);

quotationRequestRouter.patch(
  '/vendor/incoming/:quotationRequestId/quotations/draft',
  ...vendorOnly,
  validate(updateVendorQuotationDraftSchema),
  updateVendorQuotationDraftHandler,
);

quotationRequestRouter.post(
  '/vendor/incoming/:quotationRequestId/quotations/draft/send',
  ...vendorOnly,
  validate(sendVendorQuotationDraftSchema),
  sendVendorQuotationDraftHandler,
);

quotationRequestRouter.get(
  '/:quotationRequestId',
  ...customerOnly,
  validate(getCustomerQuotationRequestSchema),
  getCustomerQuotationRequestByIdHandler,
);

quotationRequestRouter.post(
  '/',
  ...customerOnly,
  validate(createQuotationRequestSchema),
  createCustomerQuotationRequestHandler,
);

quotationRequestRouter.get(
  '/:quotationRequestId/quotations',
  ...customerOnly,
  validate(getCustomerQuotationSchema),
  getCustomerQuotationsHandler,
);

quotationRequestRouter.get(
  '/:quotationRequestId',
  ...customerOnly,
  validate(getCustomerQuotationRequestSchema),
  getCustomerQuotationRequestByIdHandler,
);
