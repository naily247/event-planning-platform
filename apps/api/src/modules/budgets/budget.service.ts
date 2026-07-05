import { PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type {
  CreateBudgetCategoryInput,
  CreateExpenseInput,
  ExpenseQueryInput,
  UpdateBudgetCategoryInput,
  UpdateExpenseInput,
} from './budget.schemas.js';

const budgetCategorySelect = {
  id: true,
  eventId: true,
  name: true,
  allocatedAmount: true,
  createdAt: true,
  updatedAt: true,
} as const;

const expenseSelect = {
  id: true,
  eventId: true,
  budgetCategoryId: true,
  title: true,
  amount: true,
  status: true,
  expenseDate: true,
  dueDate: true,
  notes: true,
  createdAt: true,
  updatedAt: true,

  budgetCategory: {
    select: {
      id: true,
      name: true,
      allocatedAmount: true,
    },
  },
} as const;

type SelectedBudgetCategory = Prisma.EventBudgetCategoryGetPayload<{
  select: typeof budgetCategorySelect;
}>;

type SelectedExpense = Prisma.ExpenseGetPayload<{
  select: typeof expenseSelect;
}>;

const formatBudgetCategory = (category: SelectedBudgetCategory) => ({
  ...category,
  allocatedAmount: category.allocatedAmount.toFixed(2),
});

const formatExpense = (expense: SelectedExpense) => ({
  ...expense,
  amount: expense.amount.toFixed(2),

  budgetCategory: expense.budgetCategory
    ? {
        ...expense.budgetCategory,
        allocatedAmount: expense.budgetCategory.allocatedAmount.toFixed(2),
      }
    : null,
});

const getOwnedEvent = async (ownerId: string, eventId: string) => {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      ownerId,
    },

    select: {
      id: true,
      name: true,
      plannedBudget: true,
      status: true,
    },
  });

  if (!event) {
    throw new AppError(404, 'Event not found', 'EVENT_NOT_FOUND');
  }

  return event;
};

const getOwnedBudgetCategory = async (ownerId: string, eventId: string, categoryId: string) => {
  const category = await prisma.eventBudgetCategory.findFirst({
    where: {
      id: categoryId,
      eventId,

      event: {
        ownerId,
      },
    },

    select: budgetCategorySelect,
  });

  if (!category) {
    throw new AppError(404, 'Budget category not found', 'BUDGET_CATEGORY_NOT_FOUND');
  }

  return category;
};

const getOwnedExpense = async (ownerId: string, eventId: string, expenseId: string) => {
  const expense = await prisma.expense.findFirst({
    where: {
      id: expenseId,
      eventId,

      event: {
        ownerId,
      },
    },

    select: expenseSelect,
  });

  if (!expense) {
    throw new AppError(404, 'Expense not found', 'EXPENSE_NOT_FOUND');
  }

  return expense;
};

const validateBudgetCategoryForEvent = async (
  ownerId: string,
  eventId: string,
  categoryId: string,
) => {
  const category = await prisma.eventBudgetCategory.findFirst({
    where: {
      id: categoryId,
      eventId,

      event: {
        ownerId,
      },
    },

    select: {
      id: true,
    },
  });

  if (!category) {
    throw new AppError(
      404,
      'Budget category not found for this event',
      'BUDGET_CATEGORY_NOT_FOUND',
    );
  }
};

const getExpenseOrderBy = (
  sort: ExpenseQueryInput['sort'],
): Prisma.ExpenseOrderByWithRelationInput => {
  switch (sort) {
    case 'oldest':
      return {
        createdAt: 'asc',
      };

    case 'amount_highest':
      return {
        amount: 'desc',
      };

    case 'amount_lowest':
      return {
        amount: 'asc',
      };

    case 'newest':
    default:
      return {
        createdAt: 'desc',
      };
  }
};

const isUniqueConstraintError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

export const createBudgetCategory = async (
  ownerId: string,
  eventId: string,
  input: CreateBudgetCategoryInput,
) => {
  await getOwnedEvent(ownerId, eventId);

  try {
    const category = await prisma.eventBudgetCategory.create({
      data: {
        eventId,
        name: input.name,
        allocatedAmount: new Prisma.Decimal(input.allocatedAmount),
      },

      select: budgetCategorySelect,
    });

    return formatBudgetCategory(category);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(
        409,
        'A budget category with this name already exists for the event',
        'BUDGET_CATEGORY_ALREADY_EXISTS',
      );
    }

    throw error;
  }
};

export const getBudgetCategories = async (ownerId: string, eventId: string) => {
  await getOwnedEvent(ownerId, eventId);

  const categories = await prisma.eventBudgetCategory.findMany({
    where: {
      eventId,
    },

    select: budgetCategorySelect,

    orderBy: {
      createdAt: 'asc',
    },
  });

  return categories.map(formatBudgetCategory);
};

