import Stripe from 'stripe';
import { handlePurchaseSubscription } from '@/lib/payments/stripe';
import { NextRequest, NextResponse } from 'next/server';

const webhookSecret = "whsec_6481456cd435f8872945ea89d0211c78192af517c4de6d921c117daa23ae2048"

const stripe = new Stripe("sk_test_51QykwoPDHTn4Rw2wVWrFxuKoVFc2T2OWyNQZefvO1key4MIywA4fsBh9W4YZEZedlPoTdwNVLfKP2A22d7dIYhmn00t3bSetbx", {
  apiVersion: "2025-02-24.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed.' },
      { status: 400 }
    );
  }

  switch (event.type) {
    case 'checkout.session.completed':
        const payment_status = event.data.object.payment_status;
        if(payment_status === "paid") {
            await handlePurchaseSubscription(event);
            break
        }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      //await handleSubscriptionChange(subscription);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}