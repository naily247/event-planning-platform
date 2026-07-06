import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  deleteCustomerReviewHandler,
  getCustomerReviewByIdHandler,
  getCustomerReviewsHandler,
  updateCustomerReviewHandler,
} from './review.controller.js';
import {
  deleteCustomerReviewSchema,
  getCustomerReviewSchema,
  getCustomerReviewsSchema,
  updateCustomerReviewSchema,
} from './review.schemas.js';

export const reviewRouter = Router();

const customerOnly = [requireAuth, authorize(UserRole.CUSTOMER)] as const;

reviewRouter.get(
  '/me',
  ...customerOnly,
  validate(getCustomerReviewsSchema),
  getCustomerReviewsHandler,
);

reviewRouter.get(
  '/:reviewId',
  ...customerOnly,
  validate(getCustomerReviewSchema),
  getCustomerReviewByIdHandler,
);

reviewRouter.patch(
  '/:reviewId',
  ...customerOnly,
  validate(updateCustomerReviewSchema),
  updateCustomerReviewHandler,
);

reviewRouter.delete(
  '/:reviewId',
  ...customerOnly,
  validate(deleteCustomerReviewSchema),
  deleteCustomerReviewHandler,
);
