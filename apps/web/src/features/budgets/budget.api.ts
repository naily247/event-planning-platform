import { api } from '../../lib/api';

export type ExpenseStatus = (typeof expenseStatuses)[number];

export type ExpenseSort = 'newest' | 'oldest' | 'amount_highest' | 'amount_lowest';

export type BudgetEventStatus = 'DRAFT' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export const expenseStatuses = [
  'PLANNED',
  'PAID',
  'CANCELLED',
] as const;

export type BudgetCategory = {
  id: string;
  eventId: string;
  name: string;
  allocatedAmount: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseBudgetCategory = {
  id: string;
  name: string;
  allocatedAmount: string;
};

export type Expense = {
  id: string;
  eventId: string;
  budgetCategoryId: string | null;
  title: string;
  amount: string;
  status: ExpenseStatus;
  expenseDate: string | null;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  budgetCategory: ExpenseBudgetCategory | null;
};

export type BudgetSummaryCategory = {
  id: string;
  name: string;
  allocatedAmount: string;
  plannedExpenses: string;
  paidExpenses: string;
  totalExpenses: string;
  remainingAmount: string;
  isOverAllocated: boolean;
  overAllocatedAmount: string;
};

export type BudgetSummary = {
  event: {
    id: string;
    name: string;
    status: BudgetEventStatus;
  };

  summary: {
    plannedBudget: string | null;
    totalAllocated: string;
    unallocatedBudget: string | null;

    bookingCommittedCost: string;
    verifiedVendorPayments: string;
    plannedManualExpenses: string;
    paidManualExpenses: string;

    totalCommitted: string;
    totalPaid: string;
    outstandingCommitted: string;

    remainingBudget: string | null;
    isOverBudget: boolean;
    overBudgetAmount: string;
  };

  counts: {
    budgetCategories: number;
    committedBookings: number;
    verifiedVendorPayments: number;
    plannedExpenses: number;
    paidExpenses: number;
    cancelledExpenses: number;
  };

  categoryBreakdown: BudgetSummaryCategory[];
};

export type CreateBudgetCategoryInput = {
  name: string;
  allocatedAmount: number;
};

export type UpdateBudgetCategoryInput = {
  name?: string;
  allocatedAmount?: number;
};

export type CreateExpenseInput = {
  budgetCategoryId?: string | null;
  title: string;
  amount: number;
  status?: ExpenseStatus;
  expenseDate?: string | null;
  dueDate?: string | null;
  notes?: string | null;
};

export type UpdateExpenseInput = {
  budgetCategoryId?: string | null;
  title?: string;
  amount?: number;
  status?: ExpenseStatus;
  expenseDate?: string | null;
  dueDate?: string | null;
  notes?: string | null;
};

export type GetExpensesParams = {
  status?: ExpenseStatus;
  categoryId?: string;
  sort?: ExpenseSort;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

export async function getBudgetSummary(eventId: string) {
  const response = await api.get<ApiSuccessResponse<BudgetSummary>>(
    `/budgets/events/${eventId}/summary`,
  );

  return response.data.data;
}

export async function getBudgetCategories(eventId: string) {
  const response = await api.get<ApiSuccessResponse<BudgetCategory[]>>(
    `/budgets/events/${eventId}/categories`,
  );

  return response.data.data;
}

export async function createBudgetCategory(eventId: string, input: CreateBudgetCategoryInput) {
  const response = await api.post<ApiSuccessResponse<BudgetCategory>>(
    `/budgets/events/${eventId}/categories`,
    input,
  );

  return response.data.data;
}

export async function updateBudgetCategory(
  eventId: string,
  categoryId: string,
  input: UpdateBudgetCategoryInput,
) {
  const response = await api.patch<ApiSuccessResponse<BudgetCategory>>(
    `/budgets/events/${eventId}/categories/${categoryId}`,
    input,
  );

  return response.data.data;
}

export async function deleteBudgetCategory(eventId: string, categoryId: string) {
  await api.delete(`/budgets/events/${eventId}/categories/${categoryId}`);
}

export async function getExpenses(eventId: string, params: GetExpensesParams = {}) {
  const response = await api.get<ApiSuccessResponse<Expense[]>>(
    `/budgets/events/${eventId}/expenses`,
    {
      params: {
        sort: params.sort ?? 'newest',
        ...(params.status && {
          status: params.status,
        }),
        ...(params.categoryId && {
          categoryId: params.categoryId,
        }),
      },
    },
  );

  return response.data.data;
}

export async function getExpenseById(eventId: string, expenseId: string) {
  const response = await api.get<ApiSuccessResponse<Expense>>(
    `/budgets/events/${eventId}/expenses/${expenseId}`,
  );

  return response.data.data;
}

export async function createExpense(eventId: string, input: CreateExpenseInput) {
  const response = await api.post<ApiSuccessResponse<Expense>>(
    `/budgets/events/${eventId}/expenses`,
    input,
  );

  return response.data.data;
}

export async function updateExpense(eventId: string, expenseId: string, input: UpdateExpenseInput) {
  const response = await api.patch<ApiSuccessResponse<Expense>>(
    `/budgets/events/${eventId}/expenses/${expenseId}`,
    input,
  );

  return response.data.data;
}

export async function deleteExpense(eventId: string, expenseId: string) {
  await api.delete(`/budgets/events/${eventId}/expenses/${expenseId}`);
}
