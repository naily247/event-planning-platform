import { EventTaskPriority, EventTaskStatus } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();
const customerEmail = 'event-task-customer@example.com';
const secondCustomerEmail = 'event-task-second-customer@example.com';
const vendorEmail = 'event-task-vendor@example.com';

const customerPayload = {
  email: customerEmail,
  password: 'Customer@2026',
  firstName: 'Task',
  lastName: 'Customer',
};

const secondCustomerPayload = {
  email: secondCustomerEmail,
  password: 'Customer@2026',
  firstName: 'Second',
  lastName: 'Customer',
};

const vendorPayload = {
  email: vendorEmail,
  password: 'Vendor@2026',
  firstName: 'Task',
  lastName: 'Vendor',
  businessName: 'Event Task Test Vendor',
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

const createEventTaskRequest = (
  accessToken: string,
  eventId: string,
  overrides: Record<string, unknown> = {},
) => {
  return request(app)
    .post(`/api/v1/event-tasks/events/${eventId}/tasks`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      title: 'Confirm wedding venue',
      description: 'Contact the venue and confirm the reservation.',
      priority: EventTaskPriority.HIGH,
      dueDate: '2030-04-15T09:00:00.000Z',
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

describe('Event task and timeline management API', () => {
  describe('Event task route access control', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app).get(
        '/api/v1/event-tasks/events/clx0000000000000000000000/summary',
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated vendors', async () => {
      const vendorRegistration = await registerVendor();

      const response = await request(app)
        .get('/api/v1/event-tasks/events/clx0000000000000000000000/summary')
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
        .get(`/api/v1/event-tasks/events/${eventResponse.body.data.id}/summary`)
        .set('Authorization', `Bearer ${secondRegistration.body.data.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_NOT_FOUND');
    });

    it('hides another customer task', async () => {
      const firstRegistration = await registerCustomer(customerPayload);

      const secondRegistration = await registerCustomer(secondCustomerPayload);

      const firstAccessToken = firstRegistration.body.data.accessToken as string;

      const secondAccessToken = secondRegistration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(firstAccessToken);

      const taskResponse = await createEventTaskRequest(
        firstAccessToken,
        eventResponse.body.data.id,
      );

      const response = await request(app)
        .get(
          `/api/v1/event-tasks/events/${eventResponse.body.data.id}/tasks/${taskResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${secondAccessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_TASK_NOT_FOUND');
    });
  });

  describe('Creating event tasks', () => {
    it('creates a task for an owned event', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createEventTaskRequest(accessToken, eventResponse.body.data.id);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Event task created successfully');

      expect(response.body.data).toMatchObject({
        eventId: eventResponse.body.data.id,
        title: 'Confirm wedding venue',
        description: 'Contact the venue and confirm the reservation.',
        status: EventTaskStatus.TODO,
        priority: EventTaskPriority.HIGH,
        dueDate: '2030-04-15T09:00:00.000Z',
        completedAt: null,
        isOverdue: false,
        isDueSoon: false,
      });

      expect(response.body.data.id).toEqual(expect.any(String));

      expect(response.body.data.createdAt).toEqual(expect.any(String));

      expect(response.body.data.updatedAt).toEqual(expect.any(String));
    });

    it('uses the default status and priority', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createEventTaskRequest(accessToken, eventResponse.body.data.id, {
        title: 'Prepare guest list',
        priority: undefined,
      });

      expect(response.status).toBe(201);

      expect(response.body.data).toMatchObject({
        title: 'Prepare guest list',
        status: EventTaskStatus.TODO,
        priority: EventTaskPriority.MEDIUM,
      });
    });

    it('sets completedAt when a task is created as completed', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createEventTaskRequest(accessToken, eventResponse.body.data.id, {
        title: 'Create initial event plan',
        status: EventTaskStatus.COMPLETED,
      });

      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe(EventTaskStatus.COMPLETED);

      expect(response.body.data.completedAt).toEqual(expect.any(String));

      expect(response.body.data.isOverdue).toBe(false);
      expect(response.body.data.isDueSoon).toBe(false);
    });

    it('rejects an invalid task request body', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createEventTaskRequest(accessToken, eventResponse.body.data.id, {
        title: 'A',
        priority: 'CRITICAL',
        dueDate: 'not-a-date',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Listing and filtering event tasks', () => {
    it('lists tasks with pagination', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const eventId = eventResponse.body.data.id as string;

      await createEventTaskRequest(accessToken, eventId, {
        title: 'First task',
      });

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Second task',
      });

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Third task',
      });

      const response = await request(app)
        .get(`/api/v1/event-tasks/events/${eventId}/tasks?page=1&limit=2&sort=newest`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('filters tasks by status and priority', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const eventId = eventResponse.body.data.id as string;

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Urgent active task',
        status: EventTaskStatus.IN_PROGRESS,
        priority: EventTaskPriority.URGENT,
      });

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Low priority task',
        status: EventTaskStatus.TODO,
        priority: EventTaskPriority.LOW,
      });

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Completed urgent task',
        status: EventTaskStatus.COMPLETED,
        priority: EventTaskPriority.URGENT,
      });

      const response = await request(app)
        .get(`/api/v1/event-tasks/events/${eventId}/tasks?status=IN_PROGRESS&priority=URGENT`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);

      expect(response.body.data[0]).toMatchObject({
        title: 'Urgent active task',
        status: EventTaskStatus.IN_PROGRESS,
        priority: EventTaskPriority.URGENT,
      });
    });

    it('filters overdue tasks', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const eventId = eventResponse.body.data.id as string;

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Overdue unfinished task',
        dueDate: '2025-01-01T09:00:00.000Z',
      });

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Completed old task',
        dueDate: '2025-01-01T09:00:00.000Z',
        status: EventTaskStatus.COMPLETED,
      });

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Future task',
        dueDate: '2030-06-01T09:00:00.000Z',
      });

      const response = await request(app)
        .get(`/api/v1/event-tasks/events/${eventId}/tasks?overdue=overdue`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);

      expect(response.body.data[0]).toMatchObject({
        title: 'Overdue unfinished task',
        isOverdue: true,
      });
    });

    it('filters tasks that are not overdue', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const eventId = eventResponse.body.data.id as string;

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Old unfinished task',
        dueDate: '2025-01-01T09:00:00.000Z',
      });

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Task without deadline',
        dueDate: null,
      });

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Completed old task',
        dueDate: '2025-01-01T09:00:00.000Z',
        status: EventTaskStatus.COMPLETED,
      });

      const response = await request(app)
        .get(`/api/v1/event-tasks/events/${eventId}/tasks?overdue=not_overdue`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);

      expect(response.body.data.map((task: { title: string }) => task.title)).toEqual(
        expect.arrayContaining(['Task without deadline', 'Completed old task']),
      );
    });

    it('sorts tasks by due date', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const eventId = eventResponse.body.data.id as string;

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Later task',
        dueDate: '2030-07-01T09:00:00.000Z',
      });

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Earlier task',
        dueDate: '2030-03-01T09:00:00.000Z',
      });

      await createEventTaskRequest(accessToken, eventId, {
        title: 'No deadline task',
        dueDate: null,
      });

      const response = await request(app)
        .get(`/api/v1/event-tasks/events/${eventId}/tasks?sort=due_soon`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);

      expect(response.body.data[0].title).toBe('Earlier task');

      expect(response.body.data[1].title).toBe('Later task');

      expect(response.body.data[2].title).toBe('No deadline task');
    });

    it('sorts tasks by priority', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const eventId = eventResponse.body.data.id as string;

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Low priority task',
        priority: EventTaskPriority.LOW,
      });

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Urgent priority task',
        priority: EventTaskPriority.URGENT,
      });

      await createEventTaskRequest(accessToken, eventId, {
        title: 'High priority task',
        priority: EventTaskPriority.HIGH,
      });

      const response = await request(app)
        .get(`/api/v1/event-tasks/events/${eventId}/tasks?sort=priority_highest`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      expect(
        response.body.data.map((task: { priority: EventTaskPriority }) => task.priority),
      ).toEqual([EventTaskPriority.URGENT, EventTaskPriority.HIGH, EventTaskPriority.LOW]);
    });

    it('rejects invalid task query parameters', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await request(app)
        .get(
          `/api/v1/event-tasks/events/${eventResponse.body.data.id}/tasks?status=INVALID&priority=CRITICAL&page=0&sort=wrong`,
        )
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Getting and updating event tasks', () => {
    it('gets an owned task by ID', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const taskResponse = await createEventTaskRequest(accessToken, eventResponse.body.data.id);

      const response = await request(app)
        .get(
          `/api/v1/event-tasks/events/${eventResponse.body.data.id}/tasks/${taskResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(taskResponse.body.data.id);
    });

    it('updates task details', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const taskResponse = await createEventTaskRequest(accessToken, eventResponse.body.data.id);

      const response = await request(app)
        .patch(
          `/api/v1/event-tasks/events/${eventResponse.body.data.id}/tasks/${taskResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Confirm venue and make deposit',
          description: 'Confirm availability and pay the venue deposit.',
          priority: EventTaskPriority.URGENT,
          dueDate: '2030-03-15T09:00:00.000Z',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.message).toBe('Event task updated successfully');

      expect(response.body.data).toMatchObject({
        title: 'Confirm venue and make deposit',
        description: 'Confirm availability and pay the venue deposit.',
        priority: EventTaskPriority.URGENT,
        dueDate: '2030-03-15T09:00:00.000Z',
      });
    });

    it('removes optional task fields using null', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const taskResponse = await createEventTaskRequest(accessToken, eventResponse.body.data.id);

      const response = await request(app)
        .patch(
          `/api/v1/event-tasks/events/${eventResponse.body.data.id}/tasks/${taskResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: null,
          dueDate: null,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBeNull();
      expect(response.body.data.dueDate).toBeNull();
      expect(response.body.data.isOverdue).toBe(false);
      expect(response.body.data.isDueSoon).toBe(false);
    });

    it('rejects an empty task update', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const taskResponse = await createEventTaskRequest(accessToken, eventResponse.body.data.id);

      const response = await request(app)
        .patch(
          `/api/v1/event-tasks/events/${eventResponse.body.data.id}/tasks/${taskResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Event task status management', () => {
    it('marks a task as completed and sets completedAt', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const taskResponse = await createEventTaskRequest(accessToken, eventResponse.body.data.id, {
        dueDate: '2025-01-01T09:00:00.000Z',
      });

      const response = await request(app)
        .patch(
          `/api/v1/event-tasks/events/${eventResponse.body.data.id}/tasks/${taskResponse.body.data.id}/status`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: EventTaskStatus.COMPLETED,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.message).toBe('Event task status updated successfully');

      expect(response.body.data.status).toBe(EventTaskStatus.COMPLETED);

      expect(response.body.data.completedAt).toEqual(expect.any(String));

      expect(response.body.data.isOverdue).toBe(false);

      const storedTask = await prisma.eventTask.findUnique({
        where: {
          id: taskResponse.body.data.id,
        },
      });

      expect(storedTask?.completedAt).not.toBeNull();
    });

    it('clears completedAt when a completed task is reopened', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const taskResponse = await createEventTaskRequest(accessToken, eventResponse.body.data.id, {
        status: EventTaskStatus.COMPLETED,
      });

      const response = await request(app)
        .patch(
          `/api/v1/event-tasks/events/${eventResponse.body.data.id}/tasks/${taskResponse.body.data.id}/status`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: EventTaskStatus.IN_PROGRESS,
        });

      expect(response.status).toBe(200);

      expect(response.body.data.status).toBe(EventTaskStatus.IN_PROGRESS);

      expect(response.body.data.completedAt).toBeNull();

      const storedTask = await prisma.eventTask.findUnique({
        where: {
          id: taskResponse.body.data.id,
        },
      });

      expect(storedTask?.completedAt).toBeNull();
    });

    it('does not classify a cancelled task as overdue', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const taskResponse = await createEventTaskRequest(accessToken, eventResponse.body.data.id, {
        dueDate: '2025-01-01T09:00:00.000Z',
      });

      const response = await request(app)
        .patch(
          `/api/v1/event-tasks/events/${eventResponse.body.data.id}/tasks/${taskResponse.body.data.id}/status`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: EventTaskStatus.CANCELLED,
        });

      expect(response.status).toBe(200);

      expect(response.body.data).toMatchObject({
        status: EventTaskStatus.CANCELLED,
        completedAt: null,
        isOverdue: false,
        isDueSoon: false,
      });
    });

    it('rejects an unchanged status', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const taskResponse = await createEventTaskRequest(accessToken, eventResponse.body.data.id);

      const response = await request(app)
        .patch(
          `/api/v1/event-tasks/events/${eventResponse.body.data.id}/tasks/${taskResponse.body.data.id}/status`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: EventTaskStatus.TODO,
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);

      expect(response.body.error.code).toBe('EVENT_TASK_STATUS_UNCHANGED');
    });
  });

  describe('Deleting event tasks', () => {
    it('deletes an owned task', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const taskResponse = await createEventTaskRequest(accessToken, eventResponse.body.data.id);

      const response = await request(app)
        .delete(
          `/api/v1/event-tasks/events/${eventResponse.body.data.id}/tasks/${taskResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(204);

      const deletedTask = await prisma.eventTask.findUnique({
        where: {
          id: taskResponse.body.data.id,
        },
      });

      expect(deletedTask).toBeNull();
    });

    it('deletes tasks automatically when their event is deleted', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const taskResponse = await createEventTaskRequest(accessToken, eventResponse.body.data.id);

      const deleteEventResponse = await request(app)
        .delete(`/api/v1/events/${eventResponse.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(deleteEventResponse.status).toBe(204);

      const task = await prisma.eventTask.findUnique({
        where: {
          id: taskResponse.body.data.id,
        },
      });

      expect(task).toBeNull();
    });
  });

  describe('Event task summary', () => {
    it('returns zero totals when an event has no tasks', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await request(app)
        .get(`/api/v1/event-tasks/events/${eventResponse.body.data.id}/summary`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.event).toMatchObject({
        id: eventResponse.body.data.id,
        name: 'Maya and Arjun Wedding',
        status: 'DRAFT',
      });

      expect(response.body.data.summary).toEqual({
        total: 0,
        todo: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        overdue: 0,
        dueSoon: 0,
        activeTaskTotal: 0,
        completionPercentage: 0,
      });
    });

    it('calculates task status and completion totals', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const eventId = eventResponse.body.data.id as string;

      const dueSoonDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Overdue todo task',
        status: EventTaskStatus.TODO,
        dueDate: '2025-01-01T09:00:00.000Z',
      });

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Due soon in-progress task',
        status: EventTaskStatus.IN_PROGRESS,
        dueDate: dueSoonDate,
      });

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Completed task one',
        status: EventTaskStatus.COMPLETED,
        dueDate: '2025-01-01T09:00:00.000Z',
      });

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Completed task two',
        status: EventTaskStatus.COMPLETED,
        dueDate: null,
      });

      await createEventTaskRequest(accessToken, eventId, {
        title: 'Cancelled task',
        status: EventTaskStatus.CANCELLED,
        dueDate: '2025-01-01T09:00:00.000Z',
      });

      const response = await request(app)
        .get(`/api/v1/event-tasks/events/${eventId}/summary`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.summary).toEqual({
        total: 5,
        todo: 1,
        inProgress: 1,
        completed: 2,
        cancelled: 1,
        overdue: 1,
        dueSoon: 1,
        activeTaskTotal: 4,
        completionPercentage: 50,
      });
    });
  });
});
