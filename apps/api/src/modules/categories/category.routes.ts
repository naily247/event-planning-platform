import { Router } from 'express';
import { getServiceCategoriesHandler } from './category.controller.js';

export const categoryRouter = Router();

categoryRouter.get('/', getServiceCategoriesHandler);