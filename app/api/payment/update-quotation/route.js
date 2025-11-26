import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import Quotation from '../../../../models/Quotation.js';

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
    if (status) {
      quotation.status = status;
    } else {
      quotation.status = 'paid';
    }

    await quotation.save();

    console.log(`Quotation ${quotation.quotationNo || quotationId} (${quotation._id}) updated with payment information via API`);

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

