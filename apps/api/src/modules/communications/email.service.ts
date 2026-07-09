type EmailRecipient = {
  email: string;
  name?: string | null;
};

type SendEmailInput = {
  to: EmailRecipient;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  metadata?: Record<string, string>;
};

type SendEmailResult = {
  provider: 'mock';
  messageId: string;
};

const createMockMessageId = () => {
  return `mock_email_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const isEmailDeliveryEnabled = () => {
  return process.env.EMAIL_DELIVERY_ENABLED === 'true';
};

export const sendEmail = async (input: SendEmailInput): Promise<SendEmailResult> => {
  const messageId = createMockMessageId();

  if (!isEmailDeliveryEnabled()) {
    console.info('[email:mock]', {
      messageId,
      to: input.to.email,
      subject: input.subject,
      metadata: input.metadata,
    });

    return {
      provider: 'mock',
      messageId,
    };
  }

  // Real provider integration will be added here later.
  // For now, we keep production-safe behavior by falling back to mock mode.
  console.info('[email:provider-not-configured]', {
    messageId,
    to: input.to.email,
    subject: input.subject,
    metadata: input.metadata,
  });

  return {
    provider: 'mock',
    messageId,
  };
};

export const sendInvitationEmail = async (input: {
  to: EmailRecipient;
  eventName: string;
  guestName: string;
  invitationUrl: string;
}) => {
  return sendEmail({
    to: input.to,
    subject: `Invitation to ${input.eventName}`,
    text: `Hi ${input.guestName}, you have been invited to ${input.eventName}. Respond here: ${input.invitationUrl}`,
    html: `
      <p>Hi ${input.guestName},</p>
      <p>You have been invited to <strong>${input.eventName}</strong>.</p>
      <p><a href="${input.invitationUrl}">Respond to invitation</a></p>
    `,
    metadata: {
      type: 'invitation',
      eventName: input.eventName,
    },
  });
};

export const sendBookingStatusEmail = async (input: {
  to: EmailRecipient;
  bookingId: string;
  eventName: string;
  status: string;
}) => {
  return sendEmail({
    to: input.to,
    subject: `Booking update for ${input.eventName}`,
    text: `Your booking status for ${input.eventName} is now ${input.status}.`,
    html: `
      <p>Your booking status for <strong>${input.eventName}</strong> is now <strong>${input.status}</strong>.</p>
    `,
    metadata: {
      type: 'booking_status',
      bookingId: input.bookingId,
      status: input.status,
    },
  });
};

export const sendPaymentStatusEmail = async (input: {
  to: EmailRecipient;
  paymentId: string;
  eventName: string;
  status: string;
}) => {
  return sendEmail({
    to: input.to,
    subject: `Payment update for ${input.eventName}`,
    text: `Your payment status for ${input.eventName} is now ${input.status}.`,
    html: `
      <p>Your payment status for <strong>${input.eventName}</strong> is now <strong>${input.status}</strong>.</p>
    `,
    metadata: {
      type: 'payment_status',
      paymentId: input.paymentId,
      status: input.status,
    },
  });
};

export const sendComplaintStatusEmail = async (input: {
  to: EmailRecipient;
  complaintId: string;
  status: string;
}) => {
  return sendEmail({
    to: input.to,
    subject: 'Complaint status update',
    text: `Your complaint status is now ${input.status}.`,
    html: `
      <p>Your complaint status is now <strong>${input.status}</strong>.</p>
    `,
    metadata: {
      type: 'complaint_status',
      complaintId: input.complaintId,
      status: input.status,
    },
  });
};
