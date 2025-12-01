import { sendEmail } from './email.js';

/**
 * Send payment confirmation email to customer
 * @param {Object} params - Email parameters
 * @param {string} params.customerName - Customer name
 * @param {string} params.customerEmail - Customer email
 * @param {string} params.quotationNo - Quotation number
 * @param {string} params.invoiceNo - Invoice number
 * @param {number} params.amount - Payment amount
 * @param {string} params.currency - Currency code
 * @param {string} params.paymentDate - Payment date
 * @param {string} params.companyName - Company name
 */
export async function sendPaymentConfirmationEmail({
  customerName,
  customerEmail,
  quotationNo,
  invoiceNo,
  amount,
  currency = 'USD',
  paymentDate,
  companyName = 'Sales Management System',
}) {
  try {
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency;
    const formattedAmount = `${currencySymbol}${amount.toFixed(2)}`;
    const formattedDate = new Date(paymentDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const emailSubject = `✅ Payment Confirmed - Quotation #${quotationNo}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <div style="width: 80px; height: 80px; background: white; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h1 style="margin: 0; font-size: 32px; font-weight: bold;">Payment Successful!</h1>
          <p style="margin: 10px 0 0; font-size: 18px; opacity: 0.95;">Thank you for your payment</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
            Dear <strong>${customerName}</strong>,
          </p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 25px;">
            We are pleased to confirm that your payment has been successfully processed. Thank you for your business!
          </p>

          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #10b981;">
            <h2 style="margin: 0 0 20px; color: #065f46; font-size: 20px;">Payment Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #059669; font-weight: 600; border-bottom: 1px solid #d1fae5;">Quotation Number:</td>
                <td style="padding: 10px 0; color: #065f46; text-align: right; font-weight: bold; border-bottom: 1px solid #d1fae5;">#${quotationNo}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #059669; font-weight: 600; border-bottom: 1px solid #d1fae5;">Invoice Number:</td>
                <td style="padding: 10px 0; color: #065f46; text-align: right; font-weight: bold; border-bottom: 1px solid #d1fae5;">#${invoiceNo}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #059669; font-weight: 600; border-bottom: 1px solid #d1fae5;">Payment Amount:</td>
                <td style="padding: 10px 0; color: #065f46; text-align: right; font-weight: bold; font-size: 20px; border-bottom: 1px solid #d1fae5;">${formattedAmount}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #059669; font-weight: 600; border-bottom: 1px solid #d1fae5;">Payment Date:</td>
                <td style="padding: 10px 0; color: #065f46; text-align: right; font-weight: bold; border-bottom: 1px solid #d1fae5;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #059669; font-weight: 600;">Payment Status:</td>
                <td style="padding: 10px 0; text-align: right;">
                  <span style="background-color: #10b981; color: white; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: bold;">
                    ✓ PAID
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; border: 1px solid #bfdbfe; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px; color: #1e40af; font-size: 18px; display: flex; align-items: center;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="2" style="margin-right: 10px;">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              What's Next?
            </h3>
            <ul style="margin: 0; padding-left: 20px; color: #1e40af; line-height: 1.8;">
              <li>Your invoice has been generated and is ready for download</li>
              <li>You can access your invoice from your customer dashboard</li>
              <li>A receipt has been sent to your registered email address</li>
              <li>If you have any questions, please don't hesitate to contact us</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/customer/dashboard" 
               style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
              View Your Dashboard
            </a>
          </div>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-top: 25px;">
            <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
              <strong>📌 Important:</strong> Please keep this email for your records. If you did not make this payment or have any concerns, please contact our support team immediately.
            </p>
          </div>

          <p style="font-size: 16px; color: #374151; margin-top: 30px; line-height: 1.6;">
            Thank you for choosing ${companyName}. We appreciate your business and look forward to serving you again.
          </p>

          <p style="font-size: 16px; color: #374151; margin-top: 20px;">
            Best regards,<br>
            <strong>${companyName} Team</strong>
          </p>
        </div>

        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
            This is an automated confirmation email. Please do not reply to this message.
          </p>
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            © ${new Date().getFullYear()} ${companyName}. All rights reserved.
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      to: customerEmail,
      subject: emailSubject,
      html: emailBody,
    });

    console.log(`✅ Payment confirmation email sent to: ${customerEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
    return { success: false, error: error.message };
  }
}

