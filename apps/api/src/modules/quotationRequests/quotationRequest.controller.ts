import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type {
  CreateQuotationRequestInput,
  CreateVendorQuotationDraftInput,
  CreateVendorQuotationDraftParams,
  CustomerQuotationRequestParams,
  GetCustomerQuotationRequestsQuery,
  GetVendorQuotationRequestsQuery,
  MarkVendorQuotationRequestViewedParams,
  VendorQuotationRequestParams,
  GetVendorQuotationDraftParams,
  UpdateVendorQuotationDraftInput,
  UpdateVendorQuotationDraftParams,
} from './quotationRequest.schemas.js';
import {
  createCustomerQuotationRequest,
  createVendorQuotationDraft,
  getCustomerQuotationRequestById,
  getCustomerQuotationRequests,
  getVendorQuotationDraft,
  getVendorQuotationRequestById,
  getVendorQuotationRequests,
  markVendorQuotationRequestViewed,
  updateVendorQuotationDraft,
} from './quotationRequest.service.js';

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

export const getCustomerQuotationRequestsHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const result = await getCustomerQuotationRequests(
      req.auth!.userId,
      req.query as unknown as GetCustomerQuotationRequestsQuery,
    );

    res.status(200).json({
      success: true,
      data: result.quotationRequests,
      meta: {
        pagination: result.pagination,
      },
    });
  },
);

export const getCustomerQuotationRequestByIdHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const { quotationRequestId } = req.params as CustomerQuotationRequestParams;

    const quotationRequest = await getCustomerQuotationRequestById(
      req.auth!.userId,
      quotationRequestId,
    );

    res.status(200).json({
      success: true,
      data: quotationRequest,
    });
  },
);

export const getVendorQuotationRequestsHandler: RequestHandler = asyncHandler(async (req, res) => {
  const result = await getVendorQuotationRequests(
    req.auth!.userId,
    req.query as unknown as GetVendorQuotationRequestsQuery,
  );

  res.status(200).json({
    success: true,
    data: result.quotationRequests,
    meta: {
      pagination: result.pagination,
    },
  });
});

export const getVendorQuotationRequestByIdHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const { quotationRequestId } = req.params as VendorQuotationRequestParams;

    const quotationRequest = await getVendorQuotationRequestById(
      req.auth!.userId,
      quotationRequestId,
    );

    res.status(200).json({
      success: true,
      data: quotationRequest,
    });
  },
);

export const markVendorQuotationRequestViewedHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const { quotationRequestId } = req.params as MarkVendorQuotationRequestViewedParams;

    const quotationRequest = await markVendorQuotationRequestViewed(
      req.auth!.userId,
      quotationRequestId,
    );

    res.status(200).json({
      success: true,
      data: quotationRequest,
    });
  },
);

export const createVendorQuotationDraftHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { quotationRequestId } = req.params as CreateVendorQuotationDraftParams;

  const quotation = await createVendorQuotationDraft(
    req.auth!.userId,
    quotationRequestId,
    req.body as CreateVendorQuotationDraftInput,
  );

  res.status(201).json({
    success: true,
    data: quotation,
  });
});

export const getVendorQuotationDraftHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { quotationRequestId } = req.params as GetVendorQuotationDraftParams;

  const quotation = await getVendorQuotationDraft(req.auth!.userId, quotationRequestId);

  res.status(200).json({
    success: true,
    data: quotation,
  });
});

export const updateVendorQuotationDraftHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { quotationRequestId } = req.params as UpdateVendorQuotationDraftParams;

  const quotation = await updateVendorQuotationDraft(
    req.auth!.userId,
    quotationRequestId,
    req.body as UpdateVendorQuotationDraftInput,
  );

  res.status(200).json({
    success: true,
    data: quotation,
  });
});
