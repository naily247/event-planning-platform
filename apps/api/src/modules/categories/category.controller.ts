import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getServiceCategories } from './category.service.js';

export const getServiceCategoriesHandler: RequestHandler =
  asyncHandler(async (_req, res) => {
    const categories = await getServiceCategories();

    res.status(200).json({
      success: true,
      data: categories,
    });
  });
  