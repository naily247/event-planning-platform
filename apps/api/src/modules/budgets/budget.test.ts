import { BookingStatus, ExpenseStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const customerEmail = 'budget-customer@example.com';
const secondCustomerEmail = 'budget-second-customer@example.com';
const vendorEmail = 'budget-vendor@example.com';

const customerPayload = {
  email: customerEmail,
  password: 'Customer@2026',
  firstName: 'Maya',
  lastName: 'Fernando',
  phone: {
    country: 'LK',
    number: '0771234567',
  },
};

const secondCustomerPayload = {
  email: secondCustomerEmail,
  password: 'Customer@2026',
  firstName: 'Nila',
  lastName: 'Perera',
  phone: {
    country: 'LK',
    number: '0777654321',
  },
};

const vendorPayload = {
  email: vendorEmail,
  password: 'Vendor@2026',
  firstName: 'Budget',
  lastName: 'Vendor',
  businessName: 'Budget Test Vendor',
};

const testEmails = [customerEmail, secondCustomerEmail, vendorEmail];

const registerCustomer = async (payload: typeof customerPayload | typeof secondCustomerPayload) => {
  return request(app).post('/api/v1/auth/register/customer').send(payload);
};

const registerVendor = async () => {
  return request(app).post('/api/v1/auth/register/vendor').send(vendorPayload);
};

const createEventRequest = (accessToken: string, overrides: Record<string, unknown> = {}) => {
  return request(app)
    .post('/api/v1/events')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: 'Maya and Arjun Wedding',
      eventType: 'Wedding',
      eventDate: '2030-08-20T09:00:00.000Z',
      location: 'Colombo',
      guestCount: 250,
      plannedBudget: 1000000,
      theme: 'Classic Garden',
      requirements: 'Outdoor ceremony with photography, catering, decoration, and live music.',
      ...overrides,
    });
};

const createBudgetCategoryRequest = (
  accessToken: string,
  eventId: string,
  overrides: Record<string, unknown> = {},
) => {
  return request(app)
    .post(`/api/v1/budgets/events/${eventId}/categories`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: 'Catering',
      allocatedAmount: 400000,
      ...overrides,
    });
};

const createExpenseRequest = (
  accessToken: string,
  eventId: string,
  overrides: Record<string, unknown> = {},
) => {
  return request(app)
    .post(`/api/v1/budgets/events/${eventId}/expenses`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      title: 'Venue advance',
      amount: 100000,
      status: ExpenseStatus.PLANNED,
      dueDate: '2030-05-01T09:00:00.000Z',
      notes: 'Advance payment for the selected venue.',
      ...overrides,
    });
};

const clearTestData = async () => {
  await prisma.notification.deleteMany({
    where: {
      recipient: {
        email: {
          in: testEmails,
        },
      },
    },
  });

  await prisma.payment.deleteMany({
    where: {
      OR: [
        {
          submittedBy: {
            email: {
              in: testEmails,
            },
          },
        },
        {
          booking: {
            event: {
              owner: {
                email: {
                  in: testEmails,
                },
              },
            },
          },
        },
      ],
    },
  });

  await prisma.review.deleteMany({
    where: {
      OR: [
        {
          customer: {
            email: {
              in: testEmails,
            },
          },
        },
        {
          vendor: {
            user: {
              email: {
                in: testEmails,
              },
            },
          },
        },
      ],
    },
  });

  await prisma.booking.deleteMany({
    where: {
      OR: [
        {
          event: {
            owner: {
              email: {
                in: testEmails,
              },
            },
          },
        },
        {
          vendor: {
            user: {
              email: {
                in: testEmails,
              },
            },
          },
        },
      ],
    },
  });

  await prisma.quotation.deleteMany({
    where: {
      quotationRequest: {
        OR: [
          {
            event: {
              owner: {
                email: {
                  in: testEmails,
                },
              },
            },
          },
          {
            vendor: {
              user: {
                email: {
                  in: testEmails,
                },
              },
            },
          },
        ],
      },
    },
  });

  await prisma.quotationRequest.deleteMany({
    where: {
      OR: [
        {
          event: {
            owner: {
              email: {
                in: testEmails,
              },
            },
          },
        },
        {
          vendor: {
            user: {
              email: {
                in: testEmails,
              },
            },
          },
        },
      ],
    },
  });

  await prisma.event.deleteMany({
    where: {
      owner: {
        email: {
          in: testEmails,
        },
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        in: testEmails,
      },
    },
  });
};

