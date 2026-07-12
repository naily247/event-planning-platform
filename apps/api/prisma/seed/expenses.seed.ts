import { ExpenseStatus, Prisma, type PrismaClient } from '@prisma/client';
import { DEVELOPMENT_CUSTOMERS } from './constants.js';
import { getRequiredEventByNameAndOwner, getRequiredUserByEmail } from './helpers.js';

const DEVELOPMENT_EXPENSES = [
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    eventName: 'Emma and Daniel Wedding',
    budgetCategoryName: 'Invitations and Gifts',
    title: 'Save-the-date printing deposit',
    amount: '45000.00',
    status: ExpenseStatus.PAID,
    expenseDate: new Date('2026-06-20T09:00:00.000Z'),
    dueDate: null,
    notes: 'Initial payment for premium save-the-date cards and envelope samples.',
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    eventName: 'Emma and Daniel Wedding',
    budgetCategoryName: 'Clothing and Beauty',
    title: 'Bridal fitting reservation',
    amount: '75000.00',
    status: ExpenseStatus.PAID,
    expenseDate: new Date('2026-07-05T10:30:00.000Z'),
    dueDate: null,
    notes: 'Reservation payment for the first bridal fitting and design consultation.',
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    eventName: 'Emma and Daniel Wedding',
    budgetCategoryName: 'Contingency',
    title: 'Marriage registration documentation',
    amount: '18000.00',
    status: ExpenseStatus.PLANNED,
    expenseDate: null,
    dueDate: new Date('2026-09-15T00:00:00.000Z'),
    notes: 'Estimated administrative and document-processing costs.',
  },

  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[1].email,
    eventName: 'NovaTech Annual Conference',
    budgetCategoryName: 'Printing and Branding',
    title: 'Stage backdrop design',
    amount: '85000.00',
    status: ExpenseStatus.PAID,
    expenseDate: new Date('2026-06-28T08:30:00.000Z'),
    dueDate: null,
    notes: 'Design and production deposit for the main conference backdrop.',
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[1].email,
    eventName: 'NovaTech Annual Conference',
    budgetCategoryName: 'Speaker and Programme Costs',
    title: 'Keynote speaker accommodation',
    amount: '120000.00',
    status: ExpenseStatus.PLANNED,
    expenseDate: null,
    dueDate: new Date('2026-08-20T00:00:00.000Z'),
    notes: 'Estimated two-night hotel stay and local transport for the keynote speaker.',
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[1].email,
    eventName: 'NovaTech Annual Conference',
    budgetCategoryName: 'Guest Management',
    title: 'Registration desk materials',
    amount: '38000.00',
    status: ExpenseStatus.PLANNED,
    expenseDate: null,
    dueDate: new Date('2026-09-01T00:00:00.000Z'),
    notes: 'Badge holders, lanyards, desk signage, and attendee stationery.',
  },

  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[2].email,
    eventName: 'Olivia Birthday Celebration',
    budgetCategoryName: 'Venue and Setup',
    title: 'Garden venue reservation',
    amount: '90000.00',
    status: ExpenseStatus.PAID,
    expenseDate: new Date('2026-07-02T11:00:00.000Z'),
    dueDate: null,
    notes: 'Reservation deposit for the outdoor garden venue.',
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[2].email,
    eventName: 'Olivia Birthday Celebration',
    budgetCategoryName: 'Decoration and Flowers',
    title: 'Table décor materials',
    amount: '42000.00',
    status: ExpenseStatus.PLANNED,
    expenseDate: null,
    dueDate: new Date('2026-08-10T00:00:00.000Z'),
    notes: 'Candles, table runners, small floral vessels, and decorative accessories.',
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[2].email,
    eventName: 'Olivia Birthday Celebration',
    budgetCategoryName: 'Contingency',
    title: 'Weather backup canopy',
    amount: '35000.00',
    status: ExpenseStatus.CANCELLED,
    expenseDate: null,
    dueDate: null,
    notes: 'Cancelled after the venue confirmed access to its covered pavilion.',
  },
] as const;

export const seedDevelopmentExpenses = async (prisma: PrismaClient) => {
  let seededExpenseCount = 0;

  for (const expenseData of DEVELOPMENT_EXPENSES) {
    const owner = await getRequiredUserByEmail(prisma, expenseData.ownerEmail);

    const event = await getRequiredEventByNameAndOwner(prisma, expenseData.eventName, owner.id);

    const budgetCategory = await prisma.eventBudgetCategory.findUnique({
      where: {
        eventId_name: {
          eventId: event.id,
          name: expenseData.budgetCategoryName,
        },
      },
    });

    if (!budgetCategory) {
      throw new Error(
        `Required budget category "${expenseData.budgetCategoryName}" was not found for event "${expenseData.eventName}". Seed budget categories first.`,
      );
    }

    const existingExpense = await prisma.expense.findFirst({
      where: {
        eventId: event.id,
        title: expenseData.title,
      },
    });

    const expenseValues = {
      budgetCategoryId: budgetCategory.id,
      title: expenseData.title,
      amount: new Prisma.Decimal(expenseData.amount),
      status: expenseData.status,
      expenseDate: expenseData.expenseDate,
      dueDate: expenseData.dueDate,
      notes: expenseData.notes,
    };

    if (existingExpense) {
      await prisma.expense.update({
        where: {
          id: existingExpense.id,
        },
        data: expenseValues,
      });
    } else {
      await prisma.expense.create({
        data: {
          eventId: event.id,
          ...expenseValues,
        },
      });
    }

    seededExpenseCount += 1;
  }

  console.log(`${seededExpenseCount} development expenses seeded successfully.`);
};
