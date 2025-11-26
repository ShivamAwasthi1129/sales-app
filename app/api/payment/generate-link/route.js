import { NextResponse } from 'next/server';
import { createQuotationPaymentLink } from '../../../../lib/stripe.js';
import connectDB from '../../../../lib/mongodb.js';
import Quotation from '../../../../models/Quotation.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { quotationId, quotationNo } = body;

    if (!quotationId && !quotationNo) {
      return NextResponse.json(
        { error: 'Quotation ID or quotation number is required' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Find quotation
    let quotation = null;
    if (quotationNo) {
      quotation = await Quotation.findOne({ quotationNo: quotationNo });
    } else if (quotationId) {
      quotation = await Quotation.findById(quotationId);
    }

    if (!quotation) {
      return NextResponse.json(
        { error: 'Quotation not found' },
        { status: 404 }
      );
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    // Convert quotation to format expected by createQuotationPaymentLink
    const quotationData = {
      id: quotation._id.toString(),
      quotationNo: quotation.quotationNo,
      currency: quotation.currency,
      totalAmount: quotation.totalAmount,
      to: quotation.to,
      lineItems: quotation.lineItems.map(item => ({
        itemName: item.itemName,
        description: item.description,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
        rate: item.rate,
        total: item.total,
        isSubscription: item.isSubscription,
        subscriptionDetails: item.subscriptionDetails,
        selectedOptions: item.selectedOptions,
      })),
    };

    // Generate payment link
    const paymentLink = await createQuotationPaymentLink(quotationData);

    return NextResponse.json({
      success: true,
      paymentLink: paymentLink,
      quotationNo: quotation.quotationNo,
    });
  } catch (error) {
    console.error('Error generating payment link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate payment link' },
      { status: 500 }
    );
  }
}

