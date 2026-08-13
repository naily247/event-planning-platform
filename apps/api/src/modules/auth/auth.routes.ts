import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { uploadSingleImage } from '../../middleware/upload.middleware.js';
import { validate } from '../../middleware/validate.js';
import {
  getCurrentUserHandler,
  loginHandler,
  registerCustomerHandler,
  registerVendorHandler,
  removeCurrentUserProfileImageHandler,
  updateCurrentUserHandler,
  updateCurrentUserProfileImageHandler,
} from './auth.controller.js';
import {
  loginSchema,
  registerCustomerSchema,
  registerVendorSchema,
  updateCurrentUserSchema,
} from './auth.schemas.js';

export const authRouter = Router();

authRouter.post('/register/customer', validate(registerCustomerSchema), registerCustomerHandler);

authRouter.post('/register/vendor', validate(registerVendorSchema), registerVendorHandler);

authRouter.post('/login', validate(loginSchema), loginHandler);

authRouter.get('/me', requireAuth, getCurrentUserHandler);

authRouter.patch('/me', requireAuth, validate(updateCurrentUserSchema), updateCurrentUserHandler);

authRouter.post(
  '/me/profile-image',
  requireAuth,
  uploadSingleImage,
  updateCurrentUserProfileImageHandler,
);

authRouter.delete('/me/profile-image', requireAuth, removeCurrentUserProfileImageHandler);
