import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  CircleAlert,
  CircleDollarSign,
  CreditCard,
  LoaderCircle,
  PiggyBank,
  ReceiptText,
  Sparkles,
  WalletCards,
  Plus,
  Save,
  X,
  Trash2,
  Pencil,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  createBudgetCategory,
  createExpense,
  deleteBudgetCategory,
  deleteExpense,
  expenseStatuses,
  getBudgetCategories,
  getBudgetSummary,
  getExpenses,
  updateBudgetCategory,
  updateExpense,
  type BudgetSummary,
  type BudgetSummaryCategory,
  type Expense,
  type ExpenseStatus,
} from '../features/budgets/budget.api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PageBackButton } from '../components/navigation/PageBackButton';
import { canManageWorkspace, getWorkspaceLockedMessage } from '../features/events/eventLifecycle';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Category name must be at least 2 characters.')
    .max(80, 'Category name cannot exceed 80 characters.'),

  allocatedAmount: z
    .string()
    .min(1, 'Allocated amount is required.')
    .refine(
      (value) => {
        const amount = Number(value);

        return Number.isFinite(amount) && amount > 0 && amount <= 9_999_999_999.99;
      },
      {
        message: 'Enter a valid positive amount.',
      },
    ),
});

type CreateCategoryFormValues = z.infer<typeof createCategorySchema>;

const createExpenseSchema = z
  .object({
    budgetCategoryId: z.string(),
    title: z
      .string()
      .trim()
      .min(2, 'Expense title must be at least 2 characters.')
      .max(120, 'Expense title cannot exceed 120 characters.'),

    amount: z
      .string()
      .min(1, 'Expense amount is required.')
      .refine(
        (value) => {
          const amount = Number(value);

          return Number.isFinite(amount) && amount > 0 && amount <= 9_999_999_999.99;
        },
        {
          message: 'Enter a valid positive amount.',
        },
      ),

    status: z.enum(expenseStatuses),

    expenseDate: z.string(),
    dueDate: z.string(),

    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters.'),
  })
  .refine(
    (values) => {
      if (!values.expenseDate || !values.dueDate) {
        return true;
      }

      return new Date(values.expenseDate) <= new Date(values.dueDate);
    },
    {
      message: 'Expense date cannot be after due date.',
      path: ['expenseDate'],
    },
  );

type CreateExpenseFormValues = z.infer<typeof createExpenseSchema>;

const formatCurrency = (value: string | null) => {
  if (value === null) {
    return 'Not set';
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 'Not set';
  }

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'We could not load this budget workspace. Please try again.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'We could not load this budget workspace. Please try again.'
  );
};

const toLocalDateTimeInput = (value: string | null) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return 'Not scheduled';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en-LK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getBudgetUsagePercentage = (summary: BudgetSummary) => {
  const plannedBudget = Number(summary.summary.plannedBudget ?? 0);
  const totalCommitted = Number(summary.summary.totalCommitted);

  if (!Number.isFinite(plannedBudget) || plannedBudget <= 0) {
    return 0;
  }

  return Math.min(Math.max((totalCommitted / plannedBudget) * 100, 0), 100);
};

