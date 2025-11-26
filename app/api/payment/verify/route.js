import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })
  : null;

export async function GET(request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'subscription'],
    });

    // Extract payment details
    const paymentDetails = {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency,
      customerEmail: session.customer_email || session.customer_details?.email,
      quotationNo: session.metadata?.quotationNo || '',
      quotationId: session.metadata?.quotationId || '',
      paymentMode: session.mode, // 'payment' or 'subscription'
      subscriptionId: session.subscription ? (typeof session.subscription === 'string' ? session.subscription : session.subscription.id || session.subscription.toString()) : null,
    };

    return NextResponse.json(paymentDetails);
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

