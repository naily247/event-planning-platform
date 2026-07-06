import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type {
  CustomerReviewParams,
  GetCustomerReviewsQuery,
  UpdateCustomerReviewInput,
} from './review.schemas.js';
import {
  deleteCustomerReview,
  getCustomerReviewById,
  getCustomerReviews,
  updateCustomerReview,
} from './review.service.js';

export const getCustomerReviewsHandler: RequestHandler = asyncHandler(async (req, res) => {
  const result = await getCustomerReviews(
    req.auth!.userId,
    req.query as unknown as GetCustomerReviewsQuery,
  );

  res.status(200).json({
    success: true,
    data: result.reviews,
    meta: {
      pagination: result.pagination,
    },
  });
});

export const getCustomerReviewByIdHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { reviewId } = req.params as CustomerReviewParams;

  const review = await getCustomerReviewById(req.auth!.userId, reviewId);

  res.status(200).json({
    success: true,
    data: review,
  });
});

export const updateCustomerReviewHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { reviewId } = req.params as CustomerReviewParams;

  const review = await updateCustomerReview(
    req.auth!.userId,
    reviewId,
    req.body as UpdateCustomerReviewInput,
  );

  res.status(200).json({
    success: true,
    data: review,
  });
});

export const deleteCustomerReviewHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { reviewId } = req.params as CustomerReviewParams;

  await deleteCustomerReview(req.auth!.userId, reviewId);

  res.status(204).send();
});
