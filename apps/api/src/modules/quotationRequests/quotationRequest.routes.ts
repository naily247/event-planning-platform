import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createCustomerQuotationRequestHandler } from './quotationRequest.controller.js';
import { createQuotationRequestSchema } from './quotationRequest.schemas.js';

export const quotationRequestRouter = Router();

const customerOnly = [requireAuth, authorize(UserRole.CUSTOMER)] as const;

quotationRequestRouter.post(
  '/',
  ...customerOnly,
  validate(createQuotationRequestSchema),
  createCustomerQuotationRequestHandler,
);
