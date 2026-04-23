'use server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27-acacia' as any,
});

export async function createCheckoutSession() {
  const headersList = await headers();
  const origin = headersList.get('origin');

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${origin}/?success=true`,
    cancel_url: `${origin}/?canceled=true`,
  });

  return { url: session.url };
}
