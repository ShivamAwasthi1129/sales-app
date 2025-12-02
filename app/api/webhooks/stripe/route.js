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
  
  // Import QuotationStatusHistory
  const QuotationStatusHistory = (await import('../../../../models/QuotationStatusHistory.js')).default;
  
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
  
  const oldStatus = quotation.status;
  
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
  
  // Record status history if status changed
  if (oldStatus !== 'paid') {
    try {
      const updatedQuotation = await Quotation.findById(quotation._id).lean();
      await QuotationStatusHistory.create({
        quotationId: quotation._id,
        status: 'paid',
        changedBy: null, // Webhook - no user
        changedByEmail: paymentData.customerEmail || quotation.to?.email || '',
        changedByName: 'Payment System',
        changedByRole: 'System',
        updateType: 'payment_update',
        reason: `Payment Success`,
        notes: `Payment processed via Stripe - Session ID: ${paymentData.sessionId}`,
        quotationSnapshot: JSON.stringify(updatedQuotation),
      });
      console.log('[Webhook] Status history recorded: payment processed');
    } catch (statusHistoryError) {
      console.error('[Webhook] Error recording status history:', statusHistoryError);
      // Don't fail the webhook if status history fails
    }
  }
  
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

      // STEP 1: Create/Get client and link to quotation FIRST (before invoice generation)
      let clientUser = null;
      let quotation = null;
      if (customerEmail) {
        try {
          // Get quotation to get client details
          if (quotationNo) {
            quotation = await Quotation.findOne({ quotationNo: quotationNo });
          } else if (quotationId) {
            quotation = await Quotation.findById(quotationId);
          }
          
          if (quotation && quotation.to) {
            clientUser = await createOrGetClient(
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
          // Continue - we'll still try to generate invoice
        }
      } else {
        console.warn('No customer email found in session, skipping client account creation');
      }

      // STEP 2: Generate Invoice AFTER client is linked to quotation
      let generatedInvoice = null;
      try {
        const { generateInvoiceFromQuotation } = await import('../../../../lib/invoiceGenerator.js');
        
        // Get quotation ID (prefer from database lookup if we have quotationNo)
        let finalQuotationId = quotationId;
        if (quotationNo && !quotationId) {
          if (!quotation) {
            quotation = await Quotation.findOne({ quotationNo: quotationNo });
          }
          if (quotation) {
            finalQuotationId = quotation._id.toString();
          }
        }
        
        if (finalQuotationId) {
          generatedInvoice = await generateInvoiceFromQuotation({
            quotationId: finalQuotationId,
            paymentTransactionId: session.id,
            paymentMethod: 'Stripe',
            paymentDate: new Date(),
          });
          console.log(`✅ Invoice generated: ${generatedInvoice.invoiceNo} for quotation ${quotationNo || quotationId}`);
          
          // STEP 2b: Also update the invoice with the correct customerId if it wasn't set
          if (clientUser && generatedInvoice && (!generatedInvoice.customerId || generatedInvoice.customerId.toString() !== clientUser._id.toString())) {
            const Invoice = (await import('../../../../models/Invoice.js')).default;
            await Invoice.findByIdAndUpdate(generatedInvoice._id, { customerId: clientUser._id });
            console.log(`✅ Invoice customerId updated to: ${clientUser._id}`);
          }
        } else {
          console.error('Cannot generate invoice: quotation ID not found');
        }
      } catch (invoiceError) {
        console.error('Error generating invoice:', invoiceError);
        // Don't fail the webhook if invoice generation fails - payment was successful
      }
      
      // STEP 3: Send payment confirmation email to customer
      if (customerEmail && generatedInvoice) {
        try {
          const { sendPaymentConfirmationEmail } = await import('../../../../lib/paymentEmail.js');
          
          // Re-fetch quotation if we don't have it
          if (!quotation) {
            if (quotationNo) {
              quotation = await Quotation.findOne({ quotationNo: quotationNo });
            } else if (quotationId) {
              quotation = await Quotation.findById(quotationId);
            }
          }
          
          if (quotation) {
            await sendPaymentConfirmationEmail({
              customerName: customerName || quotation.to?.businessName || 'Customer',
              customerEmail: customerEmail,
              quotationNo: quotationNo || quotation.quotationNo,
              invoiceNo: generatedInvoice.invoiceNo,
              amount: paymentData.amount,
              currency: paymentData.currency?.toUpperCase() || 'USD',
              paymentDate: new Date(),
              companyName: quotation.from?.businessName || 'Sales Management System',
            });
            console.log(`✅ Payment confirmation email sent to: ${customerEmail}`);
          }
        } catch (emailError) {
          console.error('Error sending payment confirmation email:', emailError);
          // Don't fail the webhook if email fails
        }
      }

      return NextResponse.json({ received: true, quotationNo: quotationNo || quotationId, quotationId });
    } else if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      // Handle subscription creation/update
      const subscription = event.data.object;
      console.log(`Subscription ${event.type}:`, subscription.id);
      
      try {
        const Subscription = (await import('../../../../models/Subscription.js')).default;
        
        // Find user by Stripe customer ID or email
        const stripeCustomerId = subscription.customer;
        let user = await User.findOne({ stripeCustomerId }).lean();
        
        // If not found by stripeCustomerId, try to find by email from Stripe customer
        if (!user && stripeCustomerId) {
          try {
            const stripe = (await import('stripe')).default;
            const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY);
            const stripeCustomer = await stripeClient.customers.retrieve(stripeCustomerId);
            if (stripeCustomer.email) {
              user = await User.findOne({ email: stripeCustomer.email.toLowerCase() }).lean();
              // Update user with stripeCustomerId for future lookups
              if (user) {
                await User.findByIdAndUpdate(user._id, { stripeCustomerId });
              }
            }
          } catch (stripeErr) {
            console.error('Error fetching Stripe customer:', stripeErr);
          }
        }
        
        if (!user) {
          console.warn('No user found for subscription:', subscription.id);
          return NextResponse.json({ received: true, warning: 'No user found for subscription' });
        }
        
        // Check if subscription already exists
        const existingSubscription = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
        
        // Get product info from subscription items
        let productId = null;
        let priceItems = [];
        if (subscription.items?.data?.length > 0) {
          const firstItem = subscription.items.data[0];
          if (firstItem.price?.product) {
            // Try to find local product by Stripe product ID
            const Product = (await import('../../../../models/Product.js')).default;
            const product = await Product.findOne({ stripeProductId: firstItem.price.product }).lean();
            if (product) {
              productId = product._id;
            }
          }
          // Extract price IDs
          priceItems = subscription.items.data.map(item => item.price?.id).filter(Boolean);
        }
        
        const subscriptionData = {
          userId: user._id,
          productId: productId,
          priceItems: [],
          configurationSnapshot: [],
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: stripeCustomerId,
          status: subscription.status,
          currentPeriodStart: subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : null,
          currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
          canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
          endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null,
          trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        };
        
        if (existingSubscription) {
          // Update existing subscription
          await Subscription.findByIdAndUpdate(existingSubscription._id, subscriptionData);
          console.log(`✅ Subscription updated: ${subscription.id}`);
        } else {
          // Create new subscription
          await Subscription.create(subscriptionData);
          console.log(`✅ Subscription created: ${subscription.id}`);
        }
        
        return NextResponse.json({ received: true, subscriptionId: subscription.id });
      } catch (subError) {
        console.error('Error processing subscription webhook:', subError);
        return NextResponse.json({ received: true, error: subError.message });
      }
    } else if (event.type === 'customer.subscription.deleted') {
      // Handle subscription cancellation
      const subscription = event.data.object;
      console.log('Subscription deleted:', subscription.id);
      
      try {
        const Subscription = (await import('../../../../models/Subscription.js')).default;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: subscription.id },
          { 
            status: 'canceled',
            canceledAt: new Date(),
            endedAt: new Date()
          }
        );
        console.log(`✅ Subscription marked as canceled: ${subscription.id}`);
        return NextResponse.json({ received: true, subscriptionId: subscription.id });
      } catch (subError) {
        console.error('Error processing subscription deletion:', subError);
        return NextResponse.json({ received: true, error: subError.message });
      }
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

