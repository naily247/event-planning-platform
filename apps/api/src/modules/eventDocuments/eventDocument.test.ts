import { EventDocumentCategory } from '@prisma/client';
import request from 'supertest';

import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';
import {
  deleteCloudinaryAsset,
  deleteCloudinaryAssets,
} from '../../services/cloudinary.service.js';

jest.mock('../../services/cloudinary.service.js', () => ({
  deleteCloudinaryAsset: jest.fn(),
  deleteCloudinaryAssets: jest.fn(),
}));

const app = createApp();

const mockedDeleteCloudinaryAsset = jest.mocked(deleteCloudinaryAsset);
const mockedDeleteCloudinaryAssets = jest.mocked(deleteCloudinaryAssets);

const CUSTOMER_EMAIL = 'event-documents-customer@example.com';
const SECOND_CUSTOMER_EMAIL = 'event-documents-second-customer@example.com';
const VENDOR_EMAIL = 'event-documents-vendor@example.com';

const customerPayload = {
  firstName: 'Event',
  lastName: 'Documents Customer',
  email: CUSTOMER_EMAIL,
  password: 'Password123!',
};

const secondCustomerPayload = {
  firstName: 'Second',
  lastName: 'Documents Customer',
  email: SECOND_CUSTOMER_EMAIL,
  password: 'Password123!',
};

const vendorPayload = {
  firstName: 'Document',
  lastName: 'Vendor',
  businessName: 'Document Vendor Studio',
  email: VENDOR_EMAIL,
  password: 'Password123!',
};

const createPdfFile = (
  suffix: string,
  overrides: Partial<{
    fileUrl: string;
    filePublicId: string;
    originalName: string;
    mimeType: 'application/pdf';
    fileSize: number;
  }> = {},
) => ({
  fileUrl: `https://res.cloudinary.com/demo/raw/upload/event-documents/${suffix}.pdf`,
  filePublicId: `event-documents/${suffix}`,
  originalName: `${suffix}.pdf`,
  mimeType: 'application/pdf' as const,
  fileSize: 250_000,
  ...overrides,
});

const createImageFile = (
  suffix: string,
  overrides: Partial<{
    fileUrl: string;
    filePublicId: string;
    originalName: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    fileSize: number;
  }> = {},
) => ({
  fileUrl: `https://res.cloudinary.com/demo/image/upload/event-documents/${suffix}.jpg`,
  filePublicId: `event-documents/${suffix}`,
  originalName: `${suffix}.jpg`,
  mimeType: 'image/jpeg' as const,
  fileSize: 500_000,
  ...overrides,
});

const registerCustomer = async (
  payload: typeof customerPayload | typeof secondCustomerPayload = customerPayload,
) => {
  const response = await request(app)
    .post('/api/v1/auth/register/customer')
    .send(payload)
    .expect(201);

  return {
    token: response.body.data.accessToken as string,
    userId: response.body.data.user.id as string,
  };
};

const registerVendor = async () => {
  const registrationResponse = await request(app)
    .post('/api/v1/auth/register/vendor')
    .send(vendorPayload)
    .expect(201);

  const token = registrationResponse.body.data.accessToken as string;
  const userId = registrationResponse.body.data.user.id as string;

  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });
  if (!vendor) {
    throw new Error('Registered vendor profile was not created');
  }

  return {
    token,
    userId,
    vendorId: vendor.id,
  };
};

const createEvent = async (token: string, name = 'Document Test Wedding') => {
  const response = await request(app)
    .post('/api/v1/events')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name,
      eventType: 'WEDDING',
      eventDate: '2032-06-15T10:00:00.000Z',
      location: 'Colombo',
      estimatedGuestCount: 150,
    })
    .expect(201);

  return response.body.data.id as string;
};