beforeEach(async () => {
  await clearTestData();
});

afterAll(async () => {
  await clearTestData();
  await prisma.$disconnect();
});

describe('Budget and expense management API', () => {
  describe('Budget route access control', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app).get(
        '/api/v1/budgets/events/clx0000000000000000000000/summary',
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated vendors', async () => {
      const vendorRegistration = await registerVendor();

      const response = await request(app)
        .get('/api/v1/budgets/events/clx0000000000000000000000/summary')
        .set('Authorization', `Bearer ${vendorRegistration.body.data.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('hides another customer event', async () => {
      const firstRegistration = await registerCustomer(customerPayload);

      const secondRegistration = await registerCustomer(secondCustomerPayload);

      const eventResponse = await createEventRequest(firstRegistration.body.data.accessToken);

      const response = await request(app)
        .get(`/api/v1/budgets/events/${eventResponse.body.data.id}/summary`)
        .set('Authorization', `Bearer ${secondRegistration.body.data.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_NOT_FOUND');
    });
  });

  describe('Budget categories', () => {
    it('creates a budget category for an owned event', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createBudgetCategoryRequest(accessToken, eventResponse.body.data.id);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Budget category created successfully');

      expect(response.body.data).toMatchObject({
        eventId: eventResponse.body.data.id,
        name: 'Catering',
        allocatedAmount: '400000.00',
      });

      expect(response.body.data.id).toEqual(expect.any(String));
      expect(response.body.data.createdAt).toEqual(expect.any(String));
      expect(response.body.data.updatedAt).toEqual(expect.any(String));
    });

    it('rejects an invalid category request body', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createBudgetCategoryRequest(accessToken, eventResponse.body.data.id, {
        name: 'C',
        allocatedAmount: -100,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects duplicate category names within the same event', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      await createBudgetCategoryRequest(accessToken, eventResponse.body.data.id);

      const response = await createBudgetCategoryRequest(accessToken, eventResponse.body.data.id);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BUDGET_CATEGORY_ALREADY_EXISTS');
    });

    it('lists categories belonging to an event', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      await createBudgetCategoryRequest(accessToken, eventResponse.body.data.id);

      await createBudgetCategoryRequest(accessToken, eventResponse.body.data.id, {
        name: 'Photography',
        allocatedAmount: 200000,
      });

      const response = await request(app)
        .get(`/api/v1/budgets/events/${eventResponse.body.data.id}/categories`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Catering',
            allocatedAmount: '400000.00',
          }),
          expect.objectContaining({
            name: 'Photography',
            allocatedAmount: '200000.00',
          }),
        ]),
      );
    });

    it('updates an owned budget category', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const categoryResponse = await createBudgetCategoryRequest(
        accessToken,
        eventResponse.body.data.id,
      );

      const response = await request(app)
        .patch(
          `/api/v1/budgets/events/${eventResponse.body.data.id}/categories/${categoryResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Food and Catering',
          allocatedAmount: 450000,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Budget category updated successfully');

      expect(response.body.data).toMatchObject({
        name: 'Food and Catering',
        allocatedAmount: '450000.00',
      });
    });

    it('deletes a budget category and leaves its expenses uncategorized', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const categoryResponse = await createBudgetCategoryRequest(
        accessToken,
        eventResponse.body.data.id,
      );

      const expenseResponse = await createExpenseRequest(accessToken, eventResponse.body.data.id, {
        budgetCategoryId: categoryResponse.body.data.id,
      });

      const deleteResponse = await request(app)
        .delete(
          `/api/v1/budgets/events/${eventResponse.body.data.id}/categories/${categoryResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`);

      expect(deleteResponse.status).toBe(204);

      const expense = await prisma.expense.findUnique({
        where: {
          id: expenseResponse.body.data.id,
        },
      });

      expect(expense).not.toBeNull();
      expect(expense?.budgetCategoryId).toBeNull();
    });
  });

  describe('Manual expenses', () => {
    it('creates an expense without a category', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createExpenseRequest(accessToken, eventResponse.body.data.id);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Expense created successfully');

      expect(response.body.data).toMatchObject({
        eventId: eventResponse.body.data.id,
        budgetCategoryId: null,
        title: 'Venue advance',
        amount: '100000.00',
        status: ExpenseStatus.PLANNED,
        notes: 'Advance payment for the selected venue.',
      });

      expect(response.body.data.budgetCategory).toBeNull();
    });

    it('creates an expense linked to an event budget category', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const categoryResponse = await createBudgetCategoryRequest(
        accessToken,
        eventResponse.body.data.id,
      );

      const response = await createExpenseRequest(accessToken, eventResponse.body.data.id, {
        budgetCategoryId: categoryResponse.body.data.id,
        title: 'Catering advance',
      });

      expect(response.status).toBe(201);

      expect(response.body.data).toMatchObject({
        budgetCategoryId: categoryResponse.body.data.id,
        title: 'Catering advance',
        amount: '100000.00',
      });

      expect(response.body.data.budgetCategory).toMatchObject({
        id: categoryResponse.body.data.id,
        name: 'Catering',
        allocatedAmount: '400000.00',
      });
    });

    it('rejects a category belonging to another event', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const firstEvent = await createEventRequest(accessToken);

      const secondEvent = await createEventRequest(accessToken, {
        name: 'Second Event',
        eventType: 'Birthday',
      });

      const categoryResponse = await createBudgetCategoryRequest(
        accessToken,
        secondEvent.body.data.id,
      );

      const response = await createExpenseRequest(accessToken, firstEvent.body.data.id, {
        budgetCategoryId: categoryResponse.body.data.id,
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BUDGET_CATEGORY_NOT_FOUND');
    });

    it('rejects an expense date after its due date', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createExpenseRequest(accessToken, eventResponse.body.data.id, {
        expenseDate: '2030-06-01T09:00:00.000Z',
        dueDate: '2030-05-01T09:00:00.000Z',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('lists, filters, and sorts expenses', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const categoryResponse = await createBudgetCategoryRequest(
        accessToken,
        eventResponse.body.data.id,
      );

      await createExpenseRequest(accessToken, eventResponse.body.data.id, {
        budgetCategoryId: categoryResponse.body.data.id,
        title: 'Smaller paid expense',
        amount: 50000,
        status: ExpenseStatus.PAID,
      });

      await createExpenseRequest(accessToken, eventResponse.body.data.id, {
        budgetCategoryId: categoryResponse.body.data.id,
        title: 'Larger paid expense',
        amount: 150000,
        status: ExpenseStatus.PAID,
      });

      await createExpenseRequest(accessToken, eventResponse.body.data.id, {
        title: 'Planned expense',
        amount: 200000,
        status: ExpenseStatus.PLANNED,
      });

      const response = await request(app)
        .get(
          `/api/v1/budgets/events/${eventResponse.body.data.id}/expenses?status=PAID&categoryId=${categoryResponse.body.data.id}&sort=amount_highest`,
        )
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].title).toBe('Larger paid expense');
      expect(response.body.data[0].amount).toBe('150000.00');
      expect(response.body.data[1].title).toBe('Smaller paid expense');
    });

    it('rejects invalid expense query parameters', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await request(app)
        .get(
          `/api/v1/budgets/events/${eventResponse.body.data.id}/expenses?status=INVALID&sort=wrong`,
        )
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('gets and updates an owned expense', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const expenseResponse = await createExpenseRequest(accessToken, eventResponse.body.data.id);

      const getResponse = await request(app)
        .get(
          `/api/v1/budgets/events/${eventResponse.body.data.id}/expenses/${expenseResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.id).toBe(expenseResponse.body.data.id);

      const updateResponse = await request(app)
        .patch(
          `/api/v1/budgets/events/${eventResponse.body.data.id}/expenses/${expenseResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Venue advance paid',
          amount: 125000,
          status: ExpenseStatus.PAID,
          expenseDate: '2030-04-20T09:00:00.000Z',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);

      expect(updateResponse.body.data).toMatchObject({
        title: 'Venue advance paid',
        amount: '125000.00',
        status: ExpenseStatus.PAID,
        expenseDate: '2030-04-20T09:00:00.000Z',
      });
    });

    it('rejects a partial update that creates an invalid date range', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const expenseResponse = await createExpenseRequest(accessToken, eventResponse.body.data.id, {
        dueDate: '2030-05-01T09:00:00.000Z',
      });

      const response = await request(app)
        .patch(
          `/api/v1/budgets/events/${eventResponse.body.data.id}/expenses/${expenseResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          expenseDate: '2030-06-01T09:00:00.000Z',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_EXPENSE_DATE_RANGE');
    });

    it('deletes an owned expense', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const expenseResponse = await createExpenseRequest(accessToken, eventResponse.body.data.id);

      const response = await request(app)
        .delete(
          `/api/v1/budgets/events/${eventResponse.body.data.id}/expenses/${expenseResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(204);

      const deletedExpense = await prisma.expense.findUnique({
        where: {
          id: expenseResponse.body.data.id,
        },
      });

      expect(deletedExpense).toBeNull();
    });
  });

  describe('Budget summary', () => {
    it('returns zero totals when an event has no budget activity', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken, {
        plannedBudget: null,
      });

      const response = await request(app)
        .get(`/api/v1/budgets/events/${eventResponse.body.data.id}/summary`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.summary).toMatchObject({
        plannedBudget: null,
        totalAllocated: '0.00',
        unallocatedBudget: null,
        bookingCommittedCost: '0.00',
        verifiedVendorPayments: '0.00',
        plannedManualExpenses: '0.00',
        paidManualExpenses: '0.00',
        totalCommitted: '0.00',
        totalPaid: '0.00',
        outstandingCommitted: '0.00',
        remainingBudget: null,
        isOverBudget: false,
        overBudgetAmount: '0.00',
      });
    });

    it('calculates allocations, expenses, booking commitments, and verified payments', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      const vendorRegistration = await registerVendor();

      const accessToken = customerRegistration.body.data.accessToken as string;

      const customerId = customerRegistration.body.data.user.id as string;

      const vendorUserId = vendorRegistration.body.data.user.id as string;

      const eventResponse = await createEventRequest(accessToken, {
        plannedBudget: 1000000,
      });

      const eventId = eventResponse.body.data.id as string;

      const categoryResponse = await createBudgetCategoryRequest(accessToken, eventId, {
        name: 'Catering',
        allocatedAmount: 400000,
      });

      const categoryId = categoryResponse.body.data.id as string;

      await createExpenseRequest(accessToken, eventId, {
        budgetCategoryId: categoryId,
        title: 'Planned catering expense',
        amount: 100000,
        status: ExpenseStatus.PLANNED,
      });

      await createExpenseRequest(accessToken, eventId, {
        budgetCategoryId: categoryId,
        title: 'Paid catering expense',
        amount: 50000,
        status: ExpenseStatus.PAID,
        expenseDate: '2030-04-01T09:00:00.000Z',
      });

      await createExpenseRequest(accessToken, eventId, {
        budgetCategoryId: categoryId,
        title: 'Cancelled catering expense',
        amount: 999000,
        status: ExpenseStatus.CANCELLED,
      });

      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: {
          userId: vendorUserId,
        },
        select: {
          id: true,
        },
      });

      expect(vendorProfile).not.toBeNull();

      const quotationRequest = await prisma.quotationRequest.create({
        data: {
          eventId,
          vendorId: vendorProfile!.id,
          requirements: 'Provide full catering service.',
        },
      });

      const quotation = await prisma.quotation.create({
        data: {
          quotationRequestId: quotationRequest.id,
          version: 1,
          proposedPrice: new Prisma.Decimal(300000),
          depositAmount: new Prisma.Decimal(120000),
          inclusions: 'Food, service staff, and equipment.',
        },
      });

      const booking = await prisma.booking.create({
        data: {
          eventId,
          vendorId: vendorProfile!.id,
          acceptedQuotationId: quotation.id,
          agreedCost: new Prisma.Decimal(300000),
          serviceStart: new Date('2030-08-20T09:00:00.000Z'),
          status: BookingStatus.CONFIRMED,
        },
      });

      const paymentMethod = Object.values(PaymentMethod)[0]!;

      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          submittedById: customerId,
          amount: new Prisma.Decimal(120000),
          status: PaymentStatus.VERIFIED,
          method: paymentMethod,
          referenceNumber: 'BUDGET-VERIFIED-001',
          reviewedAt: new Date(),
        },
      });

      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          submittedById: customerId,
          amount: new Prisma.Decimal(30000),
          status: PaymentStatus.REJECTED,
          method: paymentMethod,
          referenceNumber: 'BUDGET-REJECTED-001',
          rejectionReason: 'Invalid transaction reference.',
          reviewedAt: new Date(),
        },
      });

      const response = await request(app)
        .get(`/api/v1/budgets/events/${eventId}/summary`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.event).toMatchObject({
        id: eventId,
        name: 'Maya and Arjun Wedding',
        status: 'DRAFT',
      });

      expect(response.body.data.summary).toMatchObject({
        plannedBudget: '1000000.00',
        totalAllocated: '400000.00',
        unallocatedBudget: '600000.00',

        bookingCommittedCost: '300000.00',
        verifiedVendorPayments: '120000.00',
        plannedManualExpenses: '100000.00',
        paidManualExpenses: '50000.00',

        totalCommitted: '450000.00',
        totalPaid: '170000.00',
        outstandingCommitted: '280000.00',

        remainingBudget: '550000.00',
        isOverBudget: false,
        overBudgetAmount: '0.00',
      });

      expect(response.body.data.counts).toMatchObject({
        budgetCategories: 1,
        committedBookings: 1,
        verifiedVendorPayments: 1,
        plannedExpenses: 1,
        paidExpenses: 1,
        cancelledExpenses: 1,
      });

      expect(response.body.data.categoryBreakdown).toHaveLength(1);

      expect(response.body.data.categoryBreakdown[0]).toMatchObject({
        id: categoryId,
        name: 'Catering',
        allocatedAmount: '400000.00',
        plannedExpenses: '100000.00',
        paidExpenses: '50000.00',
        totalExpenses: '150000.00',
        remainingAmount: '250000.00',
        isOverAllocated: false,
        overAllocatedAmount: '0.00',
      });
    });

    it('detects when committed costs exceed the planned budget', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken, {
        plannedBudget: 100000,
      });

      await createExpenseRequest(accessToken, eventResponse.body.data.id, {
        title: 'Large planned expense',
        amount: 150000,
        status: ExpenseStatus.PLANNED,
      });

      const response = await request(app)
        .get(`/api/v1/budgets/events/${eventResponse.body.data.id}/summary`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      expect(response.body.data.summary).toMatchObject({
        plannedBudget: '100000.00',
        plannedManualExpenses: '150000.00',
        totalCommitted: '150000.00',
        remainingBudget: '-50000.00',
        isOverBudget: true,
        overBudgetAmount: '50000.00',
      });
    });

    it('excludes cancelled and rejected bookings from committed cost', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      const vendorRegistration = await registerVendor();

      const accessToken = customerRegistration.body.data.accessToken as string;

      const vendorUserId = vendorRegistration.body.data.user.id as string;

      const eventResponse = await createEventRequest(accessToken);

      const eventId = eventResponse.body.data.id as string;

      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: {
          userId: vendorUserId,
        },
        select: {
          id: true,
        },
      });

      expect(vendorProfile).not.toBeNull();

      const createBookingWithStatus = async (
        version: number,
        status: BookingStatus,
        amount: number,
      ) => {
        const quotationRequest = await prisma.quotationRequest.create({
          data: {
            eventId,
            vendorId: vendorProfile!.id,
            requirements: `Booking requirement ${version}`,
          },
        });

        const quotation = await prisma.quotation.create({
          data: {
            quotationRequestId: quotationRequest.id,
            version,
            proposedPrice: new Prisma.Decimal(amount),
            inclusions: `Services for booking ${version}`,
          },
        });

        return prisma.booking.create({
          data: {
            eventId,
            vendorId: vendorProfile!.id,
            acceptedQuotationId: quotation.id,
            agreedCost: new Prisma.Decimal(amount),
            serviceStart: new Date(`2030-08-${20 + version}T09:00:00.000Z`),
            status,
          },
        });
      };

      await createBookingWithStatus(1, BookingStatus.CANCELLED, 300000);

      await createBookingWithStatus(2, BookingStatus.REJECTED, 200000);

      await createBookingWithStatus(3, BookingStatus.ACTIVE, 150000);

      const response = await request(app)
        .get(`/api/v1/budgets/events/${eventId}/summary`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      expect(response.body.data.summary).toMatchObject({
        bookingCommittedCost: '150000.00',
        totalCommitted: '150000.00',
      });

      expect(response.body.data.counts.committedBookings).toBe(1);
    });
  });
});
