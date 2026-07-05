import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createBudgetCategoryHandler,
  createExpenseHandler,
  deleteBudgetCategoryHandler,
  deleteExpenseHandler,
  getBudgetCategoriesHandler,
  getBudgetSummaryHandler,
  getExpenseByIdHandler,
  getExpensesHandler,
  updateBudgetCategoryHandler,
  updateExpenseHandler,
} from './budget.controller.js';
import {
  createBudgetCategoryRequestSchema,
  createExpenseRequestSchema,
  deleteBudgetCategoryRequestSchema,
  deleteExpenseRequestSchema,
  getBudgetCategoriesRequestSchema,
  getBudgetSummaryRequestSchema,
  getExpenseByIdRequestSchema,
  getExpensesRequestSchema,
  updateBudgetCategoryRequestSchema,
  updateExpenseRequestSchema,
} from './budget.schemas.js';

export const budgetRouter = Router();

const customerOnly = [requireAuth, authorize(UserRole.CUSTOMER)] as const;

budgetRouter.get(
  '/events/:eventId/summary',
  ...customerOnly,
  validate(getBudgetSummaryRequestSchema),
  getBudgetSummaryHandler,
);

budgetRouter.post(
  '/events/:eventId/categories',
  ...customerOnly,
  validate(createBudgetCategoryRequestSchema),
  createBudgetCategoryHandler,
);

budgetRouter.get(
  '/events/:eventId/categories',
  ...customerOnly,
  validate(getBudgetCategoriesRequestSchema),
  getBudgetCategoriesHandler,
);

budgetRouter.patch(
  '/events/:eventId/categories/:categoryId',
  ...customerOnly,
  validate(updateBudgetCategoryRequestSchema),
  updateBudgetCategoryHandler,
);

budgetRouter.delete(
  '/events/:eventId/categories/:categoryId',
  ...customerOnly,
  validate(deleteBudgetCategoryRequestSchema),
  deleteBudgetCategoryHandler,
);

budgetRouter.post(
  '/events/:eventId/expenses',
  ...customerOnly,
  validate(createExpenseRequestSchema),
  createExpenseHandler,
);

budgetRouter.get(
  '/events/:eventId/expenses',
  ...customerOnly,
  validate(getExpensesRequestSchema),
  getExpensesHandler,
);

budgetRouter.get(
  '/events/:eventId/expenses/:expenseId',
  ...customerOnly,
  validate(getExpenseByIdRequestSchema),
  getExpenseByIdHandler,
);

budgetRouter.patch(
  '/events/:eventId/expenses/:expenseId',
  ...customerOnly,
  validate(updateExpenseRequestSchema),
  updateExpenseHandler,
);

budgetRouter.delete(
  '/events/:eventId/expenses/:expenseId',
  ...customerOnly,
  validate(deleteExpenseRequestSchema),
  deleteExpenseHandler,
);
