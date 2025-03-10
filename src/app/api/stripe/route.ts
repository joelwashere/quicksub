import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { buffer } from 'stream/consumers';

const webhookSecret = "whsec_vRzlfvkYcEJMj4yVYil0HhyezgOtYz7R"

const stripe = new Stripe("sk_test_51QykwoPDHTn4Rw2wVWrFxuKoVFc2T2OWyNQZefvO1key4MIywA4fsBh9W4YZEZedlPoTdwNVLfKP2A22d7dIYhmn00t3bSetbx", {
  apiVersion: "2025-02-24.acacia",
});

export async function POST(request: NextRequest) {
  let event: Stripe.Event;

  try {
    const stripeSignature = (await headers()).get('stripe-signature');

    event = stripe.webhooks.constructEvent(
      await request.text(),
      stripeSignature as string,
      webhookSecret as string
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    // On error, log and return the error message.
    if (err! instanceof Error) console.log(err);
    console.log(`❌ Error message: ${errorMessage}`);
    return NextResponse.json(
      {message: `Webhook Error: ${errorMessage}`},
      {status: 400}
    );
  }

  // Successfully constructed event.
  console.log('✅ Success:', event.id);

    /*switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const { data, error } = await supabase
          .from("profiles")
          .update(
            {
              subscription_plan: "plus",
              updated_at: new Date().toISOString()
            })
          .eq("stripe_customer_id", session.customer)
          
        if(error)
          throw new Error("Failed to update table " + error)

        console.log(data)
          
        break
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const { data, error } = await supabase
          .from("profiles")
          .update(
            {
              subscription_plan: "free",
              updated_at: new Date().toISOString()
            })
          .eq("stripe_customer_id", subscription.customer)
          
        //if(error)
          //throw new Error("Failed to update table")

        console.log(data)
          
        break
      }
    }
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed.' },
      { status: 400 }
    );
  }

  return NextResponse.json({ received: true });*/
}