export const updateBudgetCategory = async (
  ownerId: string,
  eventId: string,
  categoryId: string,
  input: UpdateBudgetCategoryInput,
) => {
  await getOwnedBudgetCategory(ownerId, eventId, categoryId);

  try {
    const category = await prisma.eventBudgetCategory.update({
      where: {
        id: categoryId,
      },

      data: {
        ...(input.name !== undefined && {
          name: input.name,
        }),

        ...(input.allocatedAmount !== undefined && {
          allocatedAmount: new Prisma.Decimal(input.allocatedAmount),
        }),
      },

      select: budgetCategorySelect,
    });

    return formatBudgetCategory(category);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(
        409,
        'A budget category with this name already exists for the event',
        'BUDGET_CATEGORY_ALREADY_EXISTS',
      );
    }

    throw error;
  }
};

export const deleteBudgetCategory = async (
  ownerId: string,
  eventId: string,
  categoryId: string,
) => {
  await getOwnedBudgetCategory(ownerId, eventId, categoryId);

  await prisma.eventBudgetCategory.delete({
    where: {
      id: categoryId,
    },
  });
};

export const createExpense = async (
  ownerId: string,
  eventId: string,
  input: CreateExpenseInput,
) => {
  await getOwnedEvent(ownerId, eventId);

  if (input.budgetCategoryId) {
    await validateBudgetCategoryForEvent(ownerId, eventId, input.budgetCategoryId);
  }

  const expense = await prisma.expense.create({
    data: {
      eventId,
      budgetCategoryId: input.budgetCategoryId ?? null,
      title: input.title,
      amount: new Prisma.Decimal(input.amount),
      status: input.status ?? 'PLANNED',
      expenseDate: input.expenseDate ? new Date(input.expenseDate) : null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      notes: input.notes ?? null,
    },

    select: expenseSelect,
  });

  return formatExpense(expense);
};

export const getExpenses = async (ownerId: string, eventId: string, query: ExpenseQueryInput) => {
  await getOwnedEvent(ownerId, eventId);

  if (query.categoryId) {
    await validateBudgetCategoryForEvent(ownerId, eventId, query.categoryId);
  }

  const expenses = await prisma.expense.findMany({
    where: {
      eventId,

      ...(query.status && {
        status: query.status,
      }),

      ...(query.categoryId && {
        budgetCategoryId: query.categoryId,
      }),
    },

    select: expenseSelect,
    orderBy: getExpenseOrderBy(query.sort),
  });

  return expenses.map(formatExpense);
};

export const getExpenseById = async (ownerId: string, eventId: string, expenseId: string) => {
  const expense = await getOwnedExpense(ownerId, eventId, expenseId);

  return formatExpense(expense);
};

export const updateExpense = async (
  ownerId: string,
  eventId: string,
  expenseId: string,
  input: UpdateExpenseInput,
) => {
  const existingExpense = await getOwnedExpense(ownerId, eventId, expenseId);

  if (input.budgetCategoryId) {
    await validateBudgetCategoryForEvent(ownerId, eventId, input.budgetCategoryId);
  }

  const nextExpenseDate =
    input.expenseDate !== undefined
      ? input.expenseDate
        ? new Date(input.expenseDate)
        : null
      : existingExpense.expenseDate;

  const nextDueDate =
    input.dueDate !== undefined
      ? input.dueDate
        ? new Date(input.dueDate)
        : null
      : existingExpense.dueDate;

  if (nextExpenseDate && nextDueDate && nextExpenseDate > nextDueDate) {
    throw new AppError(400, 'Expense date cannot be after due date', 'INVALID_EXPENSE_DATE_RANGE');
  }

  const expense = await prisma.expense.update({
    where: {
      id: expenseId,
    },

    data: {
      ...(input.budgetCategoryId !== undefined && {
        budgetCategoryId: input.budgetCategoryId,
      }),

      ...(input.title !== undefined && {
        title: input.title,
      }),

      ...(input.amount !== undefined && {
        amount: new Prisma.Decimal(input.amount),
      }),

      ...(input.status !== undefined && {
        status: input.status,
      }),

      ...(input.expenseDate !== undefined && {
        expenseDate: input.expenseDate ? new Date(input.expenseDate) : null,
      }),

      ...(input.dueDate !== undefined && {
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      }),

      ...(input.notes !== undefined && {
        notes: input.notes,
      }),
    },

    select: expenseSelect,
  });

  return formatExpense(expense);
};

export const deleteExpense = async (ownerId: string, eventId: string, expenseId: string) => {
  await getOwnedExpense(ownerId, eventId, expenseId);

  await prisma.expense.delete({
    where: {
      id: expenseId,
    },
  });
};

