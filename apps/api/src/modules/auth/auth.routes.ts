import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  getCurrentUserHandler,
  loginHandler,
  registerCustomerHandler,
  registerVendorHandler,
} from './auth.controller.js';
import {
  loginSchema,
  registerCustomerSchema,
  registerVendorSchema,
} from './auth.schemas.js';

export const authRouter = Router();

authRouter.post(
  '/register/customer',
  validate(registerCustomerSchema),
  registerCustomerHandler,
);

authRouter.post(
  '/register/vendor',
  validate(registerVendorSchema),
  registerVendorHandler,
);

authRouter.post(
  '/login',
  validate(loginSchema),
  loginHandler,
);

authRouter.get(
  '/me',
  requireAuth,
  getCurrentUserHandler,
);