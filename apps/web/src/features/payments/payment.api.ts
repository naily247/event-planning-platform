import { api } from '../../lib/api';

export const paymentStatuses = [
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const;

export const paymentMethods = ['BANK_TRANSFER', 'STRIPE_CHECKOUT'] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];

export type PaymentMethod = (typeof paymentMethods)[number];

export type PaymentUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type PaymentEvent = {
  id: string;
  name: string;
  eventType: string;
  eventDate: string;
  location: string;

  owner: PaymentUser;
};

export type PaymentVendor = {
  id: string;
  businessName: string;
  slug: string;
  contactPhone: string | null;
  baseLocation: string | null;
};

export type PaymentAcceptedQuotation = {
  id: string;
  proposedPrice: string;
  depositAmount: string | null;
};

export type PaymentBooking = {
  id: string;
  status:
    | 'AWAITING_VENDOR_CONFIRMATION'
    | 'CONFIRMED'
    | 'DEPOSIT_PENDING'
    | 'ACTIVE'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'REJECTED'
    | 'DISPUTED';

  agreedCost: string;
  serviceStart: string;
  serviceEnd: string | null;

  event: PaymentEvent;
  vendor: PaymentVendor;
  acceptedQuotation: PaymentAcceptedQuotation;
};

export type CustomerPayment = {
  id: string;
  bookingId: string;
  submittedById: string;
  reviewedById: string | null;

  amount: string;
  status: PaymentStatus;
  method: PaymentMethod;
  referenceNumber: string;

  proofFileUrl: string | null;
  proofFilePublicId: string | null;
  proofFileOriginalName: string | null;
  proofFileMimeType: string | null;
  proofFileSize: number | null;

  reviewedAt: string | null;
  rejectionReason: string | null;

  submittedBy: PaymentUser;
  reviewedBy: PaymentUser | null;
  booking: PaymentBooking;

  createdAt: string;
  updatedAt: string;
};

export type SubmitManualPaymentInput = {
  referenceNumber: string;
};

export type SubmitManualPaymentWithProofInput = {
  referenceNumber: string;
  file: File;
};

export type StripeCheckoutResult = {
  payment: CustomerPayment;

  checkout: {
    sessionId: string;
    checkoutUrl: string;
  };
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

type CustomerPaymentListResponse = ApiSuccessResponse<CustomerPayment[]> & {
  meta: {
    count: number;
  };
};

export async function getCustomerBookingPayments(bookingId: string) {
  const response = await api.get<CustomerPaymentListResponse>(`/payments/bookings/${bookingId}`);

  return {
    payments: response.data.data,
    count: response.data.meta.count,
  };
}

export async function submitManualPayment(bookingId: string, input: SubmitManualPaymentInput) {
  const response = await api.post<ApiSuccessResponse<CustomerPayment>>(
    `/payments/bookings/${bookingId}/manual`,
    {
      method: 'BANK_TRANSFER',
      referenceNumber: input.referenceNumber,
    },
  );

  return response.data.data;
}

export async function submitManualPaymentWithProof(
  bookingId: string,
  input: SubmitManualPaymentWithProofInput,
) {
  const formData = new FormData();

  formData.append('referenceNumber', input.referenceNumber);
  formData.append('file', input.file);

  const response = await api.post<ApiSuccessResponse<CustomerPayment>>(
    `/payments/bookings/${bookingId}/manual/proof`,
    formData,
  );

  return response.data.data;
}

export async function createStripeCheckoutSession(bookingId: string) {
  const response = await api.post<ApiSuccessResponse<StripeCheckoutResult>>(
    `/payments/bookings/${bookingId}/checkout-session`,
  );

  return response.data.data;
}
