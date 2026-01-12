import { NextResponse } from 'next/server';
import { updateSubscription } from '@/lib/db';
import Stripe from 'stripe';

export async function POST(request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey);
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    let event;

    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    } else {
      event = JSON.parse(body);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId || session.subscription_data?.metadata?.userId;

        if (userId && session.subscription) {
          await updateSubscription(
            parseInt(userId),
            'pro',
            session.customer,
            session.subscription
          );
          console.log(`User ${userId} subscribed successfully`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId) {
          const status = subscription.status === 'active' ? 'pro' : 'free';
          await updateSubscription(
            parseInt(userId),
            status,
            subscription.customer,
            subscription.id
          );
          console.log(`User ${userId} subscription updated to ${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await updateSubscription(parseInt(userId), 'free', subscription.customer, null);
          console.log(`User ${userId} subscription cancelled`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`Payment failed for customer ${invoice.customer}`);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
