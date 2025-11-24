import { NextResponse } from 'next/server';
import { sendQuotationEmail } from '../../../lib/email';

export async function POST(request) {
  try {
    const body = await request.json();
    const { quotationData, emailBody } = body;

    if (!quotationData) {
      return NextResponse.json(
        { success: false, error: 'Quotation data is required' },
        { status: 400 }
      );
    }

    if (!emailBody) {
      return NextResponse.json(
        { success: false, error: 'Email body is required' },
        { status: 400 }
      );
    }

    // Validate email addresses
    const recipients = [];
    if (quotationData.from?.email) {
      recipients.push(quotationData.from.email);
    }
    if (quotationData.to?.email) {
      recipients.push(quotationData.to.email);
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one recipient email address is required' },
        { status: 400 }
      );
    }

    // Send email
    const result = await sendQuotationEmail(quotationData, emailBody);

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        recipients: result.recipients,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || result.message || 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in send-quotation-email API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

