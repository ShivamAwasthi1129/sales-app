import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import connectDB from '../../../../lib/mongodb.js';
import Quotation from '../../../../models/Quotation.js';
import User from '../../../../models/User.js';
import { sendWelcomeEmail } from '../../../../lib/email.js';

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Helper function to generate random password
const generatePassword = () => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// Helper function to create or get Client user
const createOrGetClient = async (email, name, phone, address) => {
  await connectDB();
  
  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  
  if (existingUser) {
    // If user exists but is not a Client, we might want to update or skip
    // For now, we'll just return the existing user
    if (existingUser.role === 'Customer') {
      return existingUser;
    }
    // If user exists with different role, we'll still return it
    // You might want to handle this differently based on your business logic
    return existingUser;
  }
  
  // Generate a random password
  const password = generatePassword();
  
  // Store password before hashing (for email)
  const plainPassword = password;
  
  // Create new Client user
  const newUser = await User.create({
    name: name || email.split('@')[0], // Use email prefix if name not provided
    email: email.toLowerCase(),
    password: plainPassword, // Will be hashed by pre-save hook
    role: 'Customer',
    phone: phone || '',
    address: address || '',
    status: 'Active',
  });
  
  // Send welcome email with password (use plain password before it was hashed)
  try {
    await sendWelcomeEmail({
      name: newUser.name,
      email: newUser.email,
      password: plainPassword, // Send plain password
      role: newUser.role,
      phone: newUser.phone || '',
      address: newUser.address || '',
      status: newUser.status,
    });
    console.log(`Welcome email sent to new Client: ${newUser.email}`);
  } catch (emailError) {
    console.error('Failed to send welcome email to new Client:', emailError);
    // Don't throw error, user creation should still succeed
  }
  
  return newUser;
};

// Update quotation with payment information
const updateQuotationPayment = async (identifier, paymentData, quotationNo = null) => {
  await connectDB();
  
  // Find quotation by quotationNo (preferred) or identifier (quotationId as fallback)
  let quotation = null;
  if (quotationNo) {
    quotation = await Quotation.findOne({ quotationNo: quotationNo });
    console.log(`Webhook: Searching quotation by quotationNo: ${quotationNo}`);
  } else {
    quotation = await Quotation.findById(identifier);
    console.log(`Webhook: Searching quotation by quotationId: ${identifier}`);
  }
  
  if (!quotation) {
    throw new Error(`Quotation not found: ${quotationNo || identifier}`);
  }
  
  // Update payment information
  quotation.payment = {
    sessionId: paymentData.sessionId,
    paymentStatus: paymentData.paymentStatus || 'paid',
    amount: paymentData.amount || quotation.totalAmount,
    currency: paymentData.currency || quotation.currency,
    customerEmail: paymentData.customerEmail || quotation.to?.email,
    paymentMode: paymentData.paymentMode || 'payment',
    subscriptionId: paymentData.subscriptionId || null,
    paidAt: paymentData.paidAt ? new Date(paymentData.paidAt) : new Date(),
  };
  
  // Update status to 'paid'
  quotation.status = 'paid';
  
  await quotation.save();
  
  return quotation;
};

export async function POST(request) {
  if (!stripe || !webhookSecret) {
    console.error('Stripe or webhook secret not configured');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Extract quotation number (preferred) or ID (fallback) from metadata
      const quotationNo = session.metadata?.quotationNo;
      const quotationId = session.metadata?.quotationId;
      
      if (!quotationNo && !quotationId) {
        console.error('No quotation number or ID found in session metadata');
        return NextResponse.json(
          { error: 'No quotation number or ID in metadata' },
          { status: 400 }
        );
      }

      // Get customer email
      const customerEmail = session.customer_email || session.customer_details?.email;
      const customerName = session.customer_details?.name || '';
      
      // Extract payment details
      const paymentData = {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency,
        customerEmail: customerEmail,
        paymentMode: session.mode, // 'payment' or 'subscription'
        subscriptionId: session.subscription ? (typeof session.subscription === 'string' ? session.subscription : session.subscription.id || session.subscription.toString()) : null,
        paidAt: new Date().toISOString(),
      };

      // Update quotation with payment information (using quotationNo or quotationId)
      const identifier = quotationNo || quotationId;
      await updateQuotationPayment(identifier, paymentData, quotationNo);
      console.log(`Quotation ${quotationNo || quotationId} updated with payment information`);

      // Check if client exists, create if not
      if (customerEmail) {
        try {
          // Get quotation to get client details (re-fetch to get latest data)
          let quotation = null;
          if (quotationNo) {
            quotation = await Quotation.findOne({ quotationNo: quotationNo });
          } else if (quotationId) {
            quotation = await Quotation.findById(quotationId);
          }
          
          if (quotation && quotation.to) {
            const clientUser = await createOrGetClient(
              customerEmail,
              customerName || quotation.to.businessName || customerEmail.split('@')[0],
              quotation.to.phone || '',
              quotation.to.address || ''
            );
            
            // Link client to quotation if not already linked
            if (!quotation.clientId || quotation.clientId.toString() !== clientUser._id.toString()) {
              quotation.clientId = clientUser._id;
              await quotation.save();
              console.log(`Client linked to quotation: ${clientUser.email}`);
            }
            
            console.log(`Client account checked/created: ${clientUser.email} (${clientUser.role})`);
          } else {
            console.warn(`Quotation ${quotationId} not found or missing 'to' field`);
          }
        } catch (clientError) {
          console.error('Error creating/getting client account:', clientError);
          // Don't fail the webhook if client creation fails - payment was successful
        }
      } else {
        console.warn('No customer email found in session, skipping client account creation');
      }

      return NextResponse.json({ received: true, quotationNo: quotationNo || quotationId, quotationId });
    } else if (event.type === 'payment_intent.succeeded') {
      // Handle payment intent succeeded if needed
      console.log('Payment intent succeeded:', event.data.object.id);
      return NextResponse.json({ received: true });
    } else {
      console.log(`Unhandled event type: ${event.type}`);
      return NextResponse.json({ received: true });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

