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

    const dbUser = getUserById(user.id);
    if (!dbUser?.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 400 });
    }

    const stripe = new Stripe(stripeKey);
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Portal error:', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
