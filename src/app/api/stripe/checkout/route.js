import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import Stripe from 'stripe';

export async function POST(request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
    }

    const dbUser = await getUserById(user.id);
    const stripe = new Stripe(stripeKey);

    const { priceId } = await request.json();

    // Create or retrieve customer
    let customerId = dbUser.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: dbUser.email,
        metadata: { userId: user.id.toString() }
      });
      customerId = customer.id;

      // Save customer ID
      const { updateUser } = await import('@/lib/db');
      await updateUser(user.id, { stripe_customer_id: customerId });
    }

    // Get the base URL
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId || process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
      subscription_data: {
        metadata: { userId: user.id.toString() }
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
