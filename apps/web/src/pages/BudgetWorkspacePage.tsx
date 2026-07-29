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
    createExpenseMutation.reset();
    updateExpenseMutation.reset();
    expenseForm.clearErrors();

    expenseForm.reset({
      budgetCategoryId: '',
      title: '',
      amount: '',
      status: 'PLANNED',
      expenseDate: '',
      dueDate: '',
      notes: '',
    });

    setExpenseToEdit(null);
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
    createCategoryMutation.reset();
    updateCategoryMutation.reset();
    categoryForm.clearErrors();
    categoryForm.reset({
      name: '',
      allocatedAmount: '',
    });
    setCategoryToEdit(null);
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

  const summaryCards = [
    {
      label: 'Planned budget',
      value: formatCurrency(summary.summary.plannedBudget),
      helper: 'Total event estimate',
      icon: WalletCards,
      tone: 'bg-[rgba(183,167,200,0.26)] text-[var(--color-deep-plum)]',
    },
    {
      label: 'Committed',
      value: formatCurrency(summary.summary.totalCommitted),
      helper: 'Bookings and active expenses',
      icon: CreditCard,
      tone: 'bg-[rgba(175,201,216,0.34)] text-[#334954]',
    },
    {
      label: 'Paid',
      value: formatCurrency(summary.summary.totalPaid),
      helper: 'Verified and paid costs',
      icon: ReceiptText,
      tone: 'bg-[rgba(142,151,115,0.24)] text-[#3d452f]',
    },
    {
      label: summary.summary.isOverBudget ? 'Over budget' : 'Remaining',
      value: summary.summary.isOverBudget
        ? formatCurrency(summary.summary.overBudgetAmount)
        : formatCurrency(summary.summary.remainingBudget),
      helper: summary.summary.isOverBudget
        ? 'Amount above planned budget'
        : 'Available event budget',
      icon: PiggyBank,
      tone: summary.summary.isOverBudget
        ? 'bg-[rgba(142,92,103,0.18)] text-[var(--color-rosewood)]'
        : 'bg-[rgba(233,221,207,0.68)] text-[var(--color-deep-plum)]',
    },
  ];

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={`/events/${eventId}`}
              className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(31,27,29,0.10)] backdrop-blur-xl"
              aria-label="Back to event workspace"
            >
              <ArrowLeft className="size-5" />
            </Link>

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
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-[4%] top-10 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.25)] blur-3xl" />
            <div className="pointer-events-none absolute right-[7%] top-8 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.22)] blur-3xl" />

            <div className="relative grid gap-7 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
              <div className="flex flex-col justify-center">
                <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                  <Sparkles className="size-4" />
                  Financial planning
                </div>

                <h2 className="max-w-4xl text-balance text-4xl font-black leading-[1.02] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-5xl sm:leading-[0.98] lg:text-6xl">
                  Keep every event cost clear and under control.
                </h2>

                <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-[var(--color-charcoal)]/70 sm:mt-6 sm:text-lg sm:leading-8">
                  Track allocations, expenses, paid costs and vendor commitments from one organised
                  financial workspace.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <div className="soft-chip">
                    <CircleDollarSign className="size-4 text-[var(--color-deep-plum)]" />
                    {summary.counts.budgetCategories} categories
                  </div>

                  <div className="soft-chip">
                    <ReceiptText className="size-4 text-[var(--color-deep-plum)]" />
                    {summary.counts.plannedExpenses + summary.counts.paidExpenses} expenses
                  </div>

                  <div className="soft-chip">
                    <CreditCard className="size-4 text-[var(--color-deep-plum)]" />
                    {formatCurrency(summary.summary.totalCommitted)} committed
                  </div>
                </div>
              </div>

              <aside className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_28px_80px_rgba(93,58,85,0.30)] sm:p-7">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-white/10 blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-white/50">
                        Budget health
                      </p>

                      <p className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-5xl">
                        {Math.round(budgetUsagePercentage)}%
                      </p>

                      <p className="mt-2 text-sm font-semibold text-white/58">
                        of the planned budget committed
                      </p>
                    </div>

                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/14 bg-white/10 text-[var(--color-powder-blue)] backdrop-blur">
                      <PiggyBank className="size-5" />
                    </span>
                  </div>

                  <div className="mt-7 h-2.5 overflow-hidden rounded-full bg-white/12">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-powder-blue),#fff4ea)] transition-[width] duration-700"
                      style={{
                        width: `${budgetUsagePercentage}%`,
                      }}
                    />
                  </div>

                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.35rem] border border-white/12 bg-white/[0.08] p-4 backdrop-blur-xl">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/46">
                        Planned
                      </p>

                      <p className="mt-2 text-lg font-black">
                        {formatCurrency(summary.summary.plannedBudget)}
                      </p>
                    </div>

                    <div className="rounded-[1.35rem] border border-white/12 bg-white/[0.08] p-4 backdrop-blur-xl">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/46">
                        Committed
                      </p>

                      <p className="mt-2 text-lg font-black">
                        {formatCurrency(summary.summary.totalCommitted)}
                      </p>
                    </div>

                    <div className="rounded-[1.35rem] border border-white/12 bg-white/[0.08] p-4 backdrop-blur-xl">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/46">
                        Paid
                      </p>

                      <p className="mt-2 text-lg font-black">
                        {formatCurrency(summary.summary.totalPaid)}
                      </p>
                    </div>

                    <div className="rounded-[1.35rem] border border-white/12 bg-white/[0.08] p-4 backdrop-blur-xl">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/46">
                        {summary.summary.isOverBudget ? 'Over budget' : 'Remaining'}
                      </p>

                      <p className="mt-2 text-lg font-black">
                        {summary.summary.isOverBudget
                          ? formatCurrency(summary.summary.overBudgetAmount)
                          : formatCurrency(summary.summary.remainingBudget)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/12 pt-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/42">
                        Financial position
                      </p>

                      <p className="mt-1 text-sm font-black text-white/82">
                        {summary.summary.isOverBudget
                          ? 'Budget needs attention'
                          : 'Budget remains within plan'}
                      </p>
                    </div>

                    <span
                      className={
                        summary.summary.isOverBudget
                          ? 'status-chip shrink-0 border-white/14 bg-white/10 text-white'
                          : 'status-chip shrink-0 border-white/14 bg-[rgba(142,151,115,0.22)] text-[#e7efd5]'
                      }
                    >
                      {summary.summary.isOverBudget ? 'Over plan' : 'On track'}
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="mt-10 grid gap-5 lg:grid-cols-[1.2fr_repeat(3,1fr)]">
            {summaryCards.map(({ label, value, helper, icon: Icon, tone }) => (
              <article
                key={label}
                className={`luxe-card relative overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(31,27,29,0.10)]
    ${
      label === 'Planned budget'
        ? 'lg:row-span-2 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(247,241,249,0.94))]'
        : ''
    }`}
              >
                <div className={`grid size-12 place-items-center rounded-2xl ${tone}`}>
                  <Icon className="size-5" />
                </div>

                <p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/48">
                  {label}
                </p>

                <p
                  className={`mt-3 font-black tracking-[-0.055em] text-[var(--color-near-black)]
    ${label === 'Planned budget' ? 'text-4xl sm:text-[2.8rem]' : 'text-3xl'}`}
                >
                  {value}
                </p>

                <p className="mt-3 text-sm leading-6 font-semibold text-[var(--color-charcoal)]/58">
                  {helper}
                </p>

                {label === 'Planned budget' ? (
                  <div className="mt-7">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/45">
                      <span>Budget usage</span>
                      <span>{Math.round(budgetUsagePercentage)}%</span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(93,58,85,0.08)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))]"
                        style={{
                          width: `${budgetUsagePercentage}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="glass-card p-6 sm:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                    Category breakdown
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    Allocations and spending by category.
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="soft-chip w-fit">
                    {summary.counts.budgetCategories} categories
                  </span>

                  <button
                    type="button"
                    className="btn-primary text-sm font-bold"
                    onClick={openCategoryForm}
                  >
                    <Plus className="size-4" />
                    Add category
                  </button>
                </div>
              </div>

              {summary.categoryBreakdown.length > 0 ? (
                <div className="mt-8 space-y-4">
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
                        className="group relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-white/28 p-5 shadow-[0_18px_45px_rgba(31,27,29,0.05)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/36 hover:shadow-[0_24px_55px_rgba(31,27,29,0.08)] sm:p-6"
                      >
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute -right-12 -top-14 size-36 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl transition-opacity duration-300 group-hover:opacity-80"
                        />

                        <div className="relative">
                          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                                  <WalletCards className="size-5" />
                                </div>

                                <div>
                                  <p className="text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)] sm:text-xl">
                                    {category.name}
                                  </p>

                                  <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/52">
                                    Category allocation
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                              <span
                                className="status-chip w-fit"
                                data-tone={category.isOverAllocated ? 'rose' : 'green'}
                              >
                                {category.isOverAllocated
                                  ? `Over by ${formatCurrency(category.overAllocatedAmount)}`
                                  : `${formatCurrency(category.remainingAmount)} left`}
                              </span>

                              <button
                                type="button"
                                className="grid size-9 place-items-center rounded-full border border-[rgba(93,58,85,0.16)] bg-[rgba(93,58,85,0.07)] text-[var(--color-deep-plum)] transition hover:border-[rgba(93,58,85,0.28)] hover:bg-[rgba(93,58,85,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/30"
                                aria-label={`Edit ${category.name}`}
                                onClick={() => {
                                  openEditCategoryForm(category);
                                }}
                              >
                                <Pencil className="size-4" />
                              </button>

                              <button
                                type="button"
                                className="grid size-9 place-items-center rounded-full border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.07)] text-[var(--color-muted-burgundy)] transition hover:border-[rgba(124,74,90,0.28)] hover:bg-[rgba(124,74,90,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-muted-burgundy)]/30"
                                aria-label={`Delete ${category.name}`}
                                onClick={() => {
                                  openDeleteCategoryDialog(category);
                                }}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.17em] text-[var(--color-charcoal)]/42">
                                Amount used
                              </p>

                              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <p className="text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-3xl">
                                  {formatCurrency(category.totalExpenses)}
                                </p>

                                <p className="text-sm font-bold text-[var(--color-charcoal)]/46">
                                  of {formatCurrency(category.allocatedAmount)}
                                </p>
                              </div>
                            </div>

                            <p
                              className={`text-sm font-black ${
                                category.isOverAllocated
                                  ? 'text-[var(--color-muted-burgundy)]'
                                  : 'text-[var(--color-deep-plum)]'
                              }`}
                            >
                              {Math.round(usagePercentage)}% used
                            </p>
                          </div>

                          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[rgba(93,58,85,0.08)]">
                            <div
                              className={`h-full rounded-full transition-[width] duration-700 ${
                                category.isOverAllocated
                                  ? 'bg-[linear-gradient(90deg,var(--color-muted-burgundy),#c28c98)]'
                                  : 'bg-[linear-gradient(90deg,var(--color-deep-plum),var(--color-muted-burgundy))]'
                              }`}
                              style={{
                                width: `${usagePercentage}%`,
                              }}
                            />
                          </div>

                          <div className="mt-6 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/48 bg-white/24 p-4">
                              <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                                Planned
                              </p>

                              <p className="mt-2 text-base font-black text-[var(--color-near-black)]">
                                {formatCurrency(category.plannedExpenses)}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-white/48 bg-white/24 p-4">
                              <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                                Paid
                              </p>

                              <p className="mt-2 text-base font-black text-[var(--color-near-black)]">
                                {formatCurrency(category.paidExpenses)}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-white/48 bg-white/24 p-4">
                              <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                                Balance
                              </p>

                              <p
                                className={`mt-2 text-base font-black ${
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
                <div className="mt-8 rounded-[1.5rem] border border-dashed border-white/70 bg-white/20 p-8 text-center">
                  <CircleDollarSign className="mx-auto size-9 text-[var(--color-deep-plum)]" />

                  <p className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                    No budget categories yet
                  </p>

                  <p className="mt-2 leading-7 text-[var(--color-charcoal)]/62">
                    Categories will help separate venue, catering, photography, decoration and other
                    event costs.
                  </p>
                </div>
              )}
            </article>

            <aside className="relative self-start overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.78),rgba(244,238,246,0.82))] p-6 shadow-[0_24px_70px_rgba(31,27,29,0.08)] backdrop-blur-2xl sm:p-7 lg:sticky lg:top-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[rgba(183,167,200,0.24)] blur-3xl"
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                      Budget snapshot
                    </p>

                    <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                      Financial health at a glance.
                    </h2>
                  </div>

                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                    <PiggyBank className="size-5" />
                  </div>
                </div>

                <div className="mt-8 rounded-[1.6rem] border border-white/60 bg-white/34 p-5 backdrop-blur-xl">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.17em] text-[var(--color-charcoal)]/42">
                        Total allocated
                      </p>

                      <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                        {formatCurrency(summary.summary.totalAllocated)}
                      </p>
                    </div>

                    <span
                      className="status-chip shrink-0"
                      data-tone={summary.summary.isOverBudget ? 'rose' : 'green'}
                    >
                      {summary.summary.isOverBudget ? 'Needs attention' : 'Healthy'}
                    </span>
                  </div>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-[rgba(93,58,85,0.08)]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-deep-plum),var(--color-muted-burgundy))]"
                      style={{
                        width: `${budgetUsagePercentage}%`,
                      }}
                    />
                  </div>

                  <p className="mt-3 text-sm font-semibold text-[var(--color-charcoal)]/55">
                    {Math.round(budgetUsagePercentage)}% of the planned budget is currently
                    committed.
                  </p>
                </div>

                <div className="mt-5 divide-y divide-[rgba(93,58,85,0.10)] rounded-[1.6rem] border border-white/55 bg-white/24 px-5 backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-4 py-5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.28)] text-[#334954]">
                        <WalletCards className="size-4" />
                      </span>

                      <div>
                        <p className="text-sm font-black text-[var(--color-near-black)]">
                          Unallocated budget
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/48">
                          Still available to assign
                        </p>
                      </div>
                    </div>

                    <p className="text-right text-sm font-black text-[var(--color-near-black)]">
                      {formatCurrency(summary.summary.unallocatedBudget)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(233,221,207,0.68)] text-[var(--color-deep-plum)]">
                        <CreditCard className="size-4" />
                      </span>

                      <div>
                        <p className="text-sm font-black text-[var(--color-near-black)]">
                          Outstanding committed
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/48">
                          Confirmed but not yet paid
                        </p>
                      </div>
                    </div>

                    <p className="text-right text-sm font-black text-[var(--color-near-black)]">
                      {formatCurrency(summary.summary.outstandingCommitted)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(142,151,115,0.22)] text-[#3d452f]">
                        <ReceiptText className="size-4" />
                      </span>

                      <div>
                        <p className="text-sm font-black text-[var(--color-near-black)]">
                          Manual expenses
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/48">
                          Planned and paid records
                        </p>
                      </div>
                    </div>

                    <p className="text-right text-sm font-black text-[var(--color-near-black)]">
                      {summary.counts.plannedExpenses + summary.counts.paidExpenses}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </section>

          <section className="glass-card mt-5 p-6 sm:p-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                  Expenses
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                  Planned and paid event costs.
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="soft-chip w-fit">{expenses.length} expenses</span>

                <button
                  type="button"
                  className="btn-primary text-sm font-bold"
                  onClick={openExpenseForm}
                >
                  <Plus className="size-4" />
                  Add expense
                </button>
              </div>
            </div>

            {expenses.length > 0 ? (
              <div className="mt-8 grid gap-5 xl:grid-cols-2">
                {expenses.map((expense) => (
                  <article
                    key={expense.id}
                    className="group relative overflow-hidden rounded-[1.7rem] border border-white/60 bg-white/28 p-5 shadow-[0_18px_45px_rgba(31,27,29,0.05)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/38 hover:shadow-[0_24px_60px_rgba(31,27,29,0.08)] sm:p-6"
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-16 size-40 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl transition-opacity duration-300 group-hover:opacity-90"
                    />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(233,221,207,0.68)] text-[var(--color-deep-plum)]">
                              <ReceiptText className="size-5" />
                            </span>

                            <div className="min-w-0">
                              <p className="truncate text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)] sm:text-xl">
                                {expense.title}
                              </p>

                              <p className="mt-1 truncate text-sm font-semibold text-[var(--color-charcoal)]/52">
                                {expense.budgetCategory?.name ?? 'Uncategorised'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <span
                          className="status-chip shrink-0"
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

                      <div className="mt-7 flex flex-col gap-4 border-b border-[rgba(93,58,85,0.10)] pb-6 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.17em] text-[var(--color-charcoal)]/42">
                            Expense amount
                          </p>

                          <p className="mt-2 text-3xl font-black tracking-[-0.055em] text-[var(--color-near-black)] sm:text-4xl">
                            {formatCurrency(expense.amount)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="flex items-center gap-2 rounded-xl border border-[rgba(93,58,85,0.14)] bg-[rgba(93,58,85,0.06)] px-3.5 py-2 text-sm font-black text-[var(--color-deep-plum)] transition hover:border-[rgba(93,58,85,0.25)] hover:bg-[rgba(93,58,85,0.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/30"
                            aria-label={`Edit ${expense.title}`}
                            onClick={() => {
                              openEditExpenseForm(expense);
                            }}
                          >
                            <Pencil className="size-4" />
                            Edit
                          </button>

                          <button
                            type="button"
                            className="grid size-10 place-items-center rounded-xl border border-[rgba(124,74,90,0.14)] bg-[rgba(124,74,90,0.06)] text-[var(--color-muted-burgundy)] transition hover:border-[rgba(124,74,90,0.25)] hover:bg-[rgba(124,74,90,0.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-muted-burgundy)]/30"
                            aria-label={`Delete ${expense.title}`}
                            onClick={() => {
                              openDeleteExpenseDialog(expense);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="flex items-start gap-3 rounded-2xl border border-white/50 bg-white/24 p-4">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                            <CircleDollarSign className="size-4" />
                          </span>

                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                              Expense date
                            </p>

                            <p className="mt-2 text-sm font-black leading-6 text-[var(--color-near-black)]">
                              {formatDateTime(expense.expenseDate)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-2xl border border-white/50 bg-white/24 p-4">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.28)] text-[#334954]">
                            <CreditCard className="size-4" />
                          </span>

                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                              Due date
                            </p>

                            <p className="mt-2 text-sm font-black leading-6 text-[var(--color-near-black)]">
                              {formatDateTime(expense.dueDate)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {expense.notes ? (
                        <div className="mt-5 rounded-2xl border border-white/48 bg-white/20 px-4 py-3.5">
                          <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/38">
                            Notes
                          </p>

                          <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-[var(--color-charcoal)]/64">
                            {expense.notes}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-[1.5rem] border border-dashed border-white/70 bg-white/20 p-8 text-center">
                <ReceiptText className="mx-auto size-9 text-[var(--color-deep-plum)]" />

                <p className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                  No expenses recorded
                </p>

                <p className="mt-2 leading-7 text-[var(--color-charcoal)]/62">
                  Planned and paid costs will appear here once expenses are added.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
      {isCategoryFormOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-budget-category-title"
        >
          <div className="glass-card w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,243,248,0.88))] p-7 shadow-[0_40px_100px_rgba(31,27,29,0.16)] backdrop-blur-3xl sm:p-9">
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                  <WalletCards className="size-4" />
                  Budget category
                </div>

                <h2
                  id="create-budget-category-title"
                  className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                >
                  {categoryToEdit ? 'Edit budget allocation.' : 'Add a new allocation.'}
                </h2>

                <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                  {categoryToEdit
                    ? 'Update the category name or allocated budget.'
                    : 'Create a category such as venue, catering, photography or decoration.'}
                </p>
              </div>

              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)] transition hover:text-[var(--color-deep-plum)]"
                aria-label="Close category form"
                disabled={isCategoryMutationPending}
                onClick={closeCategoryForm}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-7 border-t border-[rgba(93,58,85,0.10)]" />

            <form className="mt-8 grid gap-6" onSubmit={submitCategory}>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                  Category details
                </p>

                <p className="mt-1 text-sm leading-6 text-[var(--color-charcoal)]/58">
                  Create a clear budget area for a specific part of your event.
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                  Category name
                </span>

                <input
                  className="form-field"
                  type="text"
                  placeholder="Photography"
                  disabled={isCategoryMutationPending}
                  {...categoryForm.register('name')}
                />

                <span className="mt-2 block text-xs font-semibold leading-5 text-[var(--color-charcoal)]/46">
                  Use a short, recognisable name such as venue, catering or photography.
                </span>

                {categoryForm.formState.errors.name ? (
                  <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                    {categoryForm.formState.errors.name.message}
                  </span>
                ) : null}
              </label>

              <div className="border-t border-[rgba(93,58,85,0.08)] pt-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                  Allocation
                </p>

                <p className="mt-1 text-sm leading-6 text-[var(--color-charcoal)]/58">
                  Set the planned spending limit for this category.
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                  Allocated amount
                </span>

                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-black text-[var(--color-deep-plum)]">
                    LKR
                  </span>

                  <input
                    className="form-field pl-16"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="350000"
                    disabled={isCategoryMutationPending}
                    {...categoryForm.register('allocatedAmount')}
                  />
                </div>

                <span className="mt-2 block text-xs font-semibold leading-5 text-[var(--color-charcoal)]/46">
                  This amount contributes to the total allocation shown in your budget summary.
                </span>

                {categoryForm.formState.errors.allocatedAmount ? (
                  <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                    {categoryForm.formState.errors.allocatedAmount.message}
                  </span>
                ) : null}
              </label>

              {categoryForm.formState.errors.root?.message ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                >
                  {categoryForm.formState.errors.root.message}
                </div>
              ) : null}

              {createCategoryMutation.isError || updateCategoryMutation.isError ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                >
                  {getApiErrorMessage(
                    categoryToEdit ? updateCategoryMutation.error : createCategoryMutation.error,
                  )}
                </div>
              ) : null}

              <div className="mt-2 border-t border-[rgba(93,58,85,0.10)] pt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-sm text-sm font-semibold leading-6 text-[var(--color-charcoal)]/50">
                    {categoryToEdit
                      ? 'Your existing budget totals will update after these changes are saved.'
                      : 'You can edit or remove this allocation later from the category list.'}
                  </p>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={isCategoryMutationPending}
                      onClick={closeCategoryForm}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="btn-primary min-w-40 justify-center text-sm font-bold"
                      disabled={isCategoryMutationPending}
                    >
                      {isCategoryMutationPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}

                      {updateCategoryMutation.isPending
                        ? 'Saving category...'
                        : createCategoryMutation.isPending
                          ? 'Creating category...'
                          : categoryToEdit
                            ? 'Save changes'
                            : 'Create category'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isExpenseFormOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-expense-title"
        >
          <div className="mx-auto max-w-2xl">
            <div className="glass-card overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,243,248,0.88))] p-7 shadow-[0_40px_100px_rgba(31,27,29,0.16)] backdrop-blur-3xl sm:p-9">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <ReceiptText className="size-4" />
                    Event expense
                  </div>

                  <h2
                    id="create-expense-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                  >
                    {expenseToEdit ? 'Edit event expense.' : 'Record a new event cost.'}
                  </h2>

                  <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                    {expenseToEdit
                      ? 'Update the amount, status, category, dates or payment notes.'
                      : 'Add a planned, paid or cancelled expense and optionally assign it to a budget category.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)] transition hover:text-[var(--color-deep-plum)]"
                  aria-label="Close expense form"
                  disabled={isExpenseMutationPending}
                  onClick={closeExpenseForm}
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-7 border-t border-[rgba(93,58,85,0.10)]" />

              <form className="mt-8 grid gap-5" onSubmit={submitExpense}>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                    Basic information
                  </p>

                  <p className="mt-1 text-sm text-[var(--color-charcoal)]/58">
                    Give this expense a clear name and estimated amount.
                  </p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Expense title
                    </span>

                    <input
                      className="form-field"
                      type="text"
                      placeholder="Photography deposit"
                      disabled={isExpenseMutationPending}
                      {...expenseForm.register('title')}
                    />

                    {expenseForm.formState.errors.title ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {expenseForm.formState.errors.title.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Amount
                    </span>

                    <input
                      className="form-field"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="75000"
                      disabled={isExpenseMutationPending}
                      {...expenseForm.register('amount')}
                    />

                    {expenseForm.formState.errors.amount ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {expenseForm.formState.errors.amount.message}
                      </span>
                    ) : null}
                  </label>
                </div>

                <div className="border-t border-[rgba(93,58,85,0.08)] pt-6">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                    Classification
                  </p>

                  <p className="mt-1 text-sm text-[var(--color-charcoal)]/58">
                    Organise this expense within your event budget.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Budget category
                    </span>

                    <select
                      className="form-field"
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
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Status
                    </span>

                    <select
                      className="form-field"
                      disabled={isExpenseMutationPending}
                      {...expenseForm.register('status')}
                    >
                      {expenseStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0) + status.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="border-t border-[rgba(93,58,85,0.08)] pt-6">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                    Schedule
                  </p>

                  <p className="mt-1 text-sm text-[var(--color-charcoal)]/58">
                    Record when the expense occurs and when payment is expected.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Expense date
                    </span>

                    <input
                      className="form-field"
                      type="datetime-local"
                      disabled={isExpenseMutationPending}
                      {...expenseForm.register('expenseDate')}
                    />

                    {expenseForm.formState.errors.expenseDate ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {expenseForm.formState.errors.expenseDate.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Due date
                    </span>

                    <input
                      className="form-field"
                      type="datetime-local"
                      disabled={isExpenseMutationPending}
                      {...expenseForm.register('dueDate')}
                    />
                  </label>
                </div>

                <div className="border-t border-[rgba(93,58,85,0.08)] pt-6">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                    Additional notes
                  </p>

                  <p className="mt-1 text-sm text-[var(--color-charcoal)]/58">
                    Include optional payment references or planning details.
                  </p>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Notes
                  </span>

                  <textarea
                    className="form-field min-h-28 resize-y"
                    placeholder="Optional payment details or planning notes"
                    disabled={isExpenseMutationPending}
                    {...expenseForm.register('notes')}
                  />

                  {expenseForm.formState.errors.notes ? (
                    <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                      {expenseForm.formState.errors.notes.message}
                    </span>
                  ) : null}
                </label>

                {expenseForm.formState.errors.root?.message ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                  >
                    {expenseForm.formState.errors.root.message}
                  </div>
                ) : null}

                {createExpenseMutation.isError || updateExpenseMutation.isError ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                  >
                    {getApiErrorMessage(
                      expenseToEdit ? updateExpenseMutation.error : createExpenseMutation.error,
                    )}
                  </div>
                ) : null}
                <div className="mt-2 border-t border-[rgba(93,58,85,0.10)] pt-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-sm text-sm font-semibold leading-6 text-[var(--color-charcoal)]/50">
                      {expenseToEdit
                        ? 'Saving will immediately update the category totals and budget summary.'
                        : 'This expense will be included in your event budget calculations.'}
                    </p>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
                        className="btn-primary min-w-40 justify-center text-sm font-bold"
                        disabled={isExpenseMutationPending}
                      >
                        {isExpenseMutationPending ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Save className="size-4" />
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
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
      {expenseToDelete ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.52)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-expense-title"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,242,245,0.92))] p-7 shadow-[0_40px_100px_rgba(31,27,29,0.18)] backdrop-blur-3xl sm:p-9">
            <div className="flex items-start justify-between gap-5">
              <div className="grid size-16 shrink-0 place-items-center rounded-[1.4rem] border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)] shadow-[0_16px_35px_rgba(124,74,90,0.10)]">
                <Trash2 className="size-7" />
              </div>

              <span className="status-chip shrink-0" data-tone="rose">
                Permanent action
              </span>
            </div>

            <div className="mt-7">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                Delete expense
              </p>

              <h2
                id="delete-expense-title"
                className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
              >
                Remove this expense?
              </h2>

              <p className="mt-4 leading-7 text-[var(--color-charcoal)]/66">
                This will permanently remove the expense and immediately recalculate the related
                budget totals.
              </p>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/60 bg-white/38 p-5 shadow-[0_16px_40px_rgba(31,27,29,0.05)] backdrop-blur-xl">
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(233,221,207,0.68)] text-[var(--color-deep-plum)]">
                  <ReceiptText className="size-5" />
                </span>

                <div className="min-w-0">
                  <p className="truncate text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                    {expenseToDelete.title}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/52">
                    {expenseToDelete.budgetCategory?.name ?? 'Uncategorised'}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4 border-t border-[rgba(93,58,85,0.10)] pt-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/42">
                    Expense amount
                  </p>

                  <p className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                    {formatCurrency(expenseToDelete.amount)}
                  </p>
                </div>

                <span
                  className="status-chip shrink-0"
                  data-tone={
                    expenseToDelete.status === 'PAID'
                      ? 'green'
                      : expenseToDelete.status === 'CANCELLED'
                        ? 'rose'
                        : 'plum'
                  }
                >
                  {expenseToDelete.status.charAt(0) + expenseToDelete.status.slice(1).toLowerCase()}
                </span>
              </div>
            </div>

            {deleteExpenseMutation.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(deleteExpenseMutation.error)}
              </div>
            ) : null}

            <div className="mt-7 border-t border-[rgba(93,58,85,0.10)] pt-6">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
                  className="flex min-w-40 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--color-muted-burgundy),var(--color-rosewood))] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(124,74,90,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(124,74,90,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={deleteExpenseMutation.isPending}
                  onClick={() => {
                    deleteExpenseMutation.mutate(expenseToDelete.id);
                  }}
                >
                  {deleteExpenseMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}

                  {deleteExpenseMutation.isPending ? 'Deleting expense...' : 'Delete expense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {categoryToDelete ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.52)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-budget-category-title"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,242,245,0.92))] p-7 shadow-[0_40px_100px_rgba(31,27,29,0.18)] backdrop-blur-3xl sm:p-9">
            <div className="flex items-start justify-between gap-5">
              <div className="grid size-16 shrink-0 place-items-center rounded-[1.4rem] border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)] shadow-[0_16px_35px_rgba(124,74,90,0.10)]">
                <Trash2 className="size-7" />
              </div>

              <span className="status-chip shrink-0" data-tone="rose">
                Permanent action
              </span>
            </div>

            <div className="mt-7">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                Delete category
              </p>

              <h2
                id="delete-budget-category-title"
                className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
              >
                Remove this allocation?
              </h2>

              <p className="mt-4 leading-7 text-[var(--color-charcoal)]/66">
                This permanently removes the category allocation. Associated expenses may remain in
                the workspace as uncategorised expenses.
              </p>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/60 bg-white/38 p-5 shadow-[0_16px_40px_rgba(31,27,29,0.05)] backdrop-blur-xl">
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                  <WalletCards className="size-5" />
                </span>

                <div className="min-w-0">
                  <p className="truncate text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                    {categoryToDelete.name}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/52">
                    Budget category allocation
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[rgba(93,58,85,0.10)] pt-5">
                <div className="rounded-2xl border border-white/50 bg-white/28 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                    Allocated
                  </p>

                  <p className="mt-2 text-base font-black text-[var(--color-near-black)]">
                    {formatCurrency(categoryToDelete.allocatedAmount)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/50 bg-white/28 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                    Used
                  </p>

                  <p className="mt-2 text-base font-black text-[var(--color-near-black)]">
                    {formatCurrency(categoryToDelete.totalExpenses)}
                  </p>
                </div>
              </div>
            </div>

            {deleteCategoryMutation.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(deleteCategoryMutation.error)}
              </div>
            ) : null}

            <div className="mt-7 border-t border-[rgba(93,58,85,0.10)] pt-6">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
                  className="flex min-w-40 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--color-muted-burgundy),var(--color-rosewood))] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(124,74,90,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(124,74,90,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={deleteCategoryMutation.isPending}
                  onClick={() => {
                    deleteCategoryMutation.mutate(categoryToDelete.id);
                  }}
                >
                  {deleteCategoryMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}

                  {deleteCategoryMutation.isPending ? 'Deleting category...' : 'Delete category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
