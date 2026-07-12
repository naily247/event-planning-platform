import { Prisma, type PrismaClient } from '@prisma/client';
import { DEVELOPMENT_CUSTOMERS } from './constants.js';
import { getRequiredEventByNameAndOwner, getRequiredUserByEmail } from './helpers.js';

const DEVELOPMENT_EVENT_BUDGETS = [
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[0].email,
    eventName: 'Emma and Daniel Wedding',
    categories: [
      {
        name: 'Venue',
        allocatedAmount: '850000.00',
      },
      {
        name: 'Catering',
        allocatedAmount: '1150000.00',
      },
      {
        name: 'Photography',
        allocatedAmount: '350000.00',
      },
      {
        name: 'Decoration and Flowers',
        allocatedAmount: '700000.00',
      },
      {
        name: 'Entertainment',
        allocatedAmount: '280000.00',
      },
      {
        name: 'Transport',
        allocatedAmount: '220000.00',
      },
      {
        name: 'Cake and Desserts',
        allocatedAmount: '140000.00',
      },
      {
        name: 'Clothing and Beauty',
        allocatedAmount: '500000.00',
      },
      {
        name: 'Invitations and Gifts',
        allocatedAmount: '160000.00',
      },
      {
        name: 'Contingency',
        allocatedAmount: '150000.00',
      },
    ],
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[1].email,
    eventName: 'NovaTech Annual Conference',
    categories: [
      {
        name: 'Venue',
        allocatedAmount: '650000.00',
      },
      {
        name: 'Catering',
        allocatedAmount: '900000.00',
      },
      {
        name: 'Audio and Lighting',
        allocatedAmount: '380000.00',
      },
      {
        name: 'Photography and Media',
        allocatedAmount: '260000.00',
      },
      {
        name: 'Printing and Branding',
        allocatedAmount: '180000.00',
      },
      {
        name: 'Guest Management',
        allocatedAmount: '160000.00',
      },
      {
        name: 'Speaker and Programme Costs',
        allocatedAmount: '220000.00',
      },
      {
        name: 'Contingency',
        allocatedAmount: '100000.00',
      },
    ],
  },
  {
    ownerEmail: DEVELOPMENT_CUSTOMERS[2].email,
    eventName: 'Olivia Birthday Celebration',
    categories: [
      {
        name: 'Venue and Setup',
        allocatedAmount: '230000.00',
      },
      {
        name: 'Food and Beverages',
        allocatedAmount: '260000.00',
      },
      {
        name: 'Cake and Desserts',
        allocatedAmount: '110000.00',
      },
      {
        name: 'Decoration and Flowers',
        allocatedAmount: '140000.00',
      },
      {
        name: 'Photography',
        allocatedAmount: '85000.00',
      },
      {
        name: 'Entertainment',
        allocatedAmount: '75000.00',
      },
      {
        name: 'Contingency',
        allocatedAmount: '50000.00',
      },
    ],
  },
] as const;

export const seedEventBudgetCategories = async (prisma: PrismaClient) => {
  let seededCategoryCount = 0;

  for (const budgetData of DEVELOPMENT_EVENT_BUDGETS) {
    const owner = await getRequiredUserByEmail(prisma, budgetData.ownerEmail);

    const event = await getRequiredEventByNameAndOwner(prisma, budgetData.eventName, owner.id);

    for (const categoryData of budgetData.categories) {
      await prisma.eventBudgetCategory.upsert({
        where: {
          eventId_name: {
            eventId: event.id,
            name: categoryData.name,
          },
        },
        update: {
          allocatedAmount: new Prisma.Decimal(categoryData.allocatedAmount),
        },
        create: {
          eventId: event.id,
          name: categoryData.name,
          allocatedAmount: new Prisma.Decimal(categoryData.allocatedAmount),
        },
      });

      seededCategoryCount += 1;
    }
  }

  console.log(`${seededCategoryCount} event budget categories seeded successfully.`);
};
