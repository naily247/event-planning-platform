import { NotificationType, type PrismaClient } from '@prisma/client';
import { DEVELOPMENT_CUSTOMERS } from './constants.js';
import {
  getRequiredEventByNameAndOwner,
  getRequiredUserByEmail,
  getRequiredVendorBySlug,
} from './helpers.js';

type SeedNotificationsInput = {
  adminEmail: string;
};

type NotificationSeedData = {
  recipientEmail: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt: Date | null;
  entityType: string | null;
  entityId: string | null;
  metadata?: Record<string, string | number | boolean>;
};

const upsertNotification = async (prisma: PrismaClient, notificationData: NotificationSeedData) => {
  const recipient = await getRequiredUserByEmail(prisma, notificationData.recipientEmail);

  const existingNotification = await prisma.notification.findFirst({
    where: {
      recipientId: recipient.id,
      type: notificationData.type,
      title: notificationData.title,
      entityType: notificationData.entityType,
      entityId: notificationData.entityId,
    },
  });

  const notificationValues = {
    type: notificationData.type,
    title: notificationData.title,
    message: notificationData.message,
    isRead: notificationData.isRead,
    readAt: notificationData.readAt,
    entityType: notificationData.entityType,
    entityId: notificationData.entityId,
    metadata: notificationData.metadata,
  };

  if (existingNotification) {
    await prisma.notification.update({
      where: {
        id: existingNotification.id,
      },
      data: notificationValues,
    });

    return;
  }

  await prisma.notification.create({
    data: {
      recipientId: recipient.id,
      ...notificationValues,
    },
  });
};

