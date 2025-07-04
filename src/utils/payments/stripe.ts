'use server'

import { createClient as createClientLocal } from "@/utils/supabase/client";
import { Stripe } from "stripe";

export async function createStripeSession() {

    // Instantiate Stripe only on the server to avoid bundling the secret key in the client.
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    try {
        const supabase = await createClientLocal();

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
        
        if (!profile.stripe_customer_id) {
            throw new Error("No Stripe customer found");
        }
        
        console.log("Subscription plan: " + profile.subscription_plan);
        // Create Portal session if already subscribed
        
        if (profile.subscription_plan === "plus") {
            const session = await stripe.billingPortal.sessions.create({
                customer: profile.stripe_customer_id,
                return_url: `${origin}`,
            });

            return session.url
        }

        const { url } = await stripe.checkout.sessions.create({
            customer: profile.stripe_customer_id,
            payment_method_types: ["card"],
            line_items: [{
                price: "price_1QynKDPDHTn4Rw2wRlLeYMUk",
                quantity: 1
            }],
            mode: "subscription",
            success_url: `${origin}`,
            cancel_url: `${origin}`,
        
        })

        return url;
    } catch(error) {
        console.error("Error in create-stripe-session: " + error)
        return `${origin}/error`;
    }
}

/*
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
}*/