const createDocument = async (
  token: string,
  eventId: string,
  overrides: Record<string, unknown> = {},
) => {
  const response = await request(app)
    .post(`/api/v1/event-documents/events/${eventId}/documents`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Venue Agreement',
      description: 'Signed agreement with the wedding venue',
      category: EventDocumentCategory.CONTRACT,
      files: [createPdfFile('venue-agreement')],
      ...overrides,
    })
    .expect(201);

  return response.body.data;
};

const clearTestData = async () => {
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: [CUSTOMER_EMAIL, SECOND_CUSTOMER_EMAIL, VENDOR_EMAIL],
      },
    },
    select: {
      id: true,
    },
  });

  const userIds = users.map((user) => user.id);

  if (userIds.length > 0) {
    await prisma.event.deleteMany({
      where: {
        ownerId: {
          in: userIds,
        },
      },
    });
  }

  await prisma.user.deleteMany({
    where: {
      email: {
        in: [CUSTOMER_EMAIL, SECOND_CUSTOMER_EMAIL, VENDOR_EMAIL],
      },
    },
  });
};

beforeEach(async () => {
  await clearTestData();

  mockedDeleteCloudinaryAsset.mockReset();
  mockedDeleteCloudinaryAssets.mockReset();

  mockedDeleteCloudinaryAsset.mockResolvedValue(undefined);
  mockedDeleteCloudinaryAssets.mockResolvedValue(undefined);
});

afterEach(async () => {
  await clearTestData();
});

afterAll(async () => {
  await clearTestData();
  await prisma.$disconnect();
});

