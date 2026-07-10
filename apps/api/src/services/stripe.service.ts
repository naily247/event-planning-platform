import Stripe from 'stripe';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

let stripeClient: Stripe | null = null;

export const getStripeClient = () => {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError(
      503,
      'Stripe payment service is not configured',
      'STRIPE_NOT_CONFIGURED',
    );
  }

  stripeClient ??= new Stripe(env.STRIPE_SECRET_KEY);

  return stripeClient;
};

export const constructStripeWebhookEvent = (
  payload: Buffer,
  signature: string | string[] | undefined,
) => {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new AppError(
      503,
      'Stripe webhook service is not configured',
      'STRIPE_WEBHOOK_NOT_CONFIGURED',
    );
  }

  if (!signature || Array.isArray(signature)) {
    throw new AppError(400, 'Missing Stripe webhook signature', 'STRIPE_SIGNATURE_MISSING');
  }

  try {
    return getStripeClient().webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    throw new AppError(400, 'Invalid Stripe webhook signature', 'STRIPE_SIGNATURE_INVALID');
  }
};