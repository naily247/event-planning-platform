import { NotificationType } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const customerEmail = 'notification-customer@example.com';
const secondCustomerEmail = 'notification-second-customer@example.com';

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

const testEmails = [customerEmail, secondCustomerEmail];

const registerCustomer = async (payload: typeof customerPayload | typeof secondCustomerPayload) => {
  return request(app).post('/api/v1/auth/register/customer').send(payload);
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

describe('Notification API', () => {
  describe('GET /api/v1/notifications', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app).get('/api/v1/notifications');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns only notifications belonging to the authenticated user', async () => {
      const firstRegistration = await registerCustomer(customerPayload);

      const secondRegistration = await registerCustomer(secondCustomerPayload);

      const firstUserId = firstRegistration.body.data.user.id as string;
      const secondUserId = secondRegistration.body.data.user.id as string;

      await prisma.notification.createMany({
        data: [
          {
            recipientId: firstUserId,
            type: NotificationType.BOOKING_CREATED,
            title: 'Booking created',
            message: 'Your booking request was created.',
            entityType: 'booking',
            entityId: 'booking-one',
          },
          {
            recipientId: firstUserId,
            type: NotificationType.PAYMENT_VERIFIED,
            title: 'Payment verified',
            message: 'Your deposit payment was verified.',
            entityType: 'payment',
            entityId: 'payment-one',
          },
          {
            recipientId: secondUserId,
            type: NotificationType.SYSTEM,
            title: 'Second user notification',
            message: 'This notification belongs to another user.',
          },
        ],
      });

      const response = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${firstRegistration.body.data.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            recipientId: firstUserId,
            type: NotificationType.BOOKING_CREATED,
            isRead: false,
          }),
          expect.objectContaining({
            recipientId: firstUserId,
            type: NotificationType.PAYMENT_VERIFIED,
            isRead: false,
          }),
        ]),
      );

      expect(
        response.body.data.every(
          (notification: { recipientId: string }) => notification.recipientId === firstUserId,
        ),
      ).toBe(true);

      expect(response.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('filters notifications by read status and notification type', async () => {
      const registration = await registerCustomer(customerPayload);

      const userId = registration.body.data.user.id as string;

      await prisma.notification.createMany({
        data: [
          {
            recipientId: userId,
            type: NotificationType.BOOKING_CREATED,
            title: 'Unread booking',
            message: 'Unread booking notification.',
            isRead: false,
          },
          {
            recipientId: userId,
            type: NotificationType.BOOKING_CREATED,
            title: 'Read booking',
            message: 'Read booking notification.',
            isRead: true,
            readAt: new Date(),
          },
          {
            recipientId: userId,
            type: NotificationType.PAYMENT_VERIFIED,
            title: 'Unread payment',
            message: 'Unread payment notification.',
            isRead: false,
          },
        ],
      });

      const response = await request(app)
        .get(`/api/v1/notifications?status=unread&type=${NotificationType.BOOKING_CREATED}`)
        .set('Authorization', `Bearer ${registration.body.data.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);

      expect(response.body.data[0]).toMatchObject({
        type: NotificationType.BOOKING_CREATED,
        title: 'Unread booking',
        isRead: false,
      });
    });

    it('supports pagination and oldest-first sorting', async () => {
      const registration = await registerCustomer(customerPayload);

      const userId = registration.body.data.user.id as string;

      await prisma.notification.create({
        data: {
          recipientId: userId,
          type: NotificationType.SYSTEM,
          title: 'Older notification',
          message: 'This notification was created first.',
          createdAt: new Date('2030-01-01T00:00:00.000Z'),
        },
      });

      await prisma.notification.create({
        data: {
          recipientId: userId,
          type: NotificationType.SYSTEM,
          title: 'Newer notification',
          message: 'This notification was created second.',
          createdAt: new Date('2030-01-02T00:00:00.000Z'),
        },
      });

      const response = await request(app)
        .get('/api/v1/notifications?page=1&limit=1&sort=oldest')
        .set('Authorization', `Bearer ${registration.body.data.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Older notification');

      expect(response.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 1,
        total: 2,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('rejects invalid notification query parameters', async () => {
      const registration = await registerCustomer(customerPayload);

      const response = await request(app)
        .get('/api/v1/notifications?page=0&limit=100&sort=invalid')
        .set('Authorization', `Bearer ${registration.body.data.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/notifications/unread-count', () => {
    it('returns the authenticated user unread notification count', async () => {
      const registration = await registerCustomer(customerPayload);

      const userId = registration.body.data.user.id as string;

      await prisma.notification.createMany({
        data: [
          {
            recipientId: userId,
            type: NotificationType.SYSTEM,
            title: 'Unread one',
            message: 'First unread notification.',
          },
          {
            recipientId: userId,
            type: NotificationType.SYSTEM,
            title: 'Unread two',
            message: 'Second unread notification.',
          },
          {
            recipientId: userId,
            type: NotificationType.SYSTEM,
            title: 'Already read',
            message: 'This notification is already read.',
            isRead: true,
            readAt: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${registration.body.data.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.unreadCount).toBe(2);
    });
  });

  describe('PATCH /api/v1/notifications/:notificationId/read', () => {
    it('marks an owned notification as read', async () => {
      const registration = await registerCustomer(customerPayload);

      const userId = registration.body.data.user.id as string;

      const notification = await prisma.notification.create({
        data: {
          recipientId: userId,
          type: NotificationType.BOOKING_CONFIRMED,
          title: 'Booking confirmed',
          message: 'The vendor confirmed your booking.',
        },
      });

      const response = await request(app)
        .patch(`/api/v1/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${registration.body.data.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: notification.id,
        isRead: true,
      });

      expect(response.body.data.readAt).toEqual(expect.any(String));
      expect(response.body.message).toBe('Notification marked as read');
    });

    it('does not allow a user to read another user notification', async () => {
      const firstRegistration = await registerCustomer(customerPayload);

      const secondRegistration = await registerCustomer(secondCustomerPayload);

      const secondUserId = secondRegistration.body.data.user.id as string;

      const notification = await prisma.notification.create({
        data: {
          recipientId: secondUserId,
          type: NotificationType.SYSTEM,
          title: 'Private notification',
          message: 'This notification belongs to the second customer.',
        },
      });

      const response = await request(app)
        .patch(`/api/v1/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${firstRegistration.body.data.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOTIFICATION_NOT_FOUND');
    });

    it('returns not found for an unknown notification', async () => {
      const registration = await registerCustomer(customerPayload);

      const response = await request(app)
        .patch('/api/v1/notifications/cly0000000000000000000000/read')
        .set('Authorization', `Bearer ${registration.body.data.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOTIFICATION_NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/notifications/read-all', () => {
    it('marks all unread notifications belonging to the user as read', async () => {
      const firstRegistration = await registerCustomer(customerPayload);

      const secondRegistration = await registerCustomer(secondCustomerPayload);

      const firstUserId = firstRegistration.body.data.user.id as string;
      const secondUserId = secondRegistration.body.data.user.id as string;

      await prisma.notification.createMany({
        data: [
          {
            recipientId: firstUserId,
            type: NotificationType.SYSTEM,
            title: 'First unread',
            message: 'First unread notification.',
          },
          {
            recipientId: firstUserId,
            type: NotificationType.SYSTEM,
            title: 'Second unread',
            message: 'Second unread notification.',
          },
          {
            recipientId: firstUserId,
            type: NotificationType.SYSTEM,
            title: 'Already read',
            message: 'Already read notification.',
            isRead: true,
            readAt: new Date(),
          },
          {
            recipientId: secondUserId,
            type: NotificationType.SYSTEM,
            title: 'Other user unread',
            message: 'This notification must remain unread.',
          },
        ],
      });

      const response = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${firstRegistration.body.data.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.updatedCount).toBe(2);
      expect(response.body.message).toBe('All notifications marked as read');

      const firstUserUnreadCount = await prisma.notification.count({
        where: {
          recipientId: firstUserId,
          isRead: false,
        },
      });

      const secondUserUnreadCount = await prisma.notification.count({
        where: {
          recipientId: secondUserId,
          isRead: false,
        },
      });

      expect(firstUserUnreadCount).toBe(0);
      expect(secondUserUnreadCount).toBe(1);
    });
  });
});