export const getBudgetSummary = async (ownerId: string, eventId: string) => {
  const event = await getOwnedEvent(ownerId, eventId);

  const [categories, expenses, committedBookingCost, verifiedPaymentTotal] =
    await prisma.$transaction([
      prisma.eventBudgetCategory.findMany({
        where: {
          eventId,
        },

        select: {
          id: true,
          name: true,
          allocatedAmount: true,

          expenses: {
            where: {
              status: {
                not: 'CANCELLED',
              },
            },

            select: {
              amount: true,
              status: true,
            },
          },
        },

        orderBy: {
          createdAt: 'asc',
        },
      }),

      prisma.expense.findMany({
        where: {
          eventId,
        },

        select: {
          amount: true,
          status: true,
        },
      }),

      prisma.booking.aggregate({
        where: {
          eventId,

          status: {
            in: ['CONFIRMED', 'DEPOSIT_PENDING', 'ACTIVE', 'COMPLETED', 'DISPUTED'],
          },
        },

        _sum: {
          agreedCost: true,
        },

        _count: {
          _all: true,
        },
      }),

      prisma.payment.aggregate({
        where: {
          status: PaymentStatus.VERIFIED,

          booking: {
            eventId,
          },
        },

        _sum: {
          amount: true,
        },

        _count: {
          _all: true,
        },
      }),
    ]);

  const zero = new Prisma.Decimal(0);

  const plannedExpenses = expenses.filter((expense) => expense.status === 'PLANNED');

  const paidExpenses = expenses.filter((expense) => expense.status === 'PAID');

  const cancelledExpenses = expenses.filter((expense) => expense.status === 'CANCELLED');

  const plannedManualExpenses = plannedExpenses.reduce(
    (total, expense) => total.plus(expense.amount),
    zero,
  );

  const paidManualExpenses = paidExpenses.reduce(
    (total, expense) => total.plus(expense.amount),
    zero,
  );

  const activeManualExpenses = plannedManualExpenses.plus(paidManualExpenses);

  const bookingCommitted = committedBookingCost._sum.agreedCost ?? zero;

  const verifiedVendorPayments = verifiedPaymentTotal._sum.amount ?? zero;

  const totalCommitted = bookingCommitted.plus(activeManualExpenses);

  const totalPaid = verifiedVendorPayments.plus(paidManualExpenses);

  const outstandingCommitted = Prisma.Decimal.max(totalCommitted.minus(totalPaid), zero);

  const plannedBudget = event.plannedBudget;

  const remainingBudget = plannedBudget ? plannedBudget.minus(totalCommitted) : null;

  const isOverBudget = remainingBudget ? remainingBudget.lessThan(0) : false;

  const overBudgetAmount =
    remainingBudget && remainingBudget.lessThan(0) ? remainingBudget.abs() : zero;

  const totalAllocated = categories.reduce(
    (total, category) => total.plus(category.allocatedAmount),
    zero,
  );

  const unallocatedBudget = plannedBudget ? plannedBudget.minus(totalAllocated) : null;

  const categoryBreakdown = categories.map((category) => {
    const categoryPlanned = category.expenses.reduce(
      (total, expense) => (expense.status === 'PLANNED' ? total.plus(expense.amount) : total),
      zero,
    );

    const categoryPaid = category.expenses.reduce(
      (total, expense) => (expense.status === 'PAID' ? total.plus(expense.amount) : total),
      zero,
    );

    const categorySpent = categoryPlanned.plus(categoryPaid);

    const categoryRemaining = category.allocatedAmount.minus(categorySpent);

    return {
      id: category.id,
      name: category.name,
      allocatedAmount: category.allocatedAmount.toFixed(2),
      plannedExpenses: categoryPlanned.toFixed(2),
      paidExpenses: categoryPaid.toFixed(2),
      totalExpenses: categorySpent.toFixed(2),
      remainingAmount: categoryRemaining.toFixed(2),
      isOverAllocated: categoryRemaining.lessThan(0),
      overAllocatedAmount: categoryRemaining.lessThan(0)
        ? categoryRemaining.abs().toFixed(2)
        : '0.00',
    };
  });

  return {
    event: {
      id: event.id,
      name: event.name,
      status: event.status,
    },

    summary: {
      plannedBudget: plannedBudget?.toFixed(2) ?? null,
      totalAllocated: totalAllocated.toFixed(2),
      unallocatedBudget: unallocatedBudget?.toFixed(2) ?? null,

      bookingCommittedCost: bookingCommitted.toFixed(2),
      verifiedVendorPayments: verifiedVendorPayments.toFixed(2),
      plannedManualExpenses: plannedManualExpenses.toFixed(2),
      paidManualExpenses: paidManualExpenses.toFixed(2),

      totalCommitted: totalCommitted.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      outstandingCommitted: outstandingCommitted.toFixed(2),

      remainingBudget: remainingBudget?.toFixed(2) ?? null,
      isOverBudget,
      overBudgetAmount: overBudgetAmount.toFixed(2),
    },

    counts: {
      budgetCategories: categories.length,
      committedBookings: committedBookingCost._count._all,
      verifiedVendorPayments: verifiedPaymentTotal._count._all,
      plannedExpenses: plannedExpenses.length,
      paidExpenses: paidExpenses.length,
      cancelledExpenses: cancelledExpenses.length,
    },

    categoryBreakdown,
  };
};
