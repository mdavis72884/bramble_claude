import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_SECRET_KEY 
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' })
  : null;

export async function createPaymentIntent(
  amount: number,
  tenantId: string,
  userId: string,
  description: string,
  metadata: Record<string, any> = {}
): Promise<{ clientSecret: string; paymentId: string }> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    metadata: {
      tenantId,
      userId,
      ...metadata,
    },
    description,
  });

  const payment = await prisma.payment.create({
    data: {
      tenantId,
      userId,
      stripePaymentIntentId: paymentIntent.id,
      amount,
      status: 'PENDING',
      description,
      metadata,
    },
  });

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentId: payment.id,
  };
}

export async function handlePaymentSuccess(paymentIntentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
  });

  if (!payment) {
    console.error('Payment not found for intent:', paymentIntentId);
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'SUCCEEDED' },
  });

  const brambleFee = payment.amount * 0.025;
  const stripeFee = payment.amount * 0.029 + 0.30;
  const instructorAmount = payment.amount * 0.70;
  const coopAmount = payment.amount - brambleFee - stripeFee - instructorAmount;

  await prisma.ledgerEntry.createMany({
    data: [
      {
        tenantId: payment.tenantId,
        paymentId: payment.id,
        entityType: 'BRAMBLE',
        entityId: null,
        amount: brambleFee,
        description: 'Platform Fee (2.5%)',
      },
      {
        tenantId: payment.tenantId,
        paymentId: payment.id,
        entityType: 'STRIPE',
        entityId: null,
        amount: stripeFee,
        description: 'Stripe Processing Fee',
      },
      {
        tenantId: payment.tenantId,
        paymentId: payment.id,
        entityType: 'INSTRUCTOR',
        entityId: (payment.metadata as any)?.instructorId || '',
        amount: instructorAmount,
        description: 'Instructor Revenue (70%)',
      },
      {
        tenantId: payment.tenantId,
        paymentId: payment.id,
        entityType: 'COOP',
        entityId: payment.tenantId,
        amount: coopAmount,
        description: 'Co-op Revenue',
      },
    ],
  });

  console.log(`✅ Payment processed: ${payment.id}, Amount: $${payment.amount}`);
}

export async function handleWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object.id);
      break;
    
    case 'payment_intent.payment_failed':
      await prisma.payment.update({
        where: { stripePaymentIntentId: event.data.object.id },
        data: { status: 'FAILED' },
      });
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

export { stripe };
