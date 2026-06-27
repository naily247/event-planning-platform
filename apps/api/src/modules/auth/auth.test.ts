import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const customerEmail = 'auth-customer@example.com';
const vendorEmail = 'auth-vendor@example.com';

const customerPayload = {
  email: customerEmail,
  password: 'Customer@2026',
  firstName: 'Test',
  lastName: 'Customer',
  phone: {
    country: 'LK',
    number: '0771234567',
  },
};

const vendorPayload = {
  email: vendorEmail,
  password: 'Vendor@2026',
  firstName: 'Test',
  lastName: 'Vendor',
  businessName: 'Moonlight Photography',
};

beforeEach(async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [customerEmail, vendorEmail],
      },
    },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [customerEmail, vendorEmail],
      },
    },
  });

  await prisma.$disconnect();
});

describe('Authentication API', () => {
  describe('POST /api/v1/auth/register/customer', () => {
    it('registers a customer and creates a customer profile', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register/customer')
        .send(customerPayload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toEqual(expect.any(String));

      expect(response.body.data.user).toMatchObject({
        email: customerEmail,
        firstName: 'Test',
        lastName: 'Customer',
        role: 'CUSTOMER',
        status: 'ACTIVE',
      });

      expect(response.body.data.user.passwordHash).toBeUndefined();

      const storedUser = await prisma.user.findUnique({
        where: { email: customerEmail },
        include: { customer: true },
      });

      expect(storedUser).not.toBeNull();
      expect(storedUser?.passwordHash).not.toBe(customerPayload.password);
      expect(storedUser?.customer?.phone).toBe('+94771234567');
    });

    it('rejects a duplicate email address', async () => {
      await request(app)
        .post('/api/v1/auth/register/customer')
        .send(customerPayload);

      const response = await request(app)
        .post('/api/v1/auth/register/customer')
        .send(customerPayload);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('rejects an invalid Sri Lankan phone number', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register/customer')
        .send({
          ...customerPayload,
          phone: {
            country: 'LK',
            number: '123',
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/register/vendor', () => {
    it('registers a vendor with a draft vendor profile', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register/vendor')
        .send(vendorPayload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.data.user).toMatchObject({
        email: vendorEmail,
        role: 'VENDOR',
        status: 'ACTIVE',
      });

      const storedUser = await prisma.user.findUnique({
        where: { email: vendorEmail },
        include: { vendor: true },
      });

      expect(storedUser?.vendor).toMatchObject({
        businessName: 'Moonlight Photography',
        slug: 'moonlight-photography',
        verificationStatus: 'DRAFT',
      });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('logs in with valid credentials', async () => {
      await request(app)
        .post('/api/v1/auth/register/customer')
        .send(customerPayload);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: customerEmail,
          password: customerPayload.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toEqual(expect.any(String));
      expect(response.body.data.user.email).toBe(customerEmail);
      expect(response.body.data.user.role).toBe('CUSTOMER');
    });

    it('rejects an incorrect password', async () => {
      await request(app)
        .post('/api/v1/auth/register/customer')
        .send(customerPayload);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: customerEmail,
          password: 'WrongPassword@2026',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('rejects requests without an access token', async () => {
      const response = await request(app).get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns the authenticated customer and profile', async () => {
      const registrationResponse = await request(app)
        .post('/api/v1/auth/register/customer')
        .send(customerPayload);

      const accessToken = registrationResponse.body.data.accessToken;

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        email: customerEmail,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        customer: {
          phone: '+94771234567',
        },
        vendor: null,
      });
    });

    it('returns the authenticated vendor and vendor profile', async () => {
      const registrationResponse = await request(app)
        .post('/api/v1/auth/register/vendor')
        .send(vendorPayload);

      const accessToken = registrationResponse.body.data.accessToken;

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        email: vendorEmail,
        role: 'VENDOR',
        customer: null,
        vendor: {
          businessName: 'Moonlight Photography',
          slug: 'moonlight-photography',
          verificationStatus: 'DRAFT',
        },
      });
    });
  });
});
