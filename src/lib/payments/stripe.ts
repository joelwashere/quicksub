
import Stripe from "stripe"

export const stripe = new Stripe("sk_test_51QykwoPDHTn4Rw2wVWrFxuKoVFc2T2OWyNQZefvO1key4MIywA4fsBh9W4YZEZedlPoTdwNVLfKP2A22d7dIYhmn00t3bSetbx", {
    apiVersion: "2025-02-24.acacia",
    typescript: true 
})

type Props = {
    userId: string;
}

export async function createCheckoutSession({userId}: Props) {

    const { url } = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
            price: "price_1QynKDPDHTn4Rw2wRlLeYMUk",
            quantity: 1
        }],
        metadata: {
            userId
        },
        mode: "subscription",
        success_url: `http://localhost:3000`,
        cancel_url: `http://localhost:3000`,
    
    })

    return url;

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