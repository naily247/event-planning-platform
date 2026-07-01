import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type { CreateQuotationRequestInput } from './quotationRequest.schemas.js';
import { createCustomerQuotationRequest } from './quotationRequest.service.js';

export const createCustomerQuotationRequestHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const quotationRequest = await createCustomerQuotationRequest(
      req.auth!.userId,
      req.body as CreateQuotationRequestInput,
    );

    res.status(201).json({
      success: true,
      data: quotationRequest,
    });
  },
);
