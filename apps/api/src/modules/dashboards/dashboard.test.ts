import {
  BookingStatus,
  EventStatus,
  EventTaskPriority,
  EventTaskStatus,
  GuestStatus,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  QuotationRequestStatus,
  QuotationStatus,
  VendorVerificationStatus,
} from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const customerEmail = 'dashboard-customer@example.com';
const secondCustomerEmail = 'dashboard-second-customer@example.com';
const vendorEmail = 'dashboard-vendor@example.com';
const secondVendorEmail = 'dashboard-second-vendor@example.com';

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
  firstName: 'Lahiru',
  lastName: 'Perera',
  businessName: 'Dashboard Vendor Studio',
  phone: {
    country: 'LK',
    number: '0771112222',
  },
};

const secondVendorPayload = {
  email: secondVendorEmail,
  password: 'Vendor@2026',
  firstName: 'Kasun',
  lastName: 'Silva',
  businessName: 'Other Dashboard Vendor',
  phone: {
    country: 'LK',
    number: '0773334444',
  },
};

const testEmails = [customerEmail, secondCustomerEmail, vendorEmail, secondVendorEmail];

const registerCustomer = async (payload: typeof customerPayload | typeof secondCustomerPayload) => {
  return request(app).post('/api/v1/auth/register/customer').send(payload);
};

const registerVendor = async (
  payload: typeof vendorPayload | typeof secondVendorPayload = vendorPayload,
) => {
  return request(app).post('/api/v1/auth/register/vendor').send(payload);
};

const getCustomerDashboardRequest = (accessToken?: string, query = '') => {
  const requestBuilder = request(app).get(`/api/v1/dashboard/customer${query}`);

  if (accessToken) {
    requestBuilder.set('Authorization', `Bearer ${accessToken}`);
  }

  return requestBuilder;
};

const getVendorDashboardRequest = (accessToken?: string, query = '') => {
  const requestBuilder = request(app).get(`/api/v1/dashboard/vendor${query}`);

  if (accessToken) {
    requestBuilder.set('Authorization', `Bearer ${accessToken}`);
  }

  return requestBuilder;
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
            vendor: {
              user: {
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

  await prisma.servicePackage.deleteMany({
    where: {
      vendor: {
        user: {
          email: {
            in: testEmails,
          },
        },
      },
    },
  });

  await prisma.eventTask.deleteMany({
    where: {
      event: {
        owner: {
          email: {
            in: testEmails,
          },
        },
      },
    },
  });

  await prisma.guest.deleteMany({
    where: {
      event: {
        owner: {
          email: {
            in: testEmails,
          },
        },
      },
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

  await prisma.vendorProfile.deleteMany({
    where: {
      user: {
        email: {
          in: testEmails,
        },
      },
    },
  });

  await prisma.customerProfile.deleteMany({
    where: {
      user: {
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

describe('Dashboard API', () => {
  describe('GET /api/v1/dashboard/customer', () => {
    it('rejects requests without authentication', async () => {
      const response = await getCustomerDashboardRequest();

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects non-customer users', async () => {
      const registration = await registerVendor();

      const response = await getCustomerDashboardRequest(registration.body.data.accessToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects invalid dashboard query parameters', async () => {
      const registration = await registerCustomer(customerPayload);

      const response = await getCustomerDashboardRequest(
        registration.body.data.accessToken,
        '?recentLimit=100',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns the authenticated customer dashboard summary only for their own data', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const secondCustomerRegistration = await registerCustomer(secondCustomerPayload);
      const vendorRegistration = await registerVendor();

      const customerId = customerRegistration.body.data.user.id as string;
      const secondCustomerId = secondCustomerRegistration.body.data.user.id as string;
      const vendorUserId = vendorRegistration.body.data.user.id as string;

      const vendor = await prisma.vendorProfile.update({
        where: {
          userId: vendorUserId,
        },
        data: {
          verificationStatus: VendorVerificationStatus.APPROVED,
          reviewedAt: new Date('2030-01-01T00:00:00.000Z'),
        },
      });

      const upcomingEvent = await prisma.event.create({
        data: {
          ownerId: customerId,
          name: 'Maya Wedding',
          eventType: 'Wedding',
          eventDate: new Date('2030-08-20T10:00:00.000Z'),
          location: 'Colombo',
          guestCount: 150,
          plannedBudget: new Prisma.Decimal('500000.00'),
          status: EventStatus.PLANNING,
          createdAt: new Date('2030-01-01T00:00:00.000Z'),
        },
      });

      await prisma.event.create({
        data: {
          ownerId: customerId,
          name: 'Completed Birthday',
          eventType: 'Birthday',
          eventDate: new Date('2029-02-10T10:00:00.000Z'),
          location: 'Kandy',
          guestCount: 50,
          plannedBudget: new Prisma.Decimal('120000.00'),
          status: EventStatus.COMPLETED,
          createdAt: new Date('2030-01-02T00:00:00.000Z'),
        },
      });

      await prisma.event.create({
        data: {
          ownerId: secondCustomerId,
          name: 'Other Customer Event',
          eventType: 'Engagement',
          eventDate: new Date('2030-09-10T10:00:00.000Z'),
          location: 'Galle',
          status: EventStatus.ACTIVE,
        },
      });

      await prisma.eventTask.createMany({
        data: [
          {
            eventId: upcomingEvent.id,
            title: 'Book florist',
            status: EventTaskStatus.TODO,
            priority: EventTaskPriority.HIGH,
            dueDate: new Date('2030-07-01T00:00:00.000Z'),
            createdAt: new Date('2030-01-03T00:00:00.000Z'),
          },
          {
            eventId: upcomingEvent.id,
            title: 'Confirm menu',
            status: EventTaskStatus.IN_PROGRESS,
            priority: EventTaskPriority.URGENT,
            dueDate: new Date('2030-06-01T00:00:00.000Z'),
            createdAt: new Date('2030-01-04T00:00:00.000Z'),
          },
          {
            eventId: upcomingEvent.id,
            title: 'Completed checklist item',
            status: EventTaskStatus.COMPLETED,
            priority: EventTaskPriority.MEDIUM,
            completedAt: new Date('2030-01-05T00:00:00.000Z'),
            createdAt: new Date('2030-01-05T00:00:00.000Z'),
          },
        ],
      });

      await prisma.guest.createMany({
        data: [
          {
            eventId: upcomingEvent.id,
            firstName: 'Asha',
            lastName: 'Silva',
            email: 'asha.dashboard@example.com',
            status: GuestStatus.CONFIRMED,
            partySize: 2,
          },
          {
            eventId: upcomingEvent.id,
            firstName: 'Ravi',
            lastName: 'Perera',
            email: 'ravi.dashboard@example.com',
            status: GuestStatus.INVITED,
            partySize: 1,
          },
        ],
      });

      const quotationRequest = await prisma.quotationRequest.create({
        data: {
          eventId: upcomingEvent.id,
          vendorId: vendor.id,
          requirements: 'Need photography coverage for the wedding.',
          status: QuotationRequestStatus.ACCEPTED,
        },
      });

      const quotation = await prisma.quotation.create({
        data: {
          quotationRequestId: quotationRequest.id,
          version: 1,
          status: QuotationStatus.ACCEPTED,
          proposedPrice: new Prisma.Decimal('150000.00'),
          depositAmount: new Prisma.Decimal('50000.00'),
          inclusions: 'Full day photography coverage.',
        },
      });

      const booking = await prisma.booking.create({
        data: {
          eventId: upcomingEvent.id,
          vendorId: vendor.id,
          acceptedQuotationId: quotation.id,
          agreedCost: new Prisma.Decimal('150000.00'),
          serviceStart: new Date('2030-08-20T08:00:00.000Z'),
          serviceEnd: new Date('2030-08-20T18:00:00.000Z'),
          status: BookingStatus.CONFIRMED,
        },
      });

      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          submittedById: customerId,
          amount: new Prisma.Decimal('50000.00'),
          status: PaymentStatus.PENDING,
          method: PaymentMethod.BANK_TRANSFER,
          referenceNumber: 'DASHBOARD-PENDING-001',
        },
      });

      await prisma.notification.createMany({
        data: [
          {
            recipientId: customerId,
            type: NotificationType.BOOKING_CONFIRMED,
            title: 'Booking confirmed',
            message: 'Your booking was confirmed.',
            entityType: 'booking',
            entityId: booking.id,
            createdAt: new Date('2030-01-06T00:00:00.000Z'),
          },
          {
            recipientId: customerId,
            type: NotificationType.PAYMENT_SUBMITTED,
            title: 'Payment submitted',
            message: 'Your payment is waiting for review.',
            entityType: 'payment',
            createdAt: new Date('2030-01-07T00:00:00.000Z'),
            isRead: true,
            readAt: new Date('2030-01-08T00:00:00.000Z'),
          },
          {
            recipientId: secondCustomerId,
            type: NotificationType.SYSTEM,
            title: 'Other customer notification',
            message: 'This should not appear in the first customer dashboard.',
          },
        ],
      });

      const response = await getCustomerDashboardRequest(
        customerRegistration.body.data.accessToken,
        '?recentLimit=2',
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        filters: {
          recentLimit: 2,
        },
        events: {
          total: 2,
          byStatus: {
            [EventStatus.PLANNING]: 1,
            [EventStatus.COMPLETED]: 1,
            [EventStatus.ACTIVE]: 0,
            [EventStatus.CANCELLED]: 0,
            [EventStatus.DRAFT]: 0,
          },
          upcomingEvent: expect.objectContaining({
            id: upcomingEvent.id,
            name: 'Maya Wedding',
            status: EventStatus.PLANNING,
          }),
        },
        bookings: {
          total: 1,
          byStatus: {
            [BookingStatus.CONFIRMED]: 1,
            [BookingStatus.ACTIVE]: 0,
            [BookingStatus.AWAITING_VENDOR_CONFIRMATION]: 0,
            [BookingStatus.CANCELLED]: 0,
            [BookingStatus.COMPLETED]: 0,
            [BookingStatus.DEPOSIT_PENDING]: 0,
            [BookingStatus.DISPUTED]: 0,
            [BookingStatus.REJECTED]: 0,
          },
        },
        payments: {
          pendingCount: 1,
        },
        notifications: {
          unreadCount: 1,
        },
        tasks: {
          byStatus: {
            [EventTaskStatus.TODO]: 1,
            [EventTaskStatus.IN_PROGRESS]: 1,
            [EventTaskStatus.COMPLETED]: 1,
            [EventTaskStatus.CANCELLED]: 0,
          },
        },
        guests: {
          total: 2,
          byStatus: {
            [GuestStatus.CONFIRMED]: 1,
            [GuestStatus.INVITED]: 1,
            [GuestStatus.DECLINED]: 0,
            [GuestStatus.MAYBE]: 0,
            [GuestStatus.NOT_INVITED]: 0,
          },
        },
      });

      expect(response.body.data.generatedAt).toEqual(expect.any(String));
      expect(response.body.data.events.recent).toHaveLength(2);
      expect(response.body.data.bookings.upcoming).toHaveLength(1);
      expect(response.body.data.bookings.upcoming[0]).toMatchObject({
        id: booking.id,
        status: BookingStatus.CONFIRMED,
        vendor: {
          id: vendor.id,
          businessName: 'Dashboard Vendor Studio',
        },
      });

      expect(response.body.data.notifications.recent).toHaveLength(2);
      expect(response.body.data.notifications.recent[0]).toMatchObject({
        title: 'Payment submitted',
        isRead: true,
      });

      expect(response.body.data.tasks.upcoming).toHaveLength(2);
      expect(response.body.data.tasks.upcoming[0]).toMatchObject({
        title: 'Confirm menu',
        status: EventTaskStatus.IN_PROGRESS,
      });

      expect(
        response.body.data.events.recent.every(
          (event: { name: string }) => event.name !== 'Other Customer Event',
        ),
      ).toBe(true);
    });
  });

  describe('GET /api/v1/dashboard/vendor', () => {
    it('rejects requests without authentication', async () => {
      const response = await getVendorDashboardRequest();

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects non-vendor users', async () => {
      const registration = await registerCustomer(customerPayload);

      const response = await getVendorDashboardRequest(registration.body.data.accessToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects invalid dashboard query parameters', async () => {
      const registration = await registerVendor();

      const response = await getVendorDashboardRequest(
        registration.body.data.accessToken,
        '?recentLimit=100',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns the authenticated vendor dashboard summary only for their own data', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const vendorRegistration = await registerVendor();
      const secondVendorRegistration = await registerVendor(secondVendorPayload);

      const customerId = customerRegistration.body.data.user.id as string;
      const vendorUserId = vendorRegistration.body.data.user.id as string;
      const secondVendorUserId = secondVendorRegistration.body.data.user.id as string;

      const vendor = await prisma.vendorProfile.update({
        where: {
          userId: vendorUserId,
        },
        data: {
          verificationStatus: VendorVerificationStatus.APPROVED,
          baseLocation: 'Colombo',
          serviceAreas: ['Colombo', 'Kandy'],
          submittedAt: new Date('2030-01-01T00:00:00.000Z'),
          reviewedAt: new Date('2030-01-02T00:00:00.000Z'),
        },
      });

      const secondVendor = await prisma.vendorProfile.update({
        where: {
          userId: secondVendorUserId,
        },
        data: {
          verificationStatus: VendorVerificationStatus.APPROVED,
          reviewedAt: new Date('2030-01-02T00:00:00.000Z'),
        },
      });

      const category = await prisma.serviceCategory.findUniqueOrThrow({
        where: {
          slug: 'photography',
        },
      });

      const activePackage = await prisma.servicePackage.create({
        data: {
          vendorId: vendor.id,
          categoryId: category.id,
          title: 'Wedding Photography Package',
          description: 'Full day photography coverage.',
          basePrice: new Prisma.Decimal('150000.00'),
          isActive: true,
          createdAt: new Date('2030-01-03T00:00:00.000Z'),
        },
      });

      await prisma.servicePackage.create({
        data: {
          vendorId: vendor.id,
          categoryId: category.id,
          title: 'Archived Photography Package',
          description: 'Old photography package.',
          basePrice: new Prisma.Decimal('90000.00'),
          isActive: false,
          createdAt: new Date('2030-01-04T00:00:00.000Z'),
        },
      });

      await prisma.servicePackage.create({
        data: {
          vendorId: secondVendor.id,
          categoryId: category.id,
          title: 'Other Vendor Package',
          basePrice: new Prisma.Decimal('250000.00'),
          isActive: true,
        },
      });

      const event = await prisma.event.create({
        data: {
          ownerId: customerId,
          name: 'Maya Wedding',
          eventType: 'Wedding',
          eventDate: new Date('2030-08-20T10:00:00.000Z'),
          location: 'Colombo',
          status: EventStatus.PLANNING,
        },
      });

      const quotationRequest = await prisma.quotationRequest.create({
        data: {
          eventId: event.id,
          vendorId: vendor.id,
          packageId: activePackage.id,
          requirements: 'Need premium wedding photography.',
          responseDueAt: new Date('2030-07-01T00:00:00.000Z'),
          status: QuotationRequestStatus.QUOTED,
          createdAt: new Date('2030-01-05T00:00:00.000Z'),
        },
      });

      await prisma.quotationRequest.create({
        data: {
          eventId: event.id,
          vendorId: vendor.id,
          requirements: 'Need a second quotation option.',
          status: QuotationRequestStatus.VIEWED,
          createdAt: new Date('2030-01-06T00:00:00.000Z'),
        },
      });

      await prisma.quotationRequest.create({
        data: {
          eventId: event.id,
          vendorId: secondVendor.id,
          requirements: 'Other vendor request.',
          status: QuotationRequestStatus.SENT,
        },
      });

      const quotation = await prisma.quotation.create({
        data: {
          quotationRequestId: quotationRequest.id,
          version: 1,
          status: QuotationStatus.ACCEPTED,
          proposedPrice: new Prisma.Decimal('150000.00'),
          depositAmount: new Prisma.Decimal('50000.00'),
          inclusions: 'Full day photography coverage.',
          createdAt: new Date('2030-01-07T00:00:00.000Z'),
        },
      });

      const booking = await prisma.booking.create({
        data: {
          eventId: event.id,
          vendorId: vendor.id,
          acceptedQuotationId: quotation.id,
          agreedCost: new Prisma.Decimal('150000.00'),
          serviceStart: new Date('2030-08-20T08:00:00.000Z'),
          serviceEnd: new Date('2030-08-20T18:00:00.000Z'),
          status: BookingStatus.CONFIRMED,
          vendorResponseNote: 'Confirmed for the full day.',
          vendorRespondedAt: new Date('2030-01-08T00:00:00.000Z'),
          createdAt: new Date('2030-01-08T00:00:00.000Z'),
        },
      });

      const secondQuotationRequest = await prisma.quotationRequest.create({
        data: {
          eventId: event.id,
          vendorId: secondVendor.id,
          requirements: 'Accepted by another vendor.',
          status: QuotationRequestStatus.ACCEPTED,
        },
      });

      const secondQuotation = await prisma.quotation.create({
        data: {
          quotationRequestId: secondQuotationRequest.id,
          version: 1,
          status: QuotationStatus.ACCEPTED,
          proposedPrice: new Prisma.Decimal('250000.00'),
          inclusions: 'Other vendor coverage.',
        },
      });

      await prisma.booking.create({
        data: {
          eventId: event.id,
          vendorId: secondVendor.id,
          acceptedQuotationId: secondQuotation.id,
          agreedCost: new Prisma.Decimal('250000.00'),
          serviceStart: new Date('2030-09-20T08:00:00.000Z'),
          status: BookingStatus.CONFIRMED,
        },
      });

      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          submittedById: customerId,
          amount: new Prisma.Decimal('50000.00'),
          status: PaymentStatus.PENDING,
          method: PaymentMethod.BANK_TRANSFER,
          referenceNumber: 'VENDOR-DASHBOARD-PENDING-001',
        },
      });

      await prisma.review.create({
        data: {
          bookingId: booking.id,
          customerId,
          vendorId: vendor.id,
          packageId: activePackage.id,
          overallRating: 5,
          serviceRating: 4,
          communicationRating: 5,
          comment: 'Great work.',
          createdAt: new Date('2030-01-09T00:00:00.000Z'),
        },
      });

      await prisma.notification.createMany({
        data: [
          {
            recipientId: vendorUserId,
            type: NotificationType.QUOTATION_REQUEST_RECEIVED,
            title: 'New quotation request',
            message: 'You received a new quotation request.',
            entityType: 'quotationRequest',
            entityId: quotationRequest.id,
            createdAt: new Date('2030-01-10T00:00:00.000Z'),
          },
          {
            recipientId: vendorUserId,
            type: NotificationType.BOOKING_CONFIRMED,
            title: 'Booking confirmed',
            message: 'A booking was confirmed.',
            entityType: 'booking',
            entityId: booking.id,
            createdAt: new Date('2030-01-11T00:00:00.000Z'),
            isRead: true,
            readAt: new Date('2030-01-12T00:00:00.000Z'),
          },
          {
            recipientId: secondVendorUserId,
            type: NotificationType.SYSTEM,
            title: 'Other vendor notification',
            message: 'This should not appear in the first vendor dashboard.',
          },
        ],
      });

      const response = await getVendorDashboardRequest(
        vendorRegistration.body.data.accessToken,
        '?recentLimit=2',
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        filters: {
          recentLimit: 2,
        },
        vendor: {
          id: vendor.id,
          businessName: 'Dashboard Vendor Studio',
          verificationStatus: VendorVerificationStatus.APPROVED,
          baseLocation: 'Colombo',
          serviceAreas: ['Colombo', 'Kandy'],
        },
        quotationRequests: {
          total: 2,
          byStatus: {
            [QuotationRequestStatus.QUOTED]: 1,
            [QuotationRequestStatus.VIEWED]: 1,
            [QuotationRequestStatus.SENT]: 0,
            [QuotationRequestStatus.ACCEPTED]: 0,
            [QuotationRequestStatus.CLARIFICATION_REQUESTED]: 0,
            [QuotationRequestStatus.CLOSED]: 0,
            [QuotationRequestStatus.DECLINED]: 0,
          },
        },
        quotations: {
          total: 1,
          byStatus: {
            [QuotationStatus.ACCEPTED]: 1,
            [QuotationStatus.DRAFT]: 0,
            [QuotationStatus.SENT]: 0,
            [QuotationStatus.VIEWED]: 0,
            [QuotationStatus.CLARIFICATION_REQUESTED]: 0,
            [QuotationStatus.REVISED]: 0,
            [QuotationStatus.REJECTED]: 0,
            [QuotationStatus.WITHDRAWN]: 0,
            [QuotationStatus.EXPIRED]: 0,
          },
        },
        bookings: {
          total: 1,
          byStatus: {
            [BookingStatus.CONFIRMED]: 1,
            [BookingStatus.ACTIVE]: 0,
            [BookingStatus.AWAITING_VENDOR_CONFIRMATION]: 0,
            [BookingStatus.CANCELLED]: 0,
            [BookingStatus.COMPLETED]: 0,
            [BookingStatus.DEPOSIT_PENDING]: 0,
            [BookingStatus.DISPUTED]: 0,
            [BookingStatus.REJECTED]: 0,
          },
        },
        packages: {
          total: 2,
          active: 1,
          inactive: 1,
        },
        reviews: {
          total: 1,
          averages: {
            overallRating: 5,
            serviceRating: 4,
            communicationRating: 5,
          },
        },
        payments: {
          pendingCount: 1,
        },
        notifications: {
          unreadCount: 1,
        },
      });

      expect(response.body.data.generatedAt).toEqual(expect.any(String));

      expect(response.body.data.quotationRequests.recent).toHaveLength(2);
      expect(response.body.data.quotationRequests.recent[0]).toMatchObject({
        status: QuotationRequestStatus.VIEWED,
      });
      expect(response.body.data.quotationRequests.recent[1]).toMatchObject({
        id: quotationRequest.id,
        package: {
          id: activePackage.id,
          title: 'Wedding Photography Package',
          basePrice: '150000',
        },
      });

      expect(response.body.data.bookings.upcoming).toHaveLength(1);
      expect(response.body.data.bookings.upcoming[0]).toMatchObject({
        id: booking.id,
        agreedCost: '150000',
        status: BookingStatus.CONFIRMED,
        event: {
          id: event.id,
          name: 'Maya Wedding',
        },
        acceptedQuotation: {
          id: quotation.id,
          proposedPrice: '150000',
          depositAmount: '50000',
        },
      });

      expect(response.body.data.bookings.recent).toHaveLength(1);
      expect(response.body.data.packages.recent).toHaveLength(2);
      expect(response.body.data.packages.recent[0]).toMatchObject({
        title: 'Archived Photography Package',
        basePrice: '90000',
        isActive: false,
      });

      expect(response.body.data.reviews.recent).toHaveLength(1);
      expect(response.body.data.reviews.recent[0]).toMatchObject({
        overallRating: 5,
        comment: 'Great work.',
      });

      expect(response.body.data.notifications.recent).toHaveLength(2);
      expect(response.body.data.notifications.recent[0]).toMatchObject({
        title: 'Booking confirmed',
        isRead: true,
      });

      expect(
        response.body.data.packages.recent.every(
          (servicePackage: { title: string }) => servicePackage.title !== 'Other Vendor Package',
        ),
      ).toBe(true);
    });
  });
});
