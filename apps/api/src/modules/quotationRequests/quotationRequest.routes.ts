import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createCustomerQuotationRequestHandler,
  getCustomerQuotationRequestByIdHandler,
  getCustomerQuotationRequestsHandler,
} from './quotationRequest.controller.js';
import {
  createQuotationRequestSchema,
  getCustomerQuotationRequestSchema,
  getCustomerQuotationRequestsSchema,
} from './quotationRequest.schemas.js';

export const quotationRequestRouter = Router();

const customerOnly = [requireAuth, authorize(UserRole.CUSTOMER)] as const;

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