describe('Event document routes', () => {
  describe('authorization', () => {
    it('returns 401 when no access token is provided', async () => {
      const response = await request(app).get(
        '/api/v1/event-documents/events/clx0000000000000000000000/summary',
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('returns 403 when a vendor accesses customer-only document routes', async () => {
      const vendor = await registerVendor();

      const response = await request(app)
        .get('/api/v1/event-documents/events/clx0000000000000000000000/summary')
        .set('Authorization', `Bearer ${vendor.token}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });
  describe('create document', () => {
    it('creates a document with one PDF file', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const response = await request(app)
        .post(`/api/v1/event-documents/events/${eventId}/documents`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          title: 'Venue Agreement',
          description: 'Signed agreement with the wedding venue',
          category: EventDocumentCategory.CONTRACT,
          files: [createPdfFile('venue-agreement-create')],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        eventId,
        title: 'Venue Agreement',
        description: 'Signed agreement with the wedding venue',
        category: EventDocumentCategory.CONTRACT,
        vendorId: null,
      });
      expect(response.body.data.files).toHaveLength(1);
      expect(response.body.data.files[0]).toMatchObject({
        filePublicId: 'event-documents/venue-agreement-create',
        originalName: 'venue-agreement-create.pdf',
        mimeType: 'application/pdf',
        fileSize: 250_000,
      });
    });

    it('creates a document with the maximum three files', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const response = await request(app)
        .post(`/api/v1/event-documents/events/${eventId}/documents`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          title: 'Wedding Planning Pack',
          category: EventDocumentCategory.REFERENCE,
          files: [
            createPdfFile('planning-pack-contract'),
            createImageFile('planning-pack-layout'),
            createImageFile('planning-pack-menu', {
              fileUrl:
                'https://res.cloudinary.com/demo/image/upload/event-documents/planning-pack-menu.webp',
              originalName: 'planning-pack-menu.webp',
              mimeType: 'image/webp',
            }),
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toHaveLength(3);
    });

    it('uses the default category when category is omitted', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const response = await request(app)
        .post(`/api/v1/event-documents/events/${eventId}/documents`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          title: 'General Reference',
          files: [createPdfFile('general-reference')],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.category).toBe(EventDocumentCategory.OTHER);
    });

    it('trims text values before storing the document', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const response = await request(app)
        .post(`/api/v1/event-documents/events/${eventId}/documents`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          title: '  Reception Schedule  ',
          description: '  Final reception sequence  ',
          category: EventDocumentCategory.SCHEDULE,
          files: [
            createPdfFile('trimmed-schedule', {
              originalName: '  reception-schedule.pdf  ',
            }),
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.title).toBe('Reception Schedule');
      expect(response.body.data.description).toBe('Final reception sequence');
      expect(response.body.data.files[0].originalName).toBe('reception-schedule.pdf');
    });

    it('rejects a document without files', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const response = await request(app)
        .post(`/api/v1/event-documents/events/${eventId}/documents`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          title: 'Empty Document',
          category: EventDocumentCategory.OTHER,
          files: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('rejects more than three files during creation', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const response = await request(app)
        .post(`/api/v1/event-documents/events/${eventId}/documents`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          title: 'Oversized File Collection',
          files: [
            createPdfFile('collection-1'),
            createPdfFile('collection-2'),
            createPdfFile('collection-3'),
            createPdfFile('collection-4'),
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('rejects an unsupported MIME type', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const response = await request(app)
        .post(`/api/v1/event-documents/events/${eventId}/documents`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          title: 'Spreadsheet',
          files: [
            {
              fileUrl: 'https://res.cloudinary.com/demo/raw/upload/event-documents/budget.xlsx',
              filePublicId: 'event-documents/budget-xlsx',
              originalName: 'budget.xlsx',
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              fileSize: 250_000,
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('rejects a file larger than 10 MB', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const response = await request(app)
        .post(`/api/v1/event-documents/events/${eventId}/documents`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          title: 'Oversized Contract',
          files: [
            createPdfFile('oversized-contract', {
              fileSize: 10 * 1024 * 1024 + 1,
            }),
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 404 when the event does not belong to the customer', async () => {
      const firstCustomer = await registerCustomer();
      const secondCustomer = await registerCustomer(secondCustomerPayload);
      const eventId = await createEvent(firstCustomer.token);

      const response = await request(app)
        .post(`/api/v1/event-documents/events/${eventId}/documents`)
        .set('Authorization', `Bearer ${secondCustomer.token}`)
        .send({
          title: 'Unauthorized Contract',
          files: [createPdfFile('unauthorized-contract')],
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_NOT_FOUND');
    });

    it('rejects duplicate file public IDs', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      await createDocument(customer.token, eventId, {
        title: 'First Contract',
        files: [createPdfFile('duplicate-public-id')],
      });

      const response = await request(app)
        .post(`/api/v1/event-documents/events/${eventId}/documents`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          title: 'Second Contract',
          files: [createPdfFile('duplicate-public-id')],
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_DOCUMENT_FILE_PUBLIC_ID_CONFLICT');
    });
  });
  describe('read documents', () => {
    it('lists documents with pagination metadata', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      await createDocument(customer.token, eventId, {
        title: 'Venue Agreement',
        files: [createPdfFile('list-venue-agreement')],
      });

      await createDocument(customer.token, eventId, {
        title: 'Reception Floor Plan',
        category: EventDocumentCategory.FLOOR_PLAN,
        files: [createImageFile('list-floor-plan')],
      });

      const response = await request(app)
        .get(`/api/v1/event-documents/events/${eventId}/documents?page=1&limit=1&sort=title_asc`)
        .set('Authorization', `Bearer ${customer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Reception Floor Plan');
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 1,
        total: 2,
        totalPages: 2,
      });
    });

    it('filters documents by category', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      await createDocument(customer.token, eventId, {
        title: 'Signed Contract',
        category: EventDocumentCategory.CONTRACT,
        files: [createPdfFile('filter-contract')],
      });

      await createDocument(customer.token, eventId, {
        title: 'Final Menu',
        category: EventDocumentCategory.MENU,
        files: [createPdfFile('filter-menu')],
      });

      const response = await request(app)
        .get(
          `/api/v1/event-documents/events/${eventId}/documents?category=${EventDocumentCategory.MENU}`,
        )
        .set('Authorization', `Bearer ${customer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Final Menu');
      expect(response.body.data[0].category).toBe(EventDocumentCategory.MENU);
    });

    it('filters documents by PDF MIME group', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      await createDocument(customer.token, eventId, {
        title: 'PDF Contract',
        files: [createPdfFile('mime-pdf')],
      });

      await createDocument(customer.token, eventId, {
        title: 'Image Reference',
        category: EventDocumentCategory.REFERENCE,
        files: [createImageFile('mime-image')],
      });

      const response = await request(app)
        .get(`/api/v1/event-documents/events/${eventId}/documents?mimeType=PDF`)
        .set('Authorization', `Bearer ${customer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('PDF Contract');
      expect(response.body.data[0].files[0].mimeType).toBe('application/pdf');
    });

    it('filters documents by IMAGE MIME group', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      await createDocument(customer.token, eventId, {
        title: 'PDF Schedule',
        category: EventDocumentCategory.SCHEDULE,
        files: [createPdfFile('image-filter-pdf')],
      });

      await createDocument(customer.token, eventId, {
        title: 'Venue Reference Image',
        category: EventDocumentCategory.REFERENCE,
        files: [createImageFile('image-filter-image')],
      });

      const response = await request(app)
        .get(`/api/v1/event-documents/events/${eventId}/documents?mimeType=IMAGE`)
        .set('Authorization', `Bearer ${customer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Venue Reference Image');
      expect(response.body.data[0].files[0].mimeType).toBe('image/jpeg');
    });

    it('filters documents by whether they have a vendor', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();
      const eventId = await createEvent(customer.token);

      await createDocument(customer.token, eventId, {
        title: 'Vendor Quotation',
        category: EventDocumentCategory.QUOTATION,
        vendorId: vendor.vendorId,
        files: [createPdfFile('vendor-linked')],
      });

      await createDocument(customer.token, eventId, {
        title: 'Personal Notes',
        category: EventDocumentCategory.OTHER,
        files: [createPdfFile('vendor-unlinked')],
      });

      const linkedResponse = await request(app)
        .get(`/api/v1/event-documents/events/${eventId}/documents?hasVendor=true`)
        .set('Authorization', `Bearer ${customer.token}`);

      expect(linkedResponse.status).toBe(200);
      expect(linkedResponse.body.data).toHaveLength(1);
      expect(linkedResponse.body.data[0].title).toBe('Vendor Quotation');

      const unlinkedResponse = await request(app)
        .get(`/api/v1/event-documents/events/${eventId}/documents?hasVendor=false`)
        .set('Authorization', `Bearer ${customer.token}`);

      expect(unlinkedResponse.status).toBe(200);
      expect(unlinkedResponse.body.data).toHaveLength(1);
      expect(unlinkedResponse.body.data[0].title).toBe('Personal Notes');
    });

    it('searches documents by title and description', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      await createDocument(customer.token, eventId, {
        title: 'Venue Agreement',
        description: 'Agreement for Ocean View Hall',
        files: [createPdfFile('search-venue')],
      });

      await createDocument(customer.token, eventId, {
        title: 'Catering Invoice',
        description: 'Food service payment details',
        category: EventDocumentCategory.INVOICE,
        files: [createPdfFile('search-catering')],
      });

      const response = await request(app)
        .get(`/api/v1/event-documents/events/${eventId}/documents?search=ocean%20view`)
        .set('Authorization', `Bearer ${customer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Venue Agreement');
    });

    it('returns a document by ID', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);
      const document = await createDocument(customer.token, eventId, {
        title: 'Detailed Contract',
        files: [createPdfFile('detail-contract'), createImageFile('detail-reference')],
      });

      const response = await request(app)
        .get(`/api/v1/event-documents/events/${eventId}/documents/${document.id}`)
        .set('Authorization', `Bearer ${customer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(document.id);
      expect(response.body.data.title).toBe('Detailed Contract');
      expect(response.body.data.files).toHaveLength(2);
    });

    it('returns 404 when a document belongs to another customer event', async () => {
      const firstCustomer = await registerCustomer();
      const secondCustomer = await registerCustomer(secondCustomerPayload);

      const firstEventId = await createEvent(firstCustomer.token);
      const secondEventId = await createEvent(secondCustomer.token, 'Second Customer Wedding');

      const document = await createDocument(firstCustomer.token, firstEventId, {
        files: [createPdfFile('foreign-document')],
      });

      const response = await request(app)
        .get(`/api/v1/event-documents/events/${secondEventId}/documents/${document.id}`)
        .set('Authorization', `Bearer ${secondCustomer.token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_DOCUMENT_NOT_FOUND');
    });

    it('rejects invalid list query values', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const response = await request(app)
        .get(
          `/api/v1/event-documents/events/${eventId}/documents?page=0&limit=101&mimeType=VIDEO&sort=wrong`,
        )
        .set('Authorization', `Bearer ${customer.token}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
  describe('update document', () => {
    it('updates document metadata', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const document = await createDocument(customer.token, eventId, {
        title: 'Draft Contract',
        description: 'Initial contract draft',
        category: EventDocumentCategory.CONTRACT,
        files: [createPdfFile('update-document')],
      });

      const response = await request(app)
        .patch(`/api/v1/event-documents/events/${eventId}/documents/${document.id}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          title: 'Final Contract',
          description: 'Signed final contract',
          category: EventDocumentCategory.VENDOR_DOCUMENT,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: document.id,
        title: 'Final Contract',
        description: 'Signed final contract',
        category: EventDocumentCategory.VENDOR_DOCUMENT,
      });
      expect(response.body.data.files).toHaveLength(1);
    });

    it('clears an optional description with null', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const document = await createDocument(customer.token, eventId, {
        description: 'Temporary description',
        files: [createPdfFile('clear-description')],
      });

      const response = await request(app)
        .patch(`/api/v1/event-documents/events/${eventId}/documents/${document.id}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          description: null,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBeNull();
    });

    it('links and unlinks a vendor', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();
      const eventId = await createEvent(customer.token);

      const document = await createDocument(customer.token, eventId, {
        title: 'Vendor Quotation',
        category: EventDocumentCategory.QUOTATION,
        files: [createPdfFile('link-vendor')],
      });

      const linkedResponse = await request(app)
        .patch(`/api/v1/event-documents/events/${eventId}/documents/${document.id}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          vendorId: vendor.vendorId,
        });

      expect(linkedResponse.status).toBe(200);
      expect(linkedResponse.body.data.vendorId).toBe(vendor.vendorId);

      const unlinkedResponse = await request(app)
        .patch(`/api/v1/event-documents/events/${eventId}/documents/${document.id}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          vendorId: null,
        });

      expect(unlinkedResponse.status).toBe(200);
      expect(unlinkedResponse.body.data.vendorId).toBeNull();
    });

    it('rejects an empty update body', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const document = await createDocument(customer.token, eventId, {
        files: [createPdfFile('empty-update')],
      });

      const response = await request(app)
        .patch(`/api/v1/event-documents/events/${eventId}/documents/${document.id}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('rejects an empty title', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const document = await createDocument(customer.token, eventId, {
        files: [createPdfFile('empty-title-update')],
      });

      const response = await request(app)
        .patch(`/api/v1/event-documents/events/${eventId}/documents/${document.id}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          title: '   ',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 404 when the document does not exist', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const response = await request(app)
        .patch(`/api/v1/event-documents/events/${eventId}/documents/clx0000000000000000000000`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          title: 'Missing Document',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_DOCUMENT_NOT_FOUND');
    });

    it('prevents another customer from updating the document', async () => {
      const firstCustomer = await registerCustomer();
      const secondCustomer = await registerCustomer(secondCustomerPayload);

      const firstEventId = await createEvent(firstCustomer.token);
      const secondEventId = await createEvent(secondCustomer.token, 'Second Customer Event');

      const document = await createDocument(firstCustomer.token, firstEventId, {
        files: [createPdfFile('foreign-update')],
      });

      const response = await request(app)
        .patch(`/api/v1/event-documents/events/${secondEventId}/documents/${document.id}`)
        .set('Authorization', `Bearer ${secondCustomer.token}`)
        .send({
          title: 'Unauthorized Change',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_DOCUMENT_NOT_FOUND');
    });
  });
  describe('manage document files', () => {
    it('adds files to an existing document', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const document = await createDocument(customer.token, eventId, {
        title: 'Planning Documents',
        files: [createPdfFile('add-files-original')],
      });

      const response = await request(app)
        .post(`/api/v1/event-documents/events/${eventId}/documents/${document.id}/files`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          files: [createImageFile('add-files-layout'), createPdfFile('add-files-schedule')],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(document.id);
      expect(response.body.data.files).toHaveLength(3);

      expect(
        response.body.data.files.map((file: { filePublicId: string }) => file.filePublicId),
      ).toEqual(
        expect.arrayContaining([
          'event-documents/add-files-original',
          'event-documents/add-files-layout',
          'event-documents/add-files-schedule',
        ]),
      );
    });

    it('rejects adding files when the document would exceed three files', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const document = await createDocument(customer.token, eventId, {
        files: [createPdfFile('limit-existing-1'), createPdfFile('limit-existing-2')],
      });

      const response = await request(app)
        .post(`/api/v1/event-documents/events/${eventId}/documents/${document.id}/files`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          files: [createPdfFile('limit-new-1'), createPdfFile('limit-new-2')],
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_DOCUMENT_FILE_LIMIT_EXCEEDED');
    });

    it('rejects a duplicate public ID when adding files', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const document = await createDocument(customer.token, eventId, {
        files: [createPdfFile('add-duplicate-public-id')],
      });

      const response = await request(app)
        .post(`/api/v1/event-documents/events/${eventId}/documents/${document.id}/files`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          files: [createImageFile('add-duplicate-public-id')],
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_DOCUMENT_FILE_PUBLIC_ID_CONFLICT');
    });

    it('replaces an existing file and removes the old Cloudinary asset', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const document = await createDocument(customer.token, eventId, {
        files: [createPdfFile('replace-old-file')],
      });

      const existingFile = document.files[0];

      const response = await request(app)
        .patch(
          `/api/v1/event-documents/events/${eventId}/documents/${document.id}/files/${existingFile.id}`,
        )
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          file: createImageFile('replace-new-file', {
            fileUrl:
              'https://res.cloudinary.com/demo/image/upload/event-documents/replace-new-file.png',
            originalName: 'replace-new-file.png',
            mimeType: 'image/png',
          }),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: existingFile.id,
        filePublicId: 'event-documents/replace-new-file',
        originalName: 'replace-new-file.png',
        mimeType: 'image/png',
      });

      expect(mockedDeleteCloudinaryAsset).toHaveBeenCalledTimes(1);
    });

    it('rejects replacement with a public ID already used by another file', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const document = await createDocument(customer.token, eventId, {
        files: [createPdfFile('replace-conflict-first'), createPdfFile('replace-conflict-second')],
      });

      const firstFile = document.files.find(
        (file: { filePublicId: string }) =>
          file.filePublicId === 'event-documents/replace-conflict-first',
      );

      const response = await request(app)
        .patch(
          `/api/v1/event-documents/events/${eventId}/documents/${document.id}/files/${firstFile.id}`,
        )
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          file: createImageFile('replace-conflict-second'),
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_DOCUMENT_FILE_PUBLIC_ID_CONFLICT');
      expect(mockedDeleteCloudinaryAsset).not.toHaveBeenCalled();
    });

    it('returns 404 when replacing a file that does not exist', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const document = await createDocument(customer.token, eventId, {
        files: [createPdfFile('replace-missing-file')],
      });

      const response = await request(app)
        .patch(
          `/api/v1/event-documents/events/${eventId}/documents/${document.id}/files/clx0000000000000000000000`,
        )
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          file: createImageFile('replacement-for-missing-file'),
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_DOCUMENT_FILE_NOT_FOUND');
    });

    it('deletes one file while preserving the remaining file', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const document = await createDocument(customer.token, eventId, {
        files: [createPdfFile('delete-file-first'), createImageFile('delete-file-second')],
      });

      const fileToDelete = document.files.find(
        (file: { filePublicId: string }) =>
          file.filePublicId === 'event-documents/delete-file-first',
      );

      const response = await request(app)
        .delete(
          `/api/v1/event-documents/events/${eventId}/documents/${document.id}/files/${fileToDelete.id}`,
        )
        .set('Authorization', `Bearer ${customer.token}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      const remainingFiles = await prisma.eventDocumentFile.findMany({
        where: {
          documentId: document.id,
        },
      });

      expect(remainingFiles).toHaveLength(1);
      expect(remainingFiles[0]?.filePublicId).toBe('event-documents/delete-file-second');

      expect(mockedDeleteCloudinaryAsset).toHaveBeenCalledTimes(1);
    });

    it('prevents deletion of the final remaining file', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const document = await createDocument(customer.token, eventId, {
        files: [createPdfFile('last-required-file')],
      });

      const response = await request(app)
        .delete(
          `/api/v1/event-documents/events/${eventId}/documents/${document.id}/files/${document.files[0].id}`,
        )
        .set('Authorization', `Bearer ${customer.token}`);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_DOCUMENT_LAST_FILE_REQUIRED');
      expect(mockedDeleteCloudinaryAsset).not.toHaveBeenCalled();
    });

    it('returns 404 when deleting a file that does not exist', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const document = await createDocument(customer.token, eventId, {
        files: [
          createPdfFile('delete-missing-existing-1'),
          createPdfFile('delete-missing-existing-2'),
        ],
      });

      const response = await request(app)
        .delete(
          `/api/v1/event-documents/events/${eventId}/documents/${document.id}/files/clx0000000000000000000000`,
        )
        .set('Authorization', `Bearer ${customer.token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_DOCUMENT_FILE_NOT_FOUND');
      expect(mockedDeleteCloudinaryAsset).not.toHaveBeenCalled();
    });
  });
  describe('delete document', () => {
    it('deletes a document and all of its Cloudinary assets', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const document = await createDocument(customer.token, eventId, {
        title: 'Document To Delete',
        files: [createPdfFile('delete-document-pdf'), createImageFile('delete-document-image')],
      });

      const response = await request(app)
        .delete(`/api/v1/event-documents/events/${eventId}/documents/${document.id}`)
        .set('Authorization', `Bearer ${customer.token}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      expect(mockedDeleteCloudinaryAssets).toHaveBeenCalledTimes(1);

      const deletedDocument = await prisma.eventDocument.findUnique({
        where: {
          id: document.id,
        },
      });

      const deletedFiles = await prisma.eventDocumentFile.findMany({
        where: {
          documentId: document.id,
        },
      });

      expect(deletedDocument).toBeNull();
      expect(deletedFiles).toHaveLength(0);
    });

    it('returns 404 when deleting a document that does not exist', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const response = await request(app)
        .delete(`/api/v1/event-documents/events/${eventId}/documents/clx0000000000000000000000`)
        .set('Authorization', `Bearer ${customer.token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_DOCUMENT_NOT_FOUND');
      expect(mockedDeleteCloudinaryAssets).not.toHaveBeenCalled();
    });

    it('prevents another customer from deleting the document', async () => {
      const firstCustomer = await registerCustomer();
      const secondCustomer = await registerCustomer(secondCustomerPayload);

      const firstEventId = await createEvent(firstCustomer.token);
      const secondEventId = await createEvent(secondCustomer.token, 'Second Customer Delete Event');

      const document = await createDocument(firstCustomer.token, firstEventId, {
        files: [createPdfFile('foreign-delete-document')],
      });

      const response = await request(app)
        .delete(`/api/v1/event-documents/events/${secondEventId}/documents/${document.id}`)
        .set('Authorization', `Bearer ${secondCustomer.token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_DOCUMENT_NOT_FOUND');
      expect(mockedDeleteCloudinaryAssets).not.toHaveBeenCalled();

      const existingDocument = await prisma.eventDocument.findUnique({
        where: {
          id: document.id,
        },
      });

      expect(existingDocument).not.toBeNull();
    });

    it('deletes documents and files when the parent event is deleted', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const document = await createDocument(customer.token, eventId, {
        title: 'Cascade Delete Document',
        files: [createPdfFile('cascade-delete-pdf'), createImageFile('cascade-delete-image')],
      });

      await request(app)
        .delete(`/api/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(204);

      const deletedDocument = await prisma.eventDocument.findUnique({
        where: {
          id: document.id,
        },
      });

      const deletedFiles = await prisma.eventDocumentFile.findMany({
        where: {
          documentId: document.id,
        },
      });

      expect(deletedDocument).toBeNull();
      expect(deletedFiles).toHaveLength(0);
    });
  });

  describe('document summary', () => {
    it('returns an empty summary for an event without documents', async () => {
      const customer = await registerCustomer();
      const eventId = await createEvent(customer.token);

      const response = await request(app)
        .get(`/api/v1/event-documents/events/${eventId}/summary`)
        .set('Authorization', `Bearer ${customer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toMatchObject({
        totalDocuments: 0,
        totalFiles: 0,
        pdfFiles: 0,
        imageFiles: 0,
        linkedVendorDocuments: 0,
      });

      for (const category of Object.values(EventDocumentCategory)) {
        expect(response.body.data.summary.categoryCounts[category]).toBe(0);
      }
    });

    it('calculates document, file, MIME, vendor, and category totals', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();
      const eventId = await createEvent(customer.token);

      await createDocument(customer.token, eventId, {
        title: 'Venue Contract',
        category: EventDocumentCategory.CONTRACT,
        files: [createPdfFile('summary-contract-pdf'), createImageFile('summary-contract-image')],
      });

      await createDocument(customer.token, eventId, {
        title: 'Vendor Quotation',
        category: EventDocumentCategory.QUOTATION,
        vendorId: vendor.vendorId,
        files: [createPdfFile('summary-quotation-pdf')],
      });

      await createDocument(customer.token, eventId, {
        title: 'Reception Floor Plan',
        category: EventDocumentCategory.FLOOR_PLAN,
        files: [createImageFile('summary-floor-plan-image')],
      });

      const response = await request(app)
        .get(`/api/v1/event-documents/events/${eventId}/summary`)
        .set('Authorization', `Bearer ${customer.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toMatchObject({
        totalDocuments: 3,
        totalFiles: 4,
        pdfFiles: 2,
        imageFiles: 2,
        linkedVendorDocuments: 1,
      });

      expect(response.body.data.summary.categoryCounts[EventDocumentCategory.CONTRACT]).toBe(1);

      expect(response.body.data.summary.categoryCounts[EventDocumentCategory.QUOTATION]).toBe(1);

      expect(response.body.data.summary.categoryCounts[EventDocumentCategory.FLOOR_PLAN]).toBe(1);

      expect(response.body.data.summary.categoryCounts[EventDocumentCategory.INVOICE]).toBe(0);
    });

    it('returns 404 when requesting another customer event summary', async () => {
      const firstCustomer = await registerCustomer();
      const secondCustomer = await registerCustomer(secondCustomerPayload);

      const eventId = await createEvent(firstCustomer.token);

      const response = await request(app)
        .get(`/api/v1/event-documents/events/${eventId}/summary`)
        .set('Authorization', `Bearer ${secondCustomer.token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_NOT_FOUND');
    });
  });
});
