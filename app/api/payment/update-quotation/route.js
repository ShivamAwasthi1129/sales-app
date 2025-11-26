import { NextResponse } from 'next/server';

const UPDATE_QUOTATION_PAYMENT_MUTATION = `
  mutation UpdateQuotationPayment($id: ID!, $payment: PaymentInfoInput!, $status: String) {
    updateQuotationPayment(id: $id, payment: $payment, status: $status) {
      id
      quotationNo
      status
      payment {
        sessionId
        paymentStatus
        amount
        currency
        customerEmail
        paymentMode
        subscriptionId
        paidAt
      }
    }
  }
`;

export async function POST(request) {
  try {
    const body = await request.json();
    const { quotationId, payment, status } = body;

    if (!quotationId || !payment) {
      return NextResponse.json(
        { error: 'Quotation ID and payment information are required' },
        { status: 400 }
      );
    }

    // Get GraphQL endpoint URL
    const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/graphql`;

    // Call GraphQL mutation
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: UPDATE_QUOTATION_PAYMENT_MUTATION,
        variables: {
          id: quotationId,
          payment: {
            sessionId: payment.sessionId,
            paymentStatus: payment.paymentStatus || 'paid',
            amount: payment.amount,
            currency: payment.currency,
            customerEmail: payment.customerEmail,
            paymentMode: payment.paymentMode || 'payment',
            subscriptionId: payment.subscriptionId ? (typeof payment.subscriptionId === 'string' ? payment.subscriptionId : payment.subscriptionId.id || payment.subscriptionId.toString()) : null,
            paidAt: payment.paidAt || new Date().toISOString(),
          },
          status: status || 'paid',
        },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return NextResponse.json(
        { error: result.errors[0]?.message || 'Failed to update quotation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      quotation: result.data.updateQuotationPayment,
    });
  } catch (error) {
    console.error('Error updating quotation payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update quotation payment' },
      { status: 500 }
    );
  }
}

