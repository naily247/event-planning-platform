import { z } from 'zod';

export const expenseStatusSchema = z.enum(['PLANNED', 'PAID', 'CANCELLED']);

const moneySchema = z.number().finite().positive().max(9999999999.99);

const optionalDateSchema = z.string().datetime().optional().nullable();

export const eventIdParamSchema = z.object({
  eventId: z.string().cuid(),
});

export const budgetCategoryIdParamSchema = z.object({
  eventId: z.string().cuid(),
  categoryId: z.string().cuid(),
});

export const expenseIdParamSchema = z.object({
  eventId: z.string().cuid(),
  expenseId: z.string().cuid(),
});

export const createBudgetCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  allocatedAmount: moneySchema,
});

export const updateBudgetCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    allocatedAmount: moneySchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const createExpenseSchema = z
  .object({
    budgetCategoryId: z.string().cuid().optional().nullable(),
    title: z.string().trim().min(2).max(120),
    amount: moneySchema,
    status: expenseStatusSchema.optional(),
    expenseDate: optionalDateSchema,
    dueDate: optionalDateSchema,
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .refine(
    (value) =>
      !value.expenseDate ||
      !value.dueDate ||
      new Date(value.expenseDate) <= new Date(value.dueDate),
    {
      message: 'Expense date cannot be after due date',
      path: ['expenseDate'],
    },
  );

export const updateExpenseSchema = z
  .object({
    budgetCategoryId: z.string().cuid().optional().nullable(),
    title: z.string().trim().min(2).max(120).optional(),
    amount: moneySchema.optional(),
    status: expenseStatusSchema.optional(),
    expenseDate: optionalDateSchema,
    dueDate: optionalDateSchema,
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  })
  .refine(
    (value) =>
      !value.expenseDate ||
      !value.dueDate ||
      new Date(value.expenseDate) <= new Date(value.dueDate),
    {
      message: 'Expense date cannot be after due date',
      path: ['expenseDate'],
    },
  );

export const expenseQuerySchema = z.object({
  status: expenseStatusSchema.optional(),
  categoryId: z.string().cuid().optional(),
  sort: z.enum(['newest', 'oldest', 'amount_highest', 'amount_lowest']).default('newest'),
});

const emptyRequestPartSchema = z.object({}).strict();

export const createBudgetCategoryRequestSchema = z.object({
  params: eventIdParamSchema,
  body: createBudgetCategorySchema,
  query: emptyRequestPartSchema.optional(),
});

export const getBudgetCategoriesRequestSchema = z.object({
  params: eventIdParamSchema,
  body: emptyRequestPartSchema.optional(),
  query: emptyRequestPartSchema.optional(),
});

export const updateBudgetCategoryRequestSchema = z.object({
  params: budgetCategoryIdParamSchema,
  body: updateBudgetCategorySchema,
  query: emptyRequestPartSchema.optional(),
});

export const deleteBudgetCategoryRequestSchema = z.object({
  params: budgetCategoryIdParamSchema,
  body: emptyRequestPartSchema.optional(),
  query: emptyRequestPartSchema.optional(),
});

export const createExpenseRequestSchema = z.object({
  params: eventIdParamSchema,
  body: createExpenseSchema,
  query: emptyRequestPartSchema.optional(),
});

export const getExpensesRequestSchema = z.object({
  params: eventIdParamSchema,
  body: emptyRequestPartSchema.optional(),
  query: expenseQuerySchema,
});

export const getExpenseByIdRequestSchema = z.object({
  params: expenseIdParamSchema,
  body: emptyRequestPartSchema.optional(),
  query: emptyRequestPartSchema.optional(),
});

export const updateExpenseRequestSchema = z.object({
  params: expenseIdParamSchema,
  body: updateExpenseSchema,
  query: emptyRequestPartSchema.optional(),
});

export const deleteExpenseRequestSchema = z.object({
  params: expenseIdParamSchema,
  body: emptyRequestPartSchema.optional(),
  query: emptyRequestPartSchema.optional(),
});

export const getBudgetSummaryRequestSchema = z.object({
  params: eventIdParamSchema,
  body: emptyRequestPartSchema.optional(),
  query: emptyRequestPartSchema.optional(),
});

export type CreateBudgetCategoryInput = z.infer<typeof createBudgetCategorySchema>;

export type UpdateBudgetCategoryInput = z.infer<typeof updateBudgetCategorySchema>;

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export type ExpenseQueryInput = z.infer<typeof expenseQuerySchema>;

export type EventBudgetParams = z.infer<typeof eventIdParamSchema>;

export type BudgetCategoryParams = z.infer<typeof budgetCategoryIdParamSchema>;

export type ExpenseParams = z.infer<typeof expenseIdParamSchema>;