export function BudgetWorkspacePage() {
  const { eventId } = useParams<{ eventId: string }>();

  const queryClient = useQueryClient();
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<BudgetSummaryCategory | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<BudgetSummaryCategory | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const categoryForm = useForm<CreateCategoryFormValues>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: '',
      allocatedAmount: '',
    },
  });

  const expenseForm = useForm<CreateExpenseFormValues>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      budgetCategoryId: '',
      title: '',
      amount: '',
      status: 'PLANNED',
      expenseDate: '',
      dueDate: '',
      notes: '',
    },
  });

  const summaryQuery = useQuery({
    queryKey: ['customer', 'events', eventId, 'budget', 'summary'],
    enabled: Boolean(eventId),
    queryFn: () => getBudgetSummary(eventId!),
  });

  const eventStatus = summaryQuery.data?.event.status;

  const isBudgetEditable =
    eventStatus !== undefined ? canManageWorkspace(eventStatus, 'BUDGET') : false;

  const budgetLockedMessage =
    eventStatus !== undefined && !isBudgetEditable
      ? getWorkspaceLockedMessage(eventStatus, 'BUDGET')
      : null;

  const categoriesQuery = useQuery({
    queryKey: ['customer', 'events', eventId, 'budget', 'categories'],
    enabled: Boolean(eventId),
    queryFn: () => getBudgetCategories(eventId!),
  });

  const expensesQuery = useQuery({
    queryKey: ['customer', 'events', eventId, 'budget', 'expenses'],
    enabled: Boolean(eventId),
    queryFn: () =>
      getExpenses(eventId!, {
        sort: 'newest',
      }),
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (values: CreateCategoryFormValues) => {
      if (!eventId) {
        throw new Error('Event ID is missing.');
      }

      return createBudgetCategory(eventId, {
        name: values.name.trim(),
        allocatedAmount: Number(values.allocatedAmount),
      });
    },

    onSuccess: async () => {
      setIsCategoryFormOpen(false);
      categoryForm.reset();

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'budget', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'budget', 'categories'],
        }),
      ]);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (values: CreateCategoryFormValues) => {
      if (!eventId || !categoryToEdit) {
        throw new Error('Budget category details are missing.');
      }

      const nextName = values.name.trim();
      const nextAllocatedAmount = Number(values.allocatedAmount);

      const input: {
        name?: string;
        allocatedAmount?: number;
      } = {};

      if (nextName !== categoryToEdit.name) {
        input.name = nextName;
      }

      if (nextAllocatedAmount !== Number(categoryToEdit.allocatedAmount)) {
        input.allocatedAmount = nextAllocatedAmount;
      }

      return updateBudgetCategory(eventId, categoryToEdit.id, input);
    },

    onSuccess: async () => {
      setIsCategoryFormOpen(false);
      setCategoryToEdit(null);
      categoryForm.reset();

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'budget', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'budget', 'categories'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'budget', 'expenses'],
        }),
      ]);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      if (!eventId) {
        throw new Error('Event ID is missing.');
      }

      await deleteBudgetCategory(eventId, categoryId);
    },

    onSuccess: async () => {
      setCategoryToDelete(null);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'budget', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'budget', 'categories'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'budget', 'expenses'],
        }),
      ]);
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (values: CreateExpenseFormValues) => {
      if (!eventId) {
        throw new Error('Event ID is missing.');
      }

      return createExpense(eventId, {
        budgetCategoryId: values.budgetCategoryId || null,
        title: values.title.trim(),
        amount: Number(values.amount),
        status: values.status,
        expenseDate: values.expenseDate ? new Date(values.expenseDate).toISOString() : null,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
        notes: values.notes.trim() || null,
      });
    },

    onSuccess: async () => {
      setIsExpenseFormOpen(false);
      expenseForm.reset();

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'budget', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'budget', 'categories'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'budget', 'expenses'],
        }),
      ]);
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async (values: CreateExpenseFormValues) => {
      if (!eventId || !expenseToEdit) {
        throw new Error('Expense details are missing.');
      }

      const input: {
        budgetCategoryId?: string | null;
        title?: string;
        amount?: number;
        status?: ExpenseStatus;
        expenseDate?: string | null;
        dueDate?: string | null;
        notes?: string | null;
      } = {};

      const nextTitle = values.title.trim();
      const nextAmount = Number(values.amount);
      const nextCategoryId = values.budgetCategoryId || null;
      const nextExpenseDate = values.expenseDate
        ? new Date(values.expenseDate).toISOString()
        : null;
      const nextDueDate = values.dueDate ? new Date(values.dueDate).toISOString() : null;
      const nextNotes = values.notes.trim() || null;

      if (nextTitle !== expenseToEdit.title) {
        input.title = nextTitle;
      }

      if (nextAmount !== Number(expenseToEdit.amount)) {
        input.amount = nextAmount;
      }

      if (nextCategoryId !== expenseToEdit.budgetCategoryId) {
        input.budgetCategoryId = nextCategoryId;
      }

      if (values.status !== expenseToEdit.status) {
        input.status = values.status;
      }

      if (nextExpenseDate !== expenseToEdit.expenseDate) {
        input.expenseDate = nextExpenseDate;
      }

      if (nextDueDate !== expenseToEdit.dueDate) {
        input.dueDate = nextDueDate;
      }

      if (nextNotes !== expenseToEdit.notes) {
        input.notes = nextNotes;
      }

      return updateExpense(eventId, expenseToEdit.id, input);
    },

    onSuccess: async () => {
      setExpenseToEdit(null);
      setIsExpenseFormOpen(false);
      expenseForm.reset();

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'budget', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'budget', 'categories'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'budget', 'expenses'],
        }),
      ]);
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      if (!eventId) {
        throw new Error('Event ID is missing.');
      }

      await deleteExpense(eventId, expenseId);
    },

    onSuccess: async () => {
      setExpenseToDelete(null);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'budget', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'budget', 'categories'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'budget', 'expenses'],
        }),
      ]);
    },
  });

  const openDeleteExpenseDialog = (expense: Expense) => {
    if (!isBudgetEditable) {
      return;
    }

    deleteExpenseMutation.reset();
    setExpenseToDelete(expense);
  };

  const closeDeleteExpenseDialog = () => {
    if (deleteExpenseMutation.isPending) {
      return;
    }

    deleteExpenseMutation.reset();
    setExpenseToDelete(null);
  };

  const openEditExpenseForm = (expense: Expense) => {
    if (!isBudgetEditable) {
      return;
    }

    createExpenseMutation.reset();
    updateExpenseMutation.reset();
    expenseForm.clearErrors();

    expenseForm.reset({
      budgetCategoryId: expense.budgetCategoryId ?? '',
      title: expense.title,
      amount: expense.amount,
      status: expense.status,
      expenseDate: toLocalDateTimeInput(expense.expenseDate),
      dueDate: toLocalDateTimeInput(expense.dueDate),
      notes: expense.notes ?? '',
    });

    setExpenseToEdit(expense);
    setIsExpenseFormOpen(true);
  };

  const openExpenseForm = () => {
    if (!isBudgetEditable) {
      return;
    }

    createExpenseMutation.reset();
    updateExpenseMutation.reset();

    setExpenseToEdit(null);

    expenseForm.reset({
      budgetCategoryId: '',
      title: '',
      amount: '',
      status: 'PLANNED',
      expenseDate: '',
      dueDate: '',
      notes: '',
    });

    setIsExpenseFormOpen(true);
  };

  const closeExpenseForm = () => {
    if (createExpenseMutation.isPending || updateExpenseMutation.isPending) {
      return;
    }

    createExpenseMutation.reset();
    updateExpenseMutation.reset();
    expenseForm.clearErrors();
    setExpenseToEdit(null);
    setIsExpenseFormOpen(false);
  };

  const submitExpense = expenseForm.handleSubmit((values) => {
    expenseForm.clearErrors('root');

    if (expenseToEdit) {
      const nextTitle = values.title.trim();
      const nextAmount = Number(values.amount);
      const nextCategoryId = values.budgetCategoryId || null;
      const nextExpenseDate = values.expenseDate
        ? new Date(values.expenseDate).toISOString()
        : null;
      const nextDueDate = values.dueDate ? new Date(values.dueDate).toISOString() : null;
      const nextNotes = values.notes.trim() || null;

      const hasChanges =
        nextTitle !== expenseToEdit.title ||
        nextAmount !== Number(expenseToEdit.amount) ||
        nextCategoryId !== expenseToEdit.budgetCategoryId ||
        values.status !== expenseToEdit.status ||
        nextExpenseDate !== expenseToEdit.expenseDate ||
        nextDueDate !== expenseToEdit.dueDate ||
        nextNotes !== expenseToEdit.notes;

      if (!hasChanges) {
        expenseForm.setError('root', {
          type: 'manual',
          message: 'No expense details were changed.',
        });

        return;
      }

      updateExpenseMutation.mutate(values);
      return;
    }

    createExpenseMutation.mutate(values);
  });

  const openDeleteCategoryDialog = (category: BudgetSummaryCategory) => {
    if (!isBudgetEditable) {
      return;
    }

    deleteCategoryMutation.reset();
    setCategoryToDelete(category);
  };

  const closeDeleteCategoryDialog = () => {
    if (deleteCategoryMutation.isPending) {
      return;
    }

    deleteCategoryMutation.reset();
    setCategoryToDelete(null);
  };

  const openEditCategoryForm = (category: BudgetSummaryCategory) => {
    if (!isBudgetEditable) {
      return;
    }

    createCategoryMutation.reset();
    updateCategoryMutation.reset();
    categoryForm.clearErrors();

    categoryForm.reset({
      name: category.name,
      allocatedAmount: category.allocatedAmount,
    });

    setCategoryToEdit(category);
    setIsCategoryFormOpen(true);
  };

  const openCategoryForm = () => {
    if (!isBudgetEditable) {
      return;
    }

    createCategoryMutation.reset();
    updateCategoryMutation.reset();

    setCategoryToEdit(null);

    categoryForm.reset({
      name: '',
      allocatedAmount: '',
    });

    setIsCategoryFormOpen(true);
  };

  const closeCategoryForm = () => {
    if (createCategoryMutation.isPending || updateCategoryMutation.isPending) {
      return;
    }

    createCategoryMutation.reset();
    updateCategoryMutation.reset();
    categoryForm.clearErrors();
    setCategoryToEdit(null);
    setIsCategoryFormOpen(false);
  };

  const submitCategory = categoryForm.handleSubmit((values) => {
    categoryForm.clearErrors('root');

    if (categoryToEdit) {
      const nextName = values.name.trim();
      const nextAllocatedAmount = Number(values.allocatedAmount);

      const nameChanged = nextName !== categoryToEdit.name;
      const amountChanged = nextAllocatedAmount !== Number(categoryToEdit.allocatedAmount);

      if (!nameChanged && !amountChanged) {
        categoryForm.setError('root', {
          type: 'manual',
          message: 'No category details were changed.',
        });

        return;
      }

      updateCategoryMutation.mutate(values);
      return;
    }

    createCategoryMutation.mutate(values);
  });

  const isLoading = summaryQuery.isLoading || categoriesQuery.isLoading || expensesQuery.isLoading;

  const isError = summaryQuery.isError || categoriesQuery.isError || expensesQuery.isError;

  const firstError = summaryQuery.error ?? categoriesQuery.error ?? expensesQuery.error;

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Loading budget workspace
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Gathering allocations, expenses and payment totals.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !eventId || !summaryQuery.data || !categoriesQuery.data || !expensesQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Budget workspace unavailable
            </p>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {eventId ? getApiErrorMessage(firstError) : 'The event address is invalid.'}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {eventId ? (
                <button
                  type="button"
                  className="btn-primary text-sm font-bold"
                  onClick={() => {
                    void Promise.all([
                      summaryQuery.refetch(),
                      categoriesQuery.refetch(),
                      expensesQuery.refetch(),
                    ]);
                  }}
                >
                  Try again
                </button>
              ) : null}

              <Link to="/events" className="btn-secondary text-sm font-bold">
                <ArrowLeft className="size-4" />
                Back to events
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const summary = summaryQuery.data;
  const categories = categoriesQuery.data;
  const expenses = expensesQuery.data;

  const isExpenseMutationPending =
    createExpenseMutation.isPending || updateExpenseMutation.isPending;

  const isCategoryMutationPending =
    createCategoryMutation.isPending || updateCategoryMutation.isPending;

  const budgetUsagePercentage = getBudgetUsagePercentage(summary);

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <PageBackButton
              fallback={`/events/${eventId}`}
              label="Event workspace"
              className="shrink-0"
            />

            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Event budget
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                {summary.event.name}
              </h1>
            </div>
          </div>

          <span className="status-chip w-fit" data-tone="plum">
            {summary.event.status.replaceAll('_', ' ')}
          </span>
        </header>

        <main className="py-10">
          {budgetLockedMessage ? (
            <div className="mb-6 flex items-start gap-4 rounded-[1.5rem] border border-[rgba(93,58,85,0.14)] bg-[rgba(255,255,255,0.58)] px-5 py-4 shadow-[0_14px_36px_rgba(31,27,29,0.05)] backdrop-blur-xl">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                <CircleAlert aria-hidden="true" className="size-5" />
              </span>

              <div>
                <p className="text-sm font-black text-[var(--color-near-black)]">
                  Budget is read-only
                </p>

                <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                  {budgetLockedMessage}
                </p>
              </div>
            </div>
          ) : null}
          <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/68 bg-[#fffaf6] px-5 py-5 shadow-[0_24px_68px_rgba(31,27,29,0.1)] sm:px-6 lg:min-h-[21.5rem] lg:px-7 lg:py-6">
            <img
              src="/images/workspaces/shortcuts/budget.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-30 size-full scale-[1.01] object-cover object-[77%_center] opacity-100 saturate-[0.94] contrast-[0.99]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(255,250,246,0.998)_0%,rgba(255,250,246,0.99)_23%,rgba(255,250,246,0.94)_37%,rgba(255,250,246,0.77)_48%,rgba(255,250,246,0.43)_59%,rgba(255,250,246,0.13)_69%,rgba(255,250,246,0.02)_78%,transparent_87%)]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 -z-20 w-[56%] bg-[linear-gradient(90deg,rgba(255,250,246,0.34),rgba(255,250,246,0.08),transparent)] backdrop-blur-[2px]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,transparent_48%,rgba(255,250,246,0.08)_100%)]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-28 -top-36 -z-10 size-[28rem] rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl"
            />

            <div className="relative lg:w-[53%] lg:max-w-[38rem]">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/72 bg-white/48 px-3 py-1.5 text-[0.6rem] font-black uppercase tracking-[0.2em] text-[var(--color-deep-plum)] shadow-[0_8px_24px_rgba(31,27,29,0.06)] backdrop-blur-xl">
                <Sparkles aria-hidden="true" className="size-3" />
                Financial planning
              </div>

              <div className="mt-2.5 rounded-[1.25rem] border border-white/46 bg-white/[0.16] px-4 py-3.5 shadow-[0_12px_30px_rgba(31,27,29,0.045)] backdrop-blur-[3px] sm:px-5">
                <h2 className="max-w-[31rem] text-balance text-[1.7rem] font-black leading-[0.98] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-[1.9rem] lg:text-[2rem]">
                  Keep every event cost clear and under control.
                </h2>

                <p className="mt-2 max-w-[31rem] text-[0.78rem] font-semibold leading-[1.15rem] text-[var(--color-charcoal)]/68 sm:text-[0.8rem]">
                  Track allocations, expenses, paid costs and vendor commitments from one organised
                  financial workspace.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="group/hero-add-expense btn-primary justify-center px-4 py-2 text-xs font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(93,58,85,0.22)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    disabled={!isBudgetEditable}
                    onClick={openExpenseForm}
                  >
                    <Plus
                      aria-hidden="true"
                      className="size-3.5 transition duration-300 group-hover/hero-add-expense:rotate-90"
                    />
                    Add expense
                  </button>

                  <button
                    type="button"
                    className="btn-secondary justify-center px-4 py-2 text-xs font-bold transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/56 hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    disabled={!isBudgetEditable}
                    onClick={openCategoryForm}
                  >
                    <WalletCards aria-hidden="true" className="size-3.5" />
                    Add category
                  </button>

                  <span
                    className="status-chip px-2.5 py-1 text-[0.62rem]"
                    data-tone={summary.summary.isOverBudget ? 'rose' : 'green'}
                  >
                    {summary.summary.isOverBudget ? 'Needs attention' : 'On track'}
                  </span>
                </div>

                <div className="mt-2.5 rounded-[0.95rem] border border-white/58 bg-white/36 px-3.5 py-2 backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[0.54rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                      Budget committed
                    </p>

                    <p className="text-[0.68rem] font-black text-[var(--color-deep-plum)]">
                      {Math.round(budgetUsagePercentage)}%
                    </p>
                  </div>

                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[rgba(93,58,85,0.09)]">
                    <div
                      className={
                        summary.summary.isOverBudget
                          ? 'h-full rounded-full bg-[linear-gradient(90deg,var(--color-muted-burgundy),#cf98a5)] transition-[width] duration-700'
                          : 'h-full rounded-full bg-[linear-gradient(90deg,var(--color-deep-plum),var(--color-muted-burgundy),#d7b7c3)] transition-[width] duration-700'
                      }
                      style={{
                        width: `${budgetUsagePercentage}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <article className="group/budget-metric rounded-[1rem] border border-white/68 bg-white/44 px-3 py-2.5 shadow-[0_10px_26px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/58">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                      <WalletCards aria-hidden="true" className="size-3" />
                    </span>

                    <div className="min-w-0">
                      <p className="text-[0.52rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/45">
                        Planned
                      </p>

                      <p className="mt-0.5 truncate text-[0.86rem] font-black tracking-[-0.035em] text-[var(--color-near-black)] sm:text-[0.92rem]">
                        {formatCurrency(summary.summary.plannedBudget)}
                      </p>
                    </div>
                  </div>
                </article>

                <article className="group/budget-metric rounded-[1rem] border border-white/68 bg-[rgba(240,247,250,0.48)] px-3 py-2.5 shadow-[0_10px_26px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/58">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[rgba(175,201,216,0.28)] text-[#334954]">
                      <CreditCard aria-hidden="true" className="size-3" />
                    </span>

                    <div className="min-w-0">
                      <p className="text-[0.52rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/45">
                        Committed
                      </p>

                      <p className="mt-0.5 truncate text-[0.86rem] font-black tracking-[-0.035em] text-[var(--color-near-black)] sm:text-[0.92rem]">
                        {formatCurrency(summary.summary.totalCommitted)}
                      </p>
                    </div>
                  </div>
                </article>

                <article className="group/budget-metric rounded-[1rem] border border-white/68 bg-[rgba(244,246,236,0.5)] px-3 py-2.5 shadow-[0_10px_26px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/58">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[rgba(142,151,115,0.20)] text-[#3d452f]">
                      <ReceiptText aria-hidden="true" className="size-3" />
                    </span>

                    <div className="min-w-0">
                      <p className="text-[0.52rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/45">
                        Paid
                      </p>

                      <p className="mt-0.5 truncate text-[0.86rem] font-black tracking-[-0.035em] text-[var(--color-near-black)] sm:text-[0.92rem]">
                        {formatCurrency(summary.summary.totalPaid)}
                      </p>
                    </div>
                  </div>
                </article>

                <article
                  className={
                    summary.summary.isOverBudget
                      ? 'group/budget-metric rounded-[1rem] border border-[rgba(124,74,90,0.16)] bg-[rgba(249,235,240,0.54)] px-3 py-2.5 shadow-[0_10px_26px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/58'
                      : 'group/budget-metric rounded-[1rem] border border-white/68 bg-[rgba(248,242,234,0.54)] px-3 py-2.5 shadow-[0_10px_26px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/58'
                  }
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        summary.summary.isOverBudget
                          ? 'grid size-7 shrink-0 place-items-center rounded-lg bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]'
                          : 'grid size-7 shrink-0 place-items-center rounded-lg bg-[rgba(233,221,207,0.72)] text-[var(--color-deep-plum)]'
                      }
                    >
                      <PiggyBank aria-hidden="true" className="size-3" />
                    </span>

                    <div className="min-w-0">
                      <p className="text-[0.52rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/45">
                        {summary.summary.isOverBudget ? 'Over budget' : 'Remaining'}
                      </p>

                      <p
                        className={
                          summary.summary.isOverBudget
                            ? 'mt-0.5 truncate text-[0.86rem] font-black tracking-[-0.035em] text-[var(--color-muted-burgundy)] sm:text-[0.92rem]'
                            : 'mt-0.5 truncate text-[0.86rem] font-black tracking-[-0.035em] text-[var(--color-near-black)] sm:text-[0.92rem]'
                        }
                      >
                        {summary.summary.isOverBudget
                          ? formatCurrency(summary.summary.overBudgetAmount)
                          : formatCurrency(summary.summary.remainingBudget)}
                      </p>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="glass-card p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                    Category breakdown
                  </p>

                  <h2 className="mt-1.5 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    Allocations and spending by category.
                  </h2>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className="soft-chip w-fit px-3 py-1.5 text-xs">
                    {summary.counts.budgetCategories} categories
                  </span>

                  <button
                    type="button"
                    className="btn-primary px-3.5 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!isBudgetEditable}
                    onClick={openCategoryForm}
                  >
                    <Plus className="size-3.5" />
                    Add category
                  </button>
                </div>
              </div>

              {summary.categoryBreakdown.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {summary.categoryBreakdown.map((category) => {
                    const allocatedAmount = Number(category.allocatedAmount);
                    const totalExpenses = Number(category.totalExpenses);

                    const usagePercentage =
                      allocatedAmount > 0
                        ? Math.min(Math.max((totalExpenses / allocatedAmount) * 100, 0), 100)
                        : 0;

                    return (
                      <article
                        key={category.id}
                        className="group/category relative overflow-hidden rounded-[1.35rem] border border-white/60 bg-white/28 p-4 shadow-[0_14px_34px_rgba(31,27,29,0.045)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/82 hover:bg-white/40 hover:shadow-[0_22px_50px_rgba(31,27,29,0.08)]"
                      >
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute -right-12 -top-14 size-32 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl transition duration-500 group-hover/category:scale-125 group-hover/category:bg-[rgba(183,167,200,0.24)]"
                        />

                        <div className="relative">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_8px_20px_rgba(31,27,29,0.05)] transition duration-300 group-hover/category:-translate-y-0.5 group-hover/category:scale-105">
                                <WalletCards aria-hidden="true" className="size-4" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-base font-black tracking-[-0.025em] text-[var(--color-near-black)] transition duration-300 group-hover/category:text-[var(--color-deep-plum)]">
                                  {category.name}
                                </p>

                                <p className="mt-0.5 text-xs font-semibold text-[var(--color-charcoal)]/48">
                                  Category allocation
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                              <span
                                className="status-chip w-fit px-2.5 py-1 text-[0.68rem]"
                                data-tone={category.isOverAllocated ? 'rose' : 'green'}
                              >
                                {category.isOverAllocated
                                  ? `Over by ${formatCurrency(category.overAllocatedAmount)}`
                                  : `${formatCurrency(category.remainingAmount)} left`}
                              </span>

                              <button
                                type="button"
                                className="grid size-8 place-items-center rounded-full border border-[rgba(93,58,85,0.16)] bg-[rgba(93,58,85,0.07)] text-[var(--color-deep-plum)] transition duration-300 hover:-translate-y-0.5 hover:bg-[rgba(93,58,85,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/30 disabled:cursor-not-allowed disabled:opacity-35"
                                aria-label={`Edit ${category.name}`}
                                disabled={!isBudgetEditable}
                                onClick={() => {
                                  openEditCategoryForm(category);
                                }}
                              >
                                <Pencil aria-hidden="true" className="size-3.5" />
                              </button>

                              <button
                                type="button"
                                className="grid size-8 place-items-center rounded-full border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.07)] text-[var(--color-muted-burgundy)] transition duration-300 hover:-translate-y-0.5 hover:bg-[rgba(124,74,90,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-muted-burgundy)]/30 disabled:cursor-not-allowed disabled:opacity-35"
                                aria-label={`Delete ${category.name}`}
                                disabled={!isBudgetEditable}
                                onClick={() => {
                                  openDeleteCategoryDialog(category);
                                }}
                              >
                                <Trash2 aria-hidden="true" className="size-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                            <div>
                              <p className="text-[0.65rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                                Amount used
                              </p>

                              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <p className="text-xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                                  {formatCurrency(category.totalExpenses)}
                                </p>

                                <p className="text-xs font-bold text-[var(--color-charcoal)]/46">
                                  of {formatCurrency(category.allocatedAmount)}
                                </p>
                              </div>
                            </div>

                            <p
                              className={`text-xs font-black ${
                                category.isOverAllocated
                                  ? 'text-[var(--color-muted-burgundy)]'
                                  : 'text-[var(--color-deep-plum)]'
                              }`}
                            >
                              {Math.round(usagePercentage)}% used
                            </p>
                          </div>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(93,58,85,0.08)]">
                            <div
                              className={`h-full rounded-full transition-[width,filter] duration-700 group-hover/category:brightness-110 ${
                                category.isOverAllocated
                                  ? 'bg-[linear-gradient(90deg,var(--color-muted-burgundy),#c28c98,#dfb1ba)]'
                                  : 'bg-[linear-gradient(90deg,var(--color-deep-plum),var(--color-muted-burgundy),#d7b7c3)]'
                              }`}
                              style={{
                                width: `${usagePercentage}%`,
                              }}
                            />
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-xl border border-white/48 bg-white/24 px-3 py-2.5">
                              <p className="text-[0.6rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/42">
                                Planned
                              </p>

                              <p className="mt-1 truncate text-sm font-black text-[var(--color-near-black)]">
                                {formatCurrency(category.plannedExpenses)}
                              </p>
                            </div>

                            <div className="rounded-xl border border-white/48 bg-white/24 px-3 py-2.5">
                              <p className="text-[0.6rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/42">
                                Paid
                              </p>

                              <p className="mt-1 truncate text-sm font-black text-[var(--color-near-black)]">
                                {formatCurrency(category.paidExpenses)}
                              </p>
                            </div>

                            <div className="rounded-xl border border-white/48 bg-white/24 px-3 py-2.5">
                              <p className="text-[0.6rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/42">
                                Balance
                              </p>

                              <p
                                className={`mt-1 truncate text-sm font-black ${
                                  category.isOverAllocated
                                    ? 'text-[var(--color-muted-burgundy)]'
                                    : 'text-[var(--color-near-black)]'
                                }`}
                              >
                                {category.isOverAllocated
                                  ? `-${formatCurrency(category.overAllocatedAmount)}`
                                  : formatCurrency(category.remainingAmount)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="relative mt-5 overflow-hidden rounded-[1.35rem] border border-dashed border-white/76 bg-[linear-gradient(180deg,rgba(255,255,255,0.48),rgba(255,255,255,0.22))] px-5 py-6 text-center shadow-[0_12px_30px_rgba(31,27,29,0.035)] backdrop-blur-xl">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-14 -top-14 size-36 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl"
                  />

                  <div className="relative">
                    <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                      <CircleDollarSign aria-hidden="true" className="size-5" />
                    </div>

                    <p className="mt-3 text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                      No budget categories yet
                    </p>

                    <p className="mx-auto mt-1.5 max-w-md text-xs font-semibold leading-5 text-[var(--color-charcoal)]/58">
                      Create allocations for venue, catering, photography, decoration and other
                      event costs.
                    </p>

                    <button
                      type="button"
                      className="group/first-budget-category btn-primary mt-4 justify-center px-3.5 py-2 text-xs font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(93,58,85,0.18)] disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={!isBudgetEditable}
                      onClick={openCategoryForm}
                    >
                      <Plus
                        aria-hidden="true"
                        className="size-3.5 transition duration-300 group-hover/first-budget-category:rotate-90"
                      />
                      Add first category
                    </button>
                  </div>
                </div>
              )}
            </article>

            <aside className="relative self-start overflow-hidden rounded-[1.65rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.78),rgba(244,238,246,0.82))] p-5 shadow-[0_20px_54px_rgba(31,27,29,0.07)] backdrop-blur-2xl lg:sticky lg:top-5">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl"
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                      Budget snapshot
                    </p>

                    <h2 className="mt-1.5 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                      Financial health at a glance.
                    </h2>
                  </div>

                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                    <PiggyBank className="size-4" />
                  </div>
                </div>

                <div className="mt-5 rounded-[1.3rem] border border-white/60 bg-white/34 p-4 backdrop-blur-xl">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[0.65rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                        Total allocated
                      </p>

                      <p className="mt-1.5 truncate text-2xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                        {formatCurrency(summary.summary.totalAllocated)}
                      </p>
                    </div>

                    <span
                      className="status-chip shrink-0 px-2.5 py-1 text-[0.68rem]"
                      data-tone={summary.summary.isOverBudget ? 'rose' : 'green'}
                    >
                      {summary.summary.isOverBudget ? 'Needs attention' : 'Healthy'}
                    </span>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(93,58,85,0.08)]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-deep-plum),var(--color-muted-burgundy))]"
                      style={{
                        width: `${budgetUsagePercentage}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/52">
                    {Math.round(budgetUsagePercentage)}% of the planned budget is currently
                    committed.
                  </p>
                </div>

                <div className="mt-3 divide-y divide-[rgba(93,58,85,0.10)] rounded-[1.3rem] border border-white/55 bg-white/24 px-4 backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(175,201,216,0.28)] text-[#334954]">
                        <WalletCards className="size-3.5" />
                      </span>

                      <div className="min-w-0">
                        <p className="text-xs font-black text-[var(--color-near-black)]">
                          Unallocated budget
                        </p>

                        <p className="mt-0.5 text-[0.68rem] font-semibold text-[var(--color-charcoal)]/46">
                          Still available to assign
                        </p>
                      </div>
                    </div>

                    <p className="shrink-0 text-right text-xs font-black text-[var(--color-near-black)]">
                      {formatCurrency(summary.summary.unallocatedBudget)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(233,221,207,0.68)] text-[var(--color-deep-plum)]">
                        <CreditCard className="size-3.5" />
                      </span>

                      <div className="min-w-0">
                        <p className="text-xs font-black text-[var(--color-near-black)]">
                          Outstanding committed
                        </p>

                        <p className="mt-0.5 text-[0.68rem] font-semibold text-[var(--color-charcoal)]/46">
                          Confirmed but not yet paid
                        </p>
                      </div>
                    </div>

                    <p className="shrink-0 text-right text-xs font-black text-[var(--color-near-black)]">
                      {formatCurrency(summary.summary.outstandingCommitted)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(142,151,115,0.22)] text-[#3d452f]">
                        <ReceiptText className="size-3.5" />
                      </span>

                      <div className="min-w-0">
                        <p className="text-xs font-black text-[var(--color-near-black)]">
                          Manual expenses
                        </p>

                        <p className="mt-0.5 text-[0.68rem] font-semibold text-[var(--color-charcoal)]/46">
                          Planned and paid records
                        </p>
                      </div>
                    </div>

                    <p className="shrink-0 text-right text-xs font-black text-[var(--color-near-black)]">
                      {summary.counts.plannedExpenses + summary.counts.paidExpenses}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </section>

          <section className="glass-card mt-4 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                  Expenses
                </p>

                <h2 className="mt-1.5 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                  Planned and paid event costs.
                </h2>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className="soft-chip w-fit px-3 py-1.5 text-xs">
                  {expenses.length} expenses
                </span>

                <button
                  type="button"
                  className="btn-primary px-3.5 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!isBudgetEditable}
                  onClick={openExpenseForm}
                >
                  <Plus className="size-3.5" />
                  Add expense
                </button>
              </div>
            </div>

            {expenses.length > 0 ? (
              <div className="mt-5 grid gap-3 xl:grid-cols-2">
                {expenses.map((expense) => (
                  <article
                    key={expense.id}
                    className="group/expense relative overflow-hidden rounded-[1.35rem] border border-white/60 bg-white/28 p-4 shadow-[0_14px_34px_rgba(31,27,29,0.045)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/82 hover:bg-white/40 hover:shadow-[0_22px_50px_rgba(31,27,29,0.08)]"
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-16 size-36 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl transition duration-500 group-hover/expense:scale-125 group-hover/expense:bg-[rgba(175,201,216,0.24)]"
                    />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(233,221,207,0.68)] text-[var(--color-deep-plum)] shadow-[0_8px_20px_rgba(31,27,29,0.05)] transition duration-300 group-hover/expense:-translate-y-0.5 group-hover/expense:scale-105">
                            <ReceiptText aria-hidden="true" className="size-4" />
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-base font-black tracking-[-0.025em] text-[var(--color-near-black)] transition duration-300 group-hover/expense:text-[var(--color-deep-plum)]">
                              {expense.title}
                            </p>

                            <p className="mt-0.5 truncate text-xs font-semibold text-[var(--color-charcoal)]/48">
                              {expense.budgetCategory?.name ?? 'Uncategorised'}
                            </p>
                          </div>
                        </div>

                        <span
                          className="status-chip shrink-0 px-2.5 py-1 text-[0.68rem]"
                          data-tone={
                            expense.status === 'PAID'
                              ? 'green'
                              : expense.status === 'CANCELLED'
                                ? 'rose'
                                : 'plum'
                          }
                        >
                          {expense.status.charAt(0) + expense.status.slice(1).toLowerCase()}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 border-b border-[rgba(93,58,85,0.10)] pb-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-[0.65rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                            Expense amount
                          </p>

                          <p className="mt-1 text-2xl font-black tracking-[-0.05em] text-[var(--color-near-black)] transition duration-300 group-hover/expense:text-[var(--color-deep-plum)]">
                            {formatCurrency(expense.amount)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="flex items-center gap-1.5 rounded-xl border border-[rgba(93,58,85,0.14)] bg-[rgba(93,58,85,0.06)] px-3 py-1.5 text-xs font-black text-[var(--color-deep-plum)] transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.28)] hover:bg-[rgba(93,58,85,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/30 disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label={`Edit ${expense.title}`}
                            disabled={!isBudgetEditable}
                            onClick={() => {
                              openEditExpenseForm(expense);
                            }}
                          >
                            <Pencil aria-hidden="true" className="size-3.5" />
                            Edit
                          </button>

                          <button
                            type="button"
                            className="grid size-8 place-items-center rounded-xl border border-[rgba(124,74,90,0.14)] bg-[rgba(124,74,90,0.06)] text-[var(--color-muted-burgundy)] transition duration-300 hover:-translate-y-0.5 hover:bg-[rgba(124,74,90,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-muted-burgundy)]/30 disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label={`Delete ${expense.title}`}
                            disabled={!isBudgetEditable}
                            onClick={() => {
                              openDeleteExpenseDialog(expense);
                            }}
                          >
                            <Trash2 aria-hidden="true" className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="flex min-w-0 items-start gap-2.5 rounded-xl border border-white/50 bg-white/24 p-3">
                          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                            <CircleDollarSign className="size-3.5" />
                          </span>

                          <div className="min-w-0">
                            <p className="text-[0.58rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/42">
                              Expense date
                            </p>

                            <p className="mt-1 text-xs font-black leading-5 text-[var(--color-near-black)]">
                              {formatDateTime(expense.expenseDate)}
                            </p>
                          </div>
                        </div>

                        <div className="flex min-w-0 items-start gap-2.5 rounded-xl border border-white/50 bg-white/24 p-3">
                          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[rgba(175,201,216,0.28)] text-[#334954]">
                            <CreditCard className="size-3.5" />
                          </span>

                          <div className="min-w-0">
                            <p className="text-[0.58rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/42">
                              Due date
                            </p>

                            <p className="mt-1 text-xs font-black leading-5 text-[var(--color-near-black)]">
                              {formatDateTime(expense.dueDate)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {expense.notes ? (
                        <div className="mt-2 rounded-xl border border-white/48 bg-white/20 px-3 py-2.5">
                          <p className="text-[0.58rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/38">
                            Notes
                          </p>

                          <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-[var(--color-charcoal)]/62">
                            {expense.notes}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="relative mt-5 overflow-hidden rounded-[1.35rem] border border-dashed border-white/76 bg-[linear-gradient(180deg,rgba(255,255,255,0.48),rgba(255,255,255,0.22))] px-5 py-6 text-center shadow-[0_12px_30px_rgba(31,27,29,0.035)] backdrop-blur-xl">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-14 -top-14 size-36 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-14 -left-12 size-32 rounded-full bg-[rgba(255,228,210,0.14)] blur-3xl"
                />

                <div className="relative">
                  <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-[rgba(233,221,207,0.72)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                    <ReceiptText aria-hidden="true" className="size-5" />
                  </div>

                  <p className="mt-3 text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                    No expenses recorded
                  </p>

                  <p className="mx-auto mt-1.5 max-w-md text-xs font-semibold leading-5 text-[var(--color-charcoal)]/58">
                    Add the first planned or paid cost to track commitments, deadlines and category
                    totals.
                  </p>

                  <button
                    type="button"
                    className="group/first-budget-expense btn-primary mt-4 justify-center px-3.5 py-2 text-xs font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(93,58,85,0.18)] disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!isBudgetEditable}
                    onClick={openExpenseForm}
                  >
                    <Plus
                      aria-hidden="true"
                      className="size-3.5 transition duration-300 group-hover/first-budget-expense:rotate-90"
                    />
                    Add first expense
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
      {isCategoryFormOpen && isBudgetEditable ? (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[rgba(31,27,29,0.62)] px-4 py-4 backdrop-blur-sm sm:py-5"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        closeCategoryForm();
      }
    }}
  >
    <div className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/72 bg-[linear-gradient(145deg,rgba(255,252,250,0.98),rgba(245,239,247,0.97))] shadow-[0_32px_90px_rgba(31,27,29,0.28)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[rgba(183,167,200,0.24)] blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-20 size-56 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
      />

      <div className="relative max-h-[calc(100vh-2.5rem)] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-5 border-b border-[rgba(93,58,85,0.10)] pb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-deep-plum)] px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.12em] text-white">
                <WalletCards aria-hidden="true" className="size-3" />
                Budget allocation
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(175,201,216,0.54)] px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#334954]">
                <CircleDollarSign aria-hidden="true" className="size-3" />
                LKR amount
              </span>

              <span className="soft-chip px-3 py-1.5 text-[0.65rem]">
                {categoryToEdit ? 'Editing category' : 'New category'}
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-[1.8rem]">
              {categoryToEdit
                ? 'Update this allocation.'
                : 'Create a new allocation.'}
            </h2>

            <p className="mt-1.5 max-w-2xl text-xs font-semibold leading-5 text-[var(--color-charcoal)]/62 sm:text-sm">
              {categoryToEdit
                ? 'Adjust the category name or planned spending limit while keeping its existing budget activity intact.'
                : 'Create a clear spending area for venue, catering, photography, decoration or another event cost.'}
            </p>
          </div>

          <button
            type="button"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-white/68 bg-white/50 text-[var(--color-charcoal)] shadow-[0_8px_20px_rgba(31,27,29,0.06)] transition duration-300 hover:-translate-y-0.5 hover:bg-white/82 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/30"
            aria-label="Close category form"
            onClick={closeCategoryForm}
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <form className="mt-4" onSubmit={submitCategory}>
          <div className="grid gap-3 md:grid-cols-2">
  {/* Category details */}
  <section className="rounded-[1.35rem] border border-white/68 bg-white/42 p-4 shadow-[0_12px_30px_rgba(31,27,29,0.045)] backdrop-blur-xl">
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
        <WalletCards aria-hidden="true" className="size-4" />
      </span>

      <div>
        <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
          Category details
        </p>

        <h3 className="mt-0.5 text-base font-black tracking-[-0.025em] text-[var(--color-near-black)]">
          Name this spending area
        </h3>
      </div>
    </div>

    <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/54">
      Use a short, recognisable label that stays easy to scan across the
      budget.
    </p>

    <label
      className="mt-3 block text-xs font-black text-[var(--color-charcoal)]"
      htmlFor="budget-category-name"
    >
      Category name{' '}
      <span className="text-[var(--color-rosewood)]">*</span>
    </label>

    <input
      id="budget-category-name"
      type="text"
      className="form-field mt-1.5"
      placeholder="Photography"
      disabled={isCategoryMutationPending}
      {...categoryForm.register('name')}
    />

    {categoryForm.formState.errors.name ? (
      <p className="mt-1.5 text-xs font-bold text-[var(--color-muted-burgundy)]">
        {categoryForm.formState.errors.name.message}
      </p>
    ) : (
      <p className="mt-1.5 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/44">
        Examples: venue, catering, photography, decoration or entertainment.
      </p>
    )}
  </section>

  {/* Allocation */}
  <section className="rounded-[1.35rem] border border-white/68 bg-[linear-gradient(145deg,rgba(255,255,255,0.48),rgba(238,246,250,0.42))] p-4 shadow-[0_12px_30px_rgba(31,27,29,0.045)] backdrop-blur-xl">
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.28)] text-[#334954]">
        <CircleDollarSign aria-hidden="true" className="size-4" />
      </span>

      <div>
        <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
          Allocation
        </p>

        <h3 className="mt-0.5 text-base font-black tracking-[-0.025em] text-[var(--color-near-black)]">
          Set the planned spending limit
        </h3>
      </div>
    </div>

    <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/54">
      This amount contributes to the total allocated budget shown throughout
      the workspace.
    </p>

    <label
      className="mt-3 block text-xs font-black text-[var(--color-charcoal)]"
      htmlFor="budget-category-amount"
    >
      Allocated amount{' '}
      <span className="text-[var(--color-rosewood)]">*</span>
    </label>

    <div className="mt-1.5 flex min-h-12 overflow-hidden rounded-2xl border border-white/60 bg-white/34 shadow-[0_8px_22px_rgba(31,27,29,0.04)] transition duration-300 focus-within:border-[rgba(93,58,85,0.24)] focus-within:bg-white/52 focus-within:shadow-[0_12px_28px_rgba(31,27,29,0.07)]">
      <span className="flex w-[4.5rem] shrink-0 items-center justify-center border-r border-[rgba(93,58,85,0.12)] bg-[rgba(175,201,216,0.18)] text-xs font-black uppercase tracking-[0.08em] text-[var(--color-deep-plum)]">
        LKR
      </span>

      <input
        id="budget-category-amount"
        className="min-w-0 flex-1 appearance-none bg-transparent px-4 py-3 text-sm font-bold tabular-nums text-[var(--color-near-black)] outline-none placeholder:font-semibold placeholder:text-[var(--color-charcoal)]/38 disabled:cursor-not-allowed disabled:opacity-60"
        type="number"
        min="0.01"
        step="0.01"
        placeholder="250000"
        disabled={isCategoryMutationPending}
        {...categoryForm.register('allocatedAmount')}
      />
    </div>

    {categoryForm.formState.errors.allocatedAmount ? (
      <p className="mt-1.5 text-xs font-bold text-[var(--color-muted-burgundy)]">
        {categoryForm.formState.errors.allocatedAmount.message}
      </p>
    ) : (
      <p className="mt-1.5 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/44">
        Enter the maximum amount you plan to reserve for this category.
      </p>
    )}
  </section>
</div>

          {categoryToEdit ? (
            <div className="mt-3 flex flex-col gap-2 rounded-[1.15rem] border border-[rgba(93,58,85,0.10)] bg-white/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                  <PiggyBank aria-hidden="true" className="size-3.5" />
                </span>

                <div>
                  <p className="text-xs font-black text-[var(--color-near-black)]">
                    Current category usage
                  </p>

                  <p className="mt-0.5 text-[0.68rem] font-semibold text-[var(--color-charcoal)]/50">
                    Existing expenses remain attached to this category.
                  </p>
                </div>
              </div>

              <p className="text-sm font-black text-[var(--color-deep-plum)]">
                {formatCurrency(categoryToEdit.totalExpenses)}
              </p>
            </div>
          ) : null}

          {categoryForm.formState.errors.root?.message ? (
            <div className="mt-3 flex items-start gap-2.5 rounded-[1rem] border border-[rgba(124,74,90,0.18)] bg-[rgba(249,235,240,0.62)] px-3.5 py-3 text-xs font-bold leading-5 text-[var(--color-muted-burgundy)]">
              <CircleAlert
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />

              <p>{categoryForm.formState.errors.root.message}</p>
            </div>
          ) : null}

          {createCategoryMutation.isError ||
          updateCategoryMutation.isError ? (
            <div className="mt-3 flex items-start gap-2.5 rounded-[1rem] border border-[rgba(124,74,90,0.18)] bg-[rgba(249,235,240,0.62)] px-3.5 py-3 text-xs font-bold leading-5 text-[var(--color-muted-burgundy)]">
              <CircleAlert
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />

              <p>
                {getApiErrorMessage(
                  updateCategoryMutation.error ??
                    createCategoryMutation.error,
                )}
              </p>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-3 border-t border-[rgba(93,58,85,0.10)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(183,167,200,0.16)] text-[var(--color-deep-plum)]">
                <PiggyBank aria-hidden="true" className="size-3.5" />
              </span>

              <p className="max-w-sm text-[0.7rem] font-semibold leading-4 text-[var(--color-charcoal)]/52">
                {categoryToEdit
                  ? 'Saved changes will update the category breakdown and budget snapshot immediately.'
                  : 'The new allocation will immediately appear in the category breakdown and budget snapshot.'}
              </p>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2">
              <button
                type="button"
                className="btn-secondary justify-center px-4 py-2 text-xs font-bold"
                disabled={isCategoryMutationPending}
                onClick={closeCategoryForm}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary min-w-[8.5rem] justify-center px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isCategoryMutationPending}
              >
                {isCategoryMutationPending ? (
                  <>
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-3.5 animate-spin"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save aria-hidden="true" className="size-3.5" />
                    {categoryToEdit
                      ? 'Save changes'
                      : 'Create category'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
) : null}

      {isExpenseFormOpen && isBudgetEditable ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.62)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-expense-title"
          onClick={() => {
            if (!isExpenseMutationPending) {
              closeExpenseForm();
            }
          }}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-3xl overflow-hidden rounded-[2.25rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(240,231,246,0.86))] shadow-[0_42px_120px_rgba(31,27,29,0.28)] backdrop-blur-3xl"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[rgba(183,167,200,0.24)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[14%] top-[-8rem] size-64 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(255,228,210,0.14)] blur-3xl"
              />

              <div className="relative max-h-[calc(100vh-3rem)] overflow-y-auto p-6 sm:p-8">
                <div className="flex flex-col gap-6 border-b border-[rgba(93,58,85,0.10)] pb-7 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(233,221,207,0.72)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.06)]">
                        {expenseToEdit ? (
                          <Pencil aria-hidden="true" className="size-6" />
                        ) : (
                          <ReceiptText aria-hidden="true" className="size-6" />
                        )}
                      </span>

                      <span className="rounded-full border border-[rgba(93,58,85,0.16)] bg-[rgba(93,58,85,0.08)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)]">
                        {expenseToEdit ? 'Edit event expense' : 'New event expense'}
                      </span>
                    </div>

                    <h2
                      id="create-expense-title"
                      className="mt-6 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
                    >
                      {expenseToEdit ? 'Refine this event cost.' : 'Record a new event cost.'}
                    </h2>

                    <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                      {expenseToEdit
                        ? 'Update the amount, category, payment status, dates or planning notes while keeping the expense history intact.'
                        : 'Add a planned, paid or cancelled cost and optionally connect it to one of your budget categories.'}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="status-chip" data-tone="plum">
                        <ReceiptText aria-hidden="true" className="size-3.5" />
                        Expense record
                      </span>

                      <span className="status-chip" data-tone="blue">
                        <CircleDollarSign aria-hidden="true" className="size-3.5" />
                        LKR amount
                      </span>

                      <span className="status-chip" data-tone="gray">
                        <WalletCards aria-hidden="true" className="size-3.5" />
                        Optional category
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close expense form"
                    disabled={isExpenseMutationPending}
                    onClick={closeExpenseForm}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                <form className="mt-7 grid gap-5" onSubmit={submitExpense}>
                  <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-white/32 p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                          <ReceiptText aria-hidden="true" className="size-5" />
                        </span>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                            Basic information
                          </p>

                          <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                            Name and value this expense
                          </h3>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                            Use a clear title and enter the full expected or paid amount.
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Expense title
                            <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                          </span>

                          <input
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            type="text"
                            placeholder="Photography deposit"
                            disabled={isExpenseMutationPending}
                            {...expenseForm.register('title')}
                          />

                          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                            Keep the title short and easy to recognise in the expense list.
                          </p>

                          {expenseForm.formState.errors.title ? (
                            <div className="mt-3 flex items-start gap-2 rounded-[1.1rem] border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] px-3 py-2.5">
                              <CircleAlert
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 text-[var(--color-muted-burgundy)]"
                              />

                              <p className="text-sm font-bold leading-5 text-[var(--color-muted-burgundy)]">
                                {expenseForm.formState.errors.title.message}
                              </p>
                            </div>
                          ) : null}
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Amount
                            <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                          </span>

                          <div className="mt-2 flex min-h-12 overflow-hidden rounded-2xl border border-white/60 bg-white/34 shadow-[0_8px_22px_rgba(31,27,29,0.04)] transition duration-300 focus-within:border-[rgba(93,58,85,0.24)] focus-within:bg-white/52 focus-within:shadow-[0_12px_28px_rgba(31,27,29,0.07)]">
                            <span className="flex w-[4.75rem] shrink-0 items-center justify-center border-r border-[rgba(93,58,85,0.12)] bg-[rgba(183,167,200,0.20)] text-xs font-black uppercase tracking-[0.08em] text-[var(--color-deep-plum)]">
                              LKR
                            </span>

                            <input
                              className="min-w-0 flex-1 appearance-none bg-transparent px-4 py-3 text-base font-bold tabular-nums text-[var(--color-near-black)] outline-none placeholder:font-semibold placeholder:text-[var(--color-charcoal)]/38 disabled:cursor-not-allowed disabled:opacity-60"
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="75000"
                              disabled={isExpenseMutationPending}
                              {...expenseForm.register('amount')}
                            />
                          </div>

                          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                            Enter the complete planned or paid value for this expense.
                          </p>

                          {expenseForm.formState.errors.amount ? (
                            <div className="mt-3 flex items-start gap-2 rounded-[1.1rem] border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] px-3 py-2.5">
                              <CircleAlert
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 text-[var(--color-muted-burgundy)]"
                              />

                              <p className="text-sm font-bold leading-5 text-[var(--color-muted-burgundy)]">
                                {expenseForm.formState.errors.amount.message}
                              </p>
                            </div>
                          ) : null}
                        </label>
                      </div>
                    </div>
                  </section>

                  <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.66),rgba(240,231,246,0.38))] p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                          <WalletCards aria-hidden="true" className="size-5" />
                        </span>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                            Classification
                          </p>

                          <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                            Organise the expense
                          </h3>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                            Assign a category and choose the expense’s current payment status.
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Budget category
                          </span>

                          <select
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            disabled={isExpenseMutationPending}
                            {...expenseForm.register('budgetCategoryId')}
                          >
                            <option value="">Uncategorised</option>

                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>

                          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                            Leave empty when the cost does not belong to a specific allocation.
                          </p>
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Status
                            <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                          </span>

                          <select
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            disabled={isExpenseMutationPending}
                            {...expenseForm.register('status')}
                          >
                            {expenseStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status.charAt(0) + status.slice(1).toLowerCase()}
                              </option>
                            ))}
                          </select>

                          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                            Planned costs count toward commitments; paid costs count toward
                            completed spending.
                          </p>
                        </label>
                      </div>
                    </div>
                  </section>

                  <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.66),rgba(220,235,242,0.38))] p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#334954]">
                          <CreditCard aria-hidden="true" className="size-5" />
                        </span>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                            Schedule
                          </p>

                          <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                            Record payment timing
                          </h3>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                            Add the expense date, due date or both when the timing is known.
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Expense date
                          </span>

                          <input
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            type="datetime-local"
                            disabled={isExpenseMutationPending}
                            {...expenseForm.register('expenseDate')}
                          />

                          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                            The date the cost was recorded, confirmed or paid.
                          </p>

                          {expenseForm.formState.errors.expenseDate ? (
                            <div className="mt-3 flex items-start gap-2 rounded-[1.1rem] border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] px-3 py-2.5">
                              <CircleAlert
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 text-[var(--color-muted-burgundy)]"
                              />

                              <p className="text-sm font-bold leading-5 text-[var(--color-muted-burgundy)]">
                                {expenseForm.formState.errors.expenseDate.message}
                              </p>
                            </div>
                          ) : null}
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Due date
                          </span>

                          <input
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            type="datetime-local"
                            disabled={isExpenseMutationPending}
                            {...expenseForm.register('dueDate')}
                          />

                          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                            The deadline by which this payment should be completed.
                          </p>
                        </label>
                      </div>
                    </div>
                  </section>

                  <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.66),rgba(248,235,223,0.38))] p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(255,228,210,0.18)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(233,221,207,0.72)] text-[var(--color-deep-plum)]">
                          <Pencil aria-hidden="true" className="size-5" />
                        </span>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                            Additional notes
                          </p>

                          <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                            Preserve useful context
                          </h3>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                            Add optional references, payment details or planning notes.
                          </p>
                        </div>
                      </div>

                      <label className="mt-6 block">
                        <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                          Notes
                        </span>

                        <textarea
                          className="form-field mt-2 min-h-32 resize-y transition duration-300 focus:bg-white/52"
                          placeholder="Optional payment details or planning notes"
                          disabled={isExpenseMutationPending}
                          {...expenseForm.register('notes')}
                        />

                        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                          Use this for reference numbers, instalment details or follow-up
                          information.
                        </p>

                        {expenseForm.formState.errors.notes ? (
                          <div className="mt-3 flex items-start gap-2 rounded-[1.1rem] border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] px-3 py-2.5">
                            <CircleAlert
                              aria-hidden="true"
                              className="mt-0.5 size-4 shrink-0 text-[var(--color-muted-burgundy)]"
                            />

                            <p className="text-sm font-bold leading-5 text-[var(--color-muted-burgundy)]">
                              {expenseForm.formState.errors.notes.message}
                            </p>
                          </div>
                        ) : null}
                      </label>
                    </div>
                  </section>

                  {expenseForm.formState.errors.root?.message ? (
                    <div
                      role="alert"
                      className="rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                          <CircleAlert aria-hidden="true" className="size-4" />
                        </span>

                        <div>
                          <p className="text-sm font-black text-[var(--color-muted-burgundy)]">
                            No expense changes detected
                          </p>

                          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                            {expenseForm.formState.errors.root.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {createExpenseMutation.isError || updateExpenseMutation.isError ? (
                    <div
                      role="alert"
                      className="rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                          <CircleAlert aria-hidden="true" className="size-4" />
                        </span>

                        <div>
                          <p className="text-sm font-black text-[var(--color-muted-burgundy)]">
                            Expense could not be saved
                          </p>

                          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                            {getApiErrorMessage(
                              expenseToEdit
                                ? updateExpenseMutation.error
                                : createExpenseMutation.error,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <PiggyBank aria-hidden="true" className="size-4" />
                      </span>

                      <p className="max-w-sm text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                        {expenseToEdit
                          ? 'Saving immediately updates the related category totals and overall budget summary.'
                          : 'The new expense will immediately contribute to your event budget calculations.'}
                      </p>
                    </div>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                      <button
                        type="button"
                        className="btn-secondary justify-center text-sm font-bold"
                        disabled={isExpenseMutationPending}
                        onClick={closeExpenseForm}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="group/save-event-expense btn-primary min-w-40 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                        disabled={isExpenseMutationPending}
                      >
                        {isExpenseMutationPending ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Save
                            aria-hidden="true"
                            className="size-4 transition duration-300 group-hover/save-event-expense:scale-105"
                          />
                        )}

                        {updateExpenseMutation.isPending
                          ? 'Saving expense...'
                          : createExpenseMutation.isPending
                            ? 'Creating expense...'
                            : expenseToEdit
                              ? 'Save changes'
                              : 'Create expense'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {expenseToDelete && isBudgetEditable ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.64)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-expense-title"
          onClick={() => {
            if (!deleteExpenseMutation.isPending) {
              closeDeleteExpenseDialog();
            }
          }}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-xl overflow-hidden rounded-[2.2rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(249,235,240,0.87))] p-6 shadow-[0_42px_120px_rgba(31,27,29,0.28)] backdrop-blur-3xl sm:p-8"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[rgba(210,146,160,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-5 border-b border-[rgba(93,58,85,0.10)] pb-7">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)] shadow-[0_14px_30px_rgba(124,74,90,0.08)]">
                        <Trash2 aria-hidden="true" className="size-7" />
                      </span>

                      <span className="rounded-full border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.09)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted-burgundy)]">
                        Permanent action
                      </span>
                    </div>

                    <h2
                      id="delete-expense-title"
                      className="mt-6 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
                    >
                      Remove this expense?
                    </h2>

                    <p className="mt-4 max-w-lg text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                      This permanently removes the expense and recalculates the related category and
                      budget totals.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close delete expense dialog"
                    disabled={deleteExpenseMutation.isPending}
                    onClick={closeDeleteExpenseDialog}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                <section className="relative mt-7 overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.68),rgba(248,235,223,0.40))] p-5 shadow-[0_16px_42px_rgba(31,27,29,0.05)] backdrop-blur-xl sm:p-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(255,228,210,0.18)] blur-3xl"
                  />

                  <div className="relative">
                    <div className="flex items-start gap-4">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(233,221,207,0.72)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                        <ReceiptText aria-hidden="true" className="size-5" />
                      </span>

                      <div className="min-w-0">
                        <p className="truncate text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                          {expenseToDelete.title}
                        </p>

                        <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/56">
                          {expenseToDelete.budgetCategory?.name ?? 'Uncategorised expense'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.3rem] border border-white/60 bg-white/34 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                          Expense amount
                        </p>

                        <p className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                          {formatCurrency(expenseToDelete.amount)}
                        </p>
                      </div>

                      <div className="rounded-[1.3rem] border border-white/60 bg-white/34 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                          Status
                        </p>

                        <div className="mt-3">
                          <span
                            className="status-chip"
                            data-tone={
                              expenseToDelete.status === 'PAID'
                                ? 'green'
                                : expenseToDelete.status === 'CANCELLED'
                                  ? 'rose'
                                  : 'plum'
                            }
                          >
                            {expenseToDelete.status.charAt(0) +
                              expenseToDelete.status.slice(1).toLowerCase()}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-[1.3rem] border border-white/60 bg-white/34 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                          Expense date
                        </p>

                        <p className="mt-2 text-sm font-black leading-6 text-[var(--color-near-black)]">
                          {formatDateTime(expenseToDelete.expenseDate)}
                        </p>
                      </div>

                      <div className="rounded-[1.3rem] border border-white/60 bg-white/34 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                          Due date
                        </p>

                        <p className="mt-2 text-sm font-black leading-6 text-[var(--color-near-black)]">
                          {formatDateTime(expenseToDelete.dueDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="relative mt-5 overflow-hidden rounded-[1.5rem] border border-[rgba(124,74,90,0.20)] bg-[linear-gradient(145deg,rgba(249,235,240,0.78),rgba(255,255,255,0.40))] p-5">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(210,146,160,0.18)] blur-3xl"
                  />

                  <div className="relative flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                      <CircleAlert aria-hidden="true" className="size-5" />
                    </span>

                    <div>
                      <p className="text-sm font-black text-[var(--color-near-black)]">
                        Budget totals will update immediately
                      </p>

                      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/60">
                        The expense amount will be removed from committed, paid and category
                        calculations where applicable.
                      </p>
                    </div>
                  </div>
                </section>

                {deleteExpenseMutation.isError ? (
                  <div
                    role="alert"
                    className="mt-5 rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                        <CircleAlert aria-hidden="true" className="size-4" />
                      </span>

                      <div>
                        <p className="text-sm font-black text-[var(--color-muted-burgundy)]">
                          Expense could not be deleted
                        </p>

                        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                          {getApiErrorMessage(deleteExpenseMutation.error)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-7 flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.10)] text-[var(--color-muted-burgundy)]">
                      <Trash2 aria-hidden="true" className="size-4" />
                    </span>

                    <p className="max-w-sm text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                      This action cannot be undone after the expense has been removed.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={deleteExpenseMutation.isPending}
                      onClick={closeDeleteExpenseDialog}
                    >
                      Keep expense
                    </button>

                    <button
                      type="button"
                      className="group/delete-expense-confirm flex min-w-40 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--color-muted-burgundy),var(--color-rosewood))] px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(124,74,90,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(124,74,90,0.30)] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={deleteExpenseMutation.isPending}
                      onClick={() => {
                        deleteExpenseMutation.mutate(expenseToDelete.id);
                      }}
                    >
                      {deleteExpenseMutation.isPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Trash2
                          aria-hidden="true"
                          className="size-4 transition duration-300 group-hover/delete-expense-confirm:scale-105"
                        />
                      )}

                      {deleteExpenseMutation.isPending ? 'Deleting expense...' : 'Delete expense'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {categoryToDelete && isBudgetEditable ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.64)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-budget-category-title"
          onClick={() => {
            if (!deleteCategoryMutation.isPending) {
              closeDeleteCategoryDialog();
            }
          }}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-xl overflow-hidden rounded-[2.2rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(249,235,240,0.87))] p-6 shadow-[0_42px_120px_rgba(31,27,29,0.28)] backdrop-blur-3xl sm:p-8"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[rgba(210,146,160,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-5 border-b border-[rgba(93,58,85,0.10)] pb-7">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)] shadow-[0_14px_30px_rgba(124,74,90,0.08)]">
                        <Trash2 aria-hidden="true" className="size-7" />
                      </span>

                      <span className="rounded-full border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.09)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted-burgundy)]">
                        Permanent action
                      </span>
                    </div>

                    <h2
                      id="delete-budget-category-title"
                      className="mt-6 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
                    >
                      Remove this allocation?
                    </h2>

                    <p className="mt-4 max-w-lg text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                      This permanently removes the category allocation and recalculates the budget
                      breakdown.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close delete category dialog"
                    disabled={deleteCategoryMutation.isPending}
                    onClick={closeDeleteCategoryDialog}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                <section className="relative mt-7 overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.68),rgba(240,231,246,0.40))] p-5 shadow-[0_16px_42px_rgba(31,27,29,0.05)] backdrop-blur-xl sm:p-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
                  />

                  <div className="relative">
                    <div className="flex items-start gap-4">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                        <WalletCards aria-hidden="true" className="size-5" />
                      </span>

                      <div className="min-w-0">
                        <p className="truncate text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                          {categoryToDelete.name}
                        </p>

                        <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/56">
                          Budget category allocation
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.3rem] border border-white/60 bg-white/34 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                          Allocated
                        </p>

                        <p className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                          {formatCurrency(categoryToDelete.allocatedAmount)}
                        </p>
                      </div>

                      <div className="rounded-[1.3rem] border border-white/60 bg-white/34 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                          Used
                        </p>

                        <p className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                          {formatCurrency(categoryToDelete.totalExpenses)}
                        </p>
                      </div>

                      <div className="rounded-[1.3rem] border border-white/60 bg-white/34 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                          Planned expenses
                        </p>

                        <p className="mt-2 text-base font-black text-[var(--color-near-black)]">
                          {formatCurrency(categoryToDelete.plannedExpenses)}
                        </p>
                      </div>

                      <div className="rounded-[1.3rem] border border-white/60 bg-white/34 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                          Paid expenses
                        </p>

                        <p className="mt-2 text-base font-black text-[var(--color-near-black)]">
                          {formatCurrency(categoryToDelete.paidExpenses)}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="relative mt-5 overflow-hidden rounded-[1.5rem] border border-[rgba(124,74,90,0.20)] bg-[linear-gradient(145deg,rgba(249,235,240,0.78),rgba(255,255,255,0.40))] p-5">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(210,146,160,0.18)] blur-3xl"
                  />

                  <div className="relative flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                      <CircleAlert aria-hidden="true" className="size-5" />
                    </span>

                    <div>
                      <p className="text-sm font-black text-[var(--color-near-black)]">
                        Associated expenses may remain
                      </p>

                      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/60">
                        Expenses assigned to this category may stay in the workspace as
                        uncategorised expenses after the allocation is removed.
                      </p>
                    </div>
                  </div>
                </section>

                {deleteCategoryMutation.isError ? (
                  <div
                    role="alert"
                    className="mt-5 rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                        <CircleAlert aria-hidden="true" className="size-4" />
                      </span>

                      <div>
                        <p className="text-sm font-black text-[var(--color-muted-burgundy)]">
                          Budget category could not be deleted
                        </p>

                        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                          {getApiErrorMessage(deleteCategoryMutation.error)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-7 flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.10)] text-[var(--color-muted-burgundy)]">
                      <Trash2 aria-hidden="true" className="size-4" />
                    </span>

                    <p className="max-w-sm text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                      This allocation cannot be restored after it has been deleted.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={deleteCategoryMutation.isPending}
                      onClick={closeDeleteCategoryDialog}
                    >
                      Keep category
                    </button>

                    <button
                      type="button"
                      className="group/delete-category-confirm flex min-w-40 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--color-muted-burgundy),var(--color-rosewood))] px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(124,74,90,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(124,74,90,0.30)] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={deleteCategoryMutation.isPending}
                      onClick={() => {
                        deleteCategoryMutation.mutate(categoryToDelete.id);
                      }}
                    >
                      {deleteCategoryMutation.isPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Trash2
                          aria-hidden="true"
                          className="size-4 transition duration-300 group-hover/delete-category-confirm:scale-105"
                        />
                      )}

                      {deleteCategoryMutation.isPending
                        ? 'Deleting category...'
                        : 'Delete category'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
