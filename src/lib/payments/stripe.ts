
import { createClient } from "@/utils/supabase/client";
import Stripe from "stripe"

const stripe = new Stripe("sk_test_51QykwoPDHTn4Rw2wVWrFxuKoVFc2T2OWyNQZefvO1key4MIywA4fsBh9W4YZEZedlPoTdwNVLfKP2A22d7dIYhmn00t3bSetbx", {
    apiVersion: "2025-02-24.acacia",
    typescript: true 
})

type SessionProps = {
    userId: string;
}

export async function createStripeSession() {

    try {
        const supabase = await createClient();

        const { data, error } = await supabase.auth.getUser()

        if(error)
            throw new Error("Authentication failed.")

        if(!data.user)
            throw new Error("No user found")

        // First try to get the profile
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("stripe_customer_id, subscription_plan")
            .eq("user_id", data.user.id)
            .single();

        if (profileError) {
            console.log("Profile error:", profileError);
            throw profileError;
        }

        if (!profile) {
            throw new Error("No profile found");
        }

        console.log(`🔎 Found profile: ${profile}`);
        
        if (!profile?.stripe_customer_id) {
            throw new Error("No Stripe customer found");
        }

        // Create Portal session if already subscribed
        if (profile.subscription_plan === "plus") {
            const session = await stripe.billingPortal.sessions.create({
                customer: profile.stripe_customer_id,
                return_url: `${origin}`,
            });
        }

        const { url } = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{
                price: "price_1QynKDPDHTn4Rw2wRlLeYMUk",
                quantity: 1
            }],
            mode: "subscription",
            success_url: `${origin}`,
            cancel_url: `${origin}/error`,
        
        })

        return url;
    } catch(error) {
        console.error("Error in create-stripe-session: " + error)
        return `${origin}/error`;
    }
}

export async function handlePurchaseSubscription(subscription: Stripe.CheckoutSessionCompletedEvent) {
    console.log("Payment was successful " +  subscription.data.object.metadata)
}

export async function getStripeProducts() {
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price']
    });
  
    return products.data.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      defaultPriceId:
        typeof product.default_price === 'string'
          ? product.default_price
          : product.default_price?.id
    }));
}