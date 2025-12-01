import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import Quotation from '../../../../models/Quotation.js';
import User from '../../../../models/User.js';
import { sendEmail } from '../../../../lib/email.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { quotationId, quotationNo, message, customerName, customerEmail } = body;

    if (!quotationId || !message) {
      return NextResponse.json(
        { error: 'Quotation ID and message are required' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Find the quotation
    const quotation = await Quotation.findById(quotationId).lean();

    if (!quotation) {
      return NextResponse.json(
        { error: 'Quotation not found' },
        { status: 404 }
      );
    }

    // Get sales person details
    let salesPersonEmail = quotation.from?.email;
    let salesPersonName = quotation.from?.salesPersonName || 'Sales Team';

    // If sales person ID is available, get their email from User model
    if (quotation.createdBy) {
      try {
        const creator = await User.findById(quotation.createdBy).lean();
        if (creator && creator.email) {
          salesPersonEmail = creator.email;
          salesPersonName = creator.name || salesPersonName;
        }
      } catch (err) {
        console.error('Error fetching creator:', err);
      }
    }

    if (!salesPersonEmail) {
      return NextResponse.json(
        { error: 'Sales person email not found' },
        { status: 400 }
      );
    }

    // Prepare email content
    const emailSubject = `🔔 Offer Request for Quotation #${quotationNo}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🤝 Offer Request</h1>
          <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">A customer is requesting a better offer</p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
            <h2 style="margin: 0 0 15px; color: #111827; font-size: 20px;">Quotation Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Quotation Number:</td>
                <td style="padding: 8px 0; color: #111827; text-align: right;">#${quotationNo}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Customer Name:</td>
                <td style="padding: 8px 0; color: #111827; text-align: right;">${customerName || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Customer Email:</td>
                <td style="padding: 8px 0; color: #111827; text-align: right;">${customerEmail || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Total Amount:</td>
                <td style="padding: 8px 0; color: #111827; text-align: right; font-weight: bold;">${quotation.currency} ${quotation.totalAmount?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Current Status:</td>
                <td style="padding: 8px 0; text-align: right;">
                  <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: capitalize;">
                    ${quotation.status}
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; border: 1px solid #fcd34d; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px; color: #92400e; font-size: 18px;">📝 Customer's Message:</h3>
            <div style="background-color: white; padding: 15px; border-radius: 6px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 14px;">
${message}
            </div>
          </div>

          <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              <strong>💡 Next Steps:</strong><br>
              1. Review the customer's request carefully<br>
              2. Prepare a revised quotation if possible<br>
              3. Reply to the customer within 24 hours<br>
              4. Contact the customer directly at: <a href="mailto:${customerEmail}" style="color: #2563eb;">${customerEmail}</a>
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/sales/quotes" 
               style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Quotation
            </a>
          </div>
        </div>

        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="margin: 0; color: #6b7280; font-size: 13px;">
            This is an automated notification from your Sales Management System.<br>
            Please do not reply to this email directly.
          </p>
        </div>
      </div>
    `;

    // Send email to sales person
    await sendEmail({
      to: salesPersonEmail,
      subject: emailSubject,
      html: emailBody,
    });

    console.log(`✅ Offer request email sent to: ${salesPersonEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Offer request sent successfully',
    });
  } catch (error) {
    console.error('Error sending offer request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send offer request' },
      { status: 500 }
    );
  }
}

