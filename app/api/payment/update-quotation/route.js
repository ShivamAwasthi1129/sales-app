import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import Quotation from '../../../../models/Quotation.js';
import QuotationStatusHistory from '../../../../models/QuotationStatusHistory.js';
import User from '../../../../models/User.js';
import { sendWelcomeEmail, sendPaymentReceiptEmail } from '../../../../lib/email.js';

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
    // If user exists, return it
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
  
  // Send welcome email with password
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

export async function POST(request) {
  try {
    const body = await request.json();
    const { quotationId, quotationNo, payment, status } = body;

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment information is required' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Find quotation by quotationNo (preferred) or quotationId (fallback)
    let quotation = null;
    if (quotationNo) {
      quotation = await Quotation.findOne({ quotationNo: quotationNo });
      console.log(`Searching quotation by quotationNo: ${quotationNo}`);
    } else if (quotationId) {
      quotation = await Quotation.findById(quotationId);
      console.log(`Searching quotation by quotationId: ${quotationId}`);
    } else {
      return NextResponse.json(
        { error: 'Quotation number or ID is required' },
        { status: 400 }
      );
    }
    
    if (!quotation) {
      return NextResponse.json(
        { error: 'Quotation not found' },
        { status: 404 }
      );
    }

    // Update payment information
    quotation.payment = {
      sessionId: payment.sessionId,
      paymentStatus: payment.paymentStatus || 'paid',
      amount: payment.amount || quotation.totalAmount,
      currency: payment.currency || quotation.currency,
      customerEmail: payment.customerEmail || quotation.to?.email,
      paymentMode: payment.paymentMode || 'payment',
      subscriptionId: payment.subscriptionId ? (typeof payment.subscriptionId === 'string' ? payment.subscriptionId : payment.subscriptionId.id || payment.subscriptionId.toString()) : null,
      paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date(),
    };

    // Update status to 'paid'
    const oldStatus = quotation.status;
    const newStatus = status || 'paid';
    quotation.status = newStatus;

    if (oldStatus !== newStatus) {
      try {
        await QuotationStatusHistory.create({
          quotationId: quotation._id,
          status: newStatus,
          changedBy: null,
          changedByEmail: payment.customerEmail || quotation.to?.email || '',
          changedByName: 'Payment System',
          changedByRole: 'System',
          updateType: 'payment_update',
          reason: 'Payment Success',
          notes: `Payment processed - Session ID: ${payment.sessionId}`,
        });
        console.log(`[update-quotation] Status history recorded: ${newStatus}`);
      } catch (historyError) {
        console.error('Error creating quotation status history:', historyError);
      }
    }

    // Create or get client account if customer email exists
    const customerEmail = payment.customerEmail || quotation.to?.email;
    if (customerEmail) {
      try {
        const clientUser = await createOrGetClient(
          customerEmail,
          quotation.to?.businessName || customerEmail.split('@')[0],
          quotation.to?.phone || '',
          quotation.to?.address || ''
        );
        
        // Link client to quotation if not already linked
        if (!quotation.clientId || quotation.clientId.toString() !== clientUser._id.toString()) {
          quotation.clientId = clientUser._id;
          console.log(`Client linked to quotation: ${clientUser.email}`);
        }
      } catch (clientError) {
        console.error('Error creating/getting client account:', clientError);
        // Don't fail the request if client creation fails - payment was successful
      }
    }

    await quotation.save();

    console.log(`Quotation ${quotation.quotationNo || quotationId} (${quotation._id}) updated with payment information via API`);

    // Send payment receipt email
    if (newStatus === 'paid') {
      try {
        await sendPaymentReceiptEmail(quotation, payment);
      } catch (emailErr) {
        console.error('Failed to send payment receipt email:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      quotation: {
        id: quotation._id.toString(),
        quotationNo: quotation.quotationNo,
        status: quotation.status,
        payment: {
          sessionId: quotation.payment.sessionId,
          paymentStatus: quotation.payment.paymentStatus,
          amount: quotation.payment.amount,
          currency: quotation.payment.currency,
          customerEmail: quotation.payment.customerEmail,
          paymentMode: quotation.payment.paymentMode,
          subscriptionId: quotation.payment.subscriptionId,
          paidAt: quotation.payment.paidAt?.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error updating quotation payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update quotation payment' },
      { status: 500 }
    );
  }
}

