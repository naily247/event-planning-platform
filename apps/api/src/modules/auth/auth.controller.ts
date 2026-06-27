import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  getCurrentUser,
  login,
  registerCustomer,
  registerVendor,
} from './auth.service.js';
import type {
  LoginInput,
  RegisterCustomerInput,
  RegisterVendorInput,
} from './auth.schemas.js';

export const registerCustomerHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const result = await registerCustomer(
      req.body as RegisterCustomerInput,
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  },
);

export const registerVendorHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const result = await registerVendor(
      req.body as RegisterVendorInput,
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  },
);

export const loginHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const result = await login(req.body as LoginInput);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

export const getCurrentUserHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = await getCurrentUser(req.auth!.userId);

    res.status(200).json({
      success: true,
      data: user,
    });
  },
);