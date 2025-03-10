import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  let event: Stripe.Event;

  const body = await request.text()

  try {
    const stripeSignature = request.headers.get('stripe-signature');

    event = stripe.webhooks.constructEvent(
      body,
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
  console.log('✅ Success:', event.type);

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    switch (event.type) {
      case "checkout.session.completed": {
        console.log("Entered session completed")
        const session = event.data.object;
        const { data, error } = await supabase
          .from("profiles")
          .update(
            {
              subscription_plan: "plus",
              updated_at: new Date().toISOString()
            })
          .eq("stripe_customer_id", "cus_RunSPdi2fZ4TPb")
          
        if(error)
          throw new Error("Failed to update table " + error)

        console.log(data)
        console.log(session.customer)
          
        break
      }
    }

  } catch(error) {
      console.log(`Webhook Error: ` + error)
  }

  console.log("Ended webhook")
  return NextResponse.json({});
}