export const seedNotifications = async (prisma: PrismaClient, input: SeedNotificationsInput) => {
  const emma = await getRequiredUserByEmail(prisma, DEVELOPMENT_CUSTOMERS[0].email);

  const michael = await getRequiredUserByEmail(prisma, DEVELOPMENT_CUSTOMERS[1].email);

  const olivia = await getRequiredUserByEmail(prisma, DEVELOPMENT_CUSTOMERS[2].email);

  const emmaWedding = await getRequiredEventByNameAndOwner(
    prisma,
    'Emma and Daniel Wedding',
    emma.id,
  );

  const novaTechConference = await getRequiredEventByNameAndOwner(
    prisma,
    'NovaTech Annual Conference',
    michael.id,
  );

  const oliviaBirthday = await getRequiredEventByNameAndOwner(
    prisma,
    'Olivia Birthday Celebration',
    olivia.id,
  );

  const lunaFrame = await getRequiredVendorBySlug(prisma, 'luna-frame-studio');

  const grandHorizon = await getRequiredVendorBySlug(prisma, 'grand-horizon-ballroom');

  const sweetLayers = await getRequiredVendorBySlug(prisma, 'sweet-layers');

  const weddingBooking = await prisma.booking.findFirst({
    where: {
      eventId: emmaWedding.id,
      vendorId: lunaFrame.id,
    },
  });

  if (!weddingBooking) {
    throw new Error('Required wedding photography booking was not found. Seed bookings first.');
  }

  const conferenceBooking = await prisma.booking.findFirst({
    where: {
      eventId: novaTechConference.id,
      vendorId: grandHorizon.id,
    },
  });

  if (!conferenceBooking) {
    throw new Error('Required conference venue booking was not found. Seed bookings first.');
  }

  const weddingPayment = await prisma.payment.findFirst({
    where: {
      bookingId: weddingBooking.id,
      referenceNumber: 'EVT-WED-PHOTO-DEP-001',
    },
  });

  if (!weddingPayment) {
    throw new Error('Required wedding photography payment was not found. Seed payments first.');
  }

  const conferencePayment = await prisma.payment.findFirst({
    where: {
      bookingId: conferenceBooking.id,
      referenceNumber: 'EVT-CONF-VENUE-DEP-001',
    },
  });

  if (!conferencePayment) {
    throw new Error('Required conference venue payment was not found. Seed payments first.');
  }

  const birthdayQuotationRequest = await prisma.quotationRequest.findFirst({
    where: {
      eventId: oliviaBirthday.id,
      vendorId: sweetLayers.id,
    },
  });

  if (!birthdayQuotationRequest) {
    throw new Error(
      'Required birthday dessert quotation request was not found. Seed quotation workflows first.',
    );
  }

  const notifications: NotificationSeedData[] = [
    {
      recipientEmail: DEVELOPMENT_CUSTOMERS[0].email,
      type: NotificationType.BOOKING_CONFIRMED,
      title: 'Photography date reserved',
      message:
        'Luna Frame Studio has reserved your wedding date. Complete the deposit verification to secure the booking.',
      isRead: false,
      readAt: null,
      entityType: 'BOOKING',
      entityId: weddingBooking.id,
      metadata: {
        eventName: emmaWedding.name,
        vendorName: lunaFrame.businessName,
      },
    },
    {
      recipientEmail: DEVELOPMENT_CUSTOMERS[0].email,
      type: NotificationType.PAYMENT_SUBMITTED,
      title: 'Deposit proof submitted',
      message:
        'Your photography deposit proof has been submitted and is waiting for administrator verification.',
      isRead: true,
      readAt: new Date('2026-07-12T09:15:00.000Z'),
      entityType: 'PAYMENT',
      entityId: weddingPayment.id,
      metadata: {
        amount: 97500,
        referenceNumber: weddingPayment.referenceNumber,
      },
    },
    {
      recipientEmail: DEVELOPMENT_CUSTOMERS[0].email,
      type: NotificationType.QUOTATION_SENT,
      title: 'Decoration quotation received',
      message: 'Velvet Moments has submitted a quotation for your wedding reception styling.',
      isRead: false,
      readAt: null,
      entityType: 'EVENT',
      entityId: emmaWedding.id,
      metadata: {
        eventName: emmaWedding.name,
        vendorName: 'Velvet Moments',
      },
    },

    {
      recipientEmail: DEVELOPMENT_CUSTOMERS[1].email,
      type: NotificationType.BOOKING_CONFIRMED,
      title: 'Conference venue confirmed',
      message:
        'Grand Horizon Ballroom has confirmed the venue booking for the NovaTech Annual Conference.',
      isRead: true,
      readAt: new Date('2026-07-11T10:00:00.000Z'),
      entityType: 'BOOKING',
      entityId: conferenceBooking.id,
      metadata: {
        eventName: novaTechConference.name,
        vendorName: grandHorizon.businessName,
      },
    },
    {
      recipientEmail: DEVELOPMENT_CUSTOMERS[1].email,
      type: NotificationType.PAYMENT_VERIFIED,
      title: 'Venue deposit verified',
      message: 'The administrator has verified your conference venue deposit.',
      isRead: false,
      readAt: null,
      entityType: 'PAYMENT',
      entityId: conferencePayment.id,
      metadata: {
        amount: 216000,
        referenceNumber: conferencePayment.referenceNumber,
      },
    },

    {
      recipientEmail: DEVELOPMENT_CUSTOMERS[2].email,
      type: NotificationType.QUOTATION_SENT,
      title: 'Dessert quotation ready',
      message: 'Sweet Layers has submitted a quotation for your birthday cake and dessert table.',
      isRead: false,
      readAt: null,
      entityType: 'QUOTATION_REQUEST',
      entityId: birthdayQuotationRequest.id,
      metadata: {
        eventName: oliviaBirthday.name,
        vendorName: sweetLayers.businessName,
      },
    },
    {
      recipientEmail: DEVELOPMENT_CUSTOMERS[2].email,
      type: NotificationType.SYSTEM,
      title: 'Birthday planning reminder',
      message:
        'Your birthday celebration is approaching. Review pending tasks and guest responses.',
      isRead: true,
      readAt: new Date('2026-07-11T08:30:00.000Z'),
      entityType: 'EVENT',
      entityId: oliviaBirthday.id,
      metadata: {
        eventName: oliviaBirthday.name,
      },
    },

    {
      recipientEmail: lunaFrame.user.email,
      type: NotificationType.BOOKING_CREATED,
      title: 'New photography booking',
      message:
        'A booking was created for the Editorial Celebration package for Emma and Daniel Wedding.',
      isRead: true,
      readAt: new Date('2026-07-12T08:45:00.000Z'),
      entityType: 'BOOKING',
      entityId: weddingBooking.id,
      metadata: {
        eventName: emmaWedding.name,
        customerName: 'Emma Johnson',
      },
    },
    {
      recipientEmail: sweetLayers.user.email,
      type: NotificationType.QUOTATION_REQUEST_RECEIVED,
      title: 'New dessert quotation request',
      message:
        'Olivia Fernando requested a quotation for a birthday cake and coordinated dessert table.',
      isRead: false,
      readAt: null,
      entityType: 'QUOTATION_REQUEST',
      entityId: birthdayQuotationRequest.id,
      metadata: {
        eventName: oliviaBirthday.name,
        customerName: 'Olivia Fernando',
      },
    },

    {
      recipientEmail: input.adminEmail,
      type: NotificationType.PAYMENT_SUBMITTED,
      title: 'Payment verification required',
      message: 'A new photography deposit proof is waiting for administrator review.',
      isRead: false,
      readAt: null,
      entityType: 'PAYMENT',
      entityId: weddingPayment.id,
      metadata: {
        customerName: 'Emma Johnson',
        amount: 97500,
      },
    },
    {
      recipientEmail: input.adminEmail,
      type: NotificationType.PAYMENT_VERIFIED,
      title: 'Conference payment approved',
      message: 'The NovaTech conference venue deposit has been verified successfully.',
      isRead: true,
      readAt: new Date('2026-07-12T10:50:00.000Z'),
      entityType: 'PAYMENT',
      entityId: conferencePayment.id,
      metadata: {
        customerName: 'Michael Silva',
        amount: 216000,
      },
    },
  ];

  for (const notificationData of notifications) {
    await upsertNotification(prisma, notificationData);
  }

  console.log(`${notifications.length} notifications seeded successfully.`);
};
