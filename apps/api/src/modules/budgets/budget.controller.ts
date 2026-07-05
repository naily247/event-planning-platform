import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type {
  BudgetCategoryParams,
  CreateBudgetCategoryInput,
  CreateExpenseInput,
  EventBudgetParams,
  ExpenseParams,
  ExpenseQueryInput,
  UpdateBudgetCategoryInput,
  UpdateExpenseInput,
} from './budget.schemas.js';
import {
  createBudgetCategory,
  createExpense,
  deleteBudgetCategory,
  deleteExpense,
  getBudgetCategories,
  getBudgetSummary,
  getExpenseById,
  getExpenses,
  updateBudgetCategory,
  updateExpense,
} from './budget.service.js';

export const createBudgetCategoryHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as EventBudgetParams;

  const category = await createBudgetCategory(
    req.auth!.userId,
    eventId,
    req.body as CreateBudgetCategoryInput,
  );

  res.status(201).json({
    success: true,
    data: category,
    message: 'Budget category created successfully',
  });
});

export const getBudgetCategoriesHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as EventBudgetParams;

  const categories = await getBudgetCategories(req.auth!.userId, eventId);

  res.status(200).json({
    success: true,
    data: categories,
  });
});

export const updateBudgetCategoryHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, categoryId } = req.params as BudgetCategoryParams;

  const category = await updateBudgetCategory(
    req.auth!.userId,
    eventId,
    categoryId,
    req.body as UpdateBudgetCategoryInput,
  );

  res.status(200).json({
    success: true,
    data: category,
    message: 'Budget category updated successfully',
  });
});

export const deleteBudgetCategoryHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, categoryId } = req.params as BudgetCategoryParams;

  await deleteBudgetCategory(req.auth!.userId, eventId, categoryId);

  res.status(204).send();
});

export const createExpenseHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as EventBudgetParams;

  const expense = await createExpense(req.auth!.userId, eventId, req.body as CreateExpenseInput);

  res.status(201).json({
    success: true,
    data: expense,
    message: 'Expense created successfully',
  });
});

export const getExpensesHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as EventBudgetParams;

  const expenses = await getExpenses(
    req.auth!.userId,
    eventId,
    req.query as unknown as ExpenseQueryInput,
  );

  res.status(200).json({
    success: true,
    data: expenses,
  });
});

export const getExpenseByIdHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, expenseId } = req.params as ExpenseParams;

  const expense = await getExpenseById(req.auth!.userId, eventId, expenseId);

  res.status(200).json({
    success: true,
    data: expense,
  });
});

export const updateExpenseHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, expenseId } = req.params as ExpenseParams;

  const expense = await updateExpense(
    req.auth!.userId,
    eventId,
    expenseId,
    req.body as UpdateExpenseInput,
  );

  res.status(200).json({
    success: true,
    data: expense,
    message: 'Expense updated successfully',
  });
});

export const deleteExpenseHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId, expenseId } = req.params as ExpenseParams;

  await deleteExpense(req.auth!.userId, eventId, expenseId);

  res.status(204).send();
});

export const getBudgetSummaryHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { eventId } = req.params as EventBudgetParams;

  const summary = await getBudgetSummary(req.auth!.userId, eventId);

  res.status(200).json({
    success: true,
    data: summary,
  });
});
