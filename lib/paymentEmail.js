import { sendEmail } from './email.js';

const BRAND_COLOR = '#1e3a5f';
const GREEN = '#059669';
const YEAR = new Date().getFullYear();

/**
 * Shared email shell for payment emails
 */
const emailShell = (headerText, bodyContent) => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${headerText}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    body { margin: 0; padding: 0; width: 100% !important; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-pad { padding-left: 16px !important; padding-right: 16px !important; }
      .stack-column { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f5f7;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="margin: 0 auto; max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${GREEN}; padding: 28px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">${headerText}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;" class="mobile-pad">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                This is an automated confirmation email. Please do not reply.<br>
                &copy; ${YEAR} Sales Management System. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

/**
 * Bulletproof CTA button
 */
const ctaButton = (url, text, bgColor = GREEN) => `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px auto;">
  <tr>
    <td style="border-radius: 6px; background: ${bgColor};">
      <a href="${url}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px; background-color: ${bgColor}; font-family: Arial, Helvetica, sans-serif;">${text}</a>
    </td>
  </tr>
</table>`;

/**
 * Info row helper
 */
const infoRow = (label, value, isLast = false) => `
<tr>
  <td style="padding: 10px 12px; font-size: 14px; color: #6b7280; font-weight: 600; border-bottom: ${isLast ? 'none' : '1px solid #f3f4f6'}; width: 45%;">${label}</td>
  <td style="padding: 10px 12px; font-size: 14px; color: #1f2937; border-bottom: ${isLast ? 'none' : '1px solid #f3f4f6'}; text-align: right;">${value}</td>
</tr>`;

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

    const dashboardUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/customer/dashboard`;

    let detailRows = '';
    detailRows += infoRow('Quotation No', `<strong>#${quotationNo}</strong>`);
    detailRows += infoRow('Invoice No', `<strong>#${invoiceNo}</strong>`);
    detailRows += infoRow('Amount Paid', `<strong style="font-size: 18px; color: ${GREEN};">${formattedAmount}</strong>`);
    detailRows += infoRow('Payment Date', formattedDate);
    detailRows += infoRow('Status', `<span style="background: ${GREEN}; color: #fff; padding: 3px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">PAID</span>`, true);

    const bodyContent = `
      <p style="margin: 0 0 16px; font-size: 16px; color: #1f2937; line-height: 1.5;">Dear <strong>${customerName}</strong>,</p>
      <p style="margin: 0 0 24px; font-size: 15px; color: #4b5563; line-height: 1.6;">
        We are pleased to confirm that your payment has been successfully processed. Thank you for your business!
      </p>

      <!-- Payment Details -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0fdf4; border-radius: 6px; overflow: hidden; margin-bottom: 24px;">
        <tr><td style="padding: 14px 12px 4px; font-size: 13px; font-weight: 700; color: ${GREEN}; text-transform: uppercase; letter-spacing: 0.5px;">Payment Details</td></tr>
        <tr>
          <td style="padding: 0 12px 14px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #ffffff; border-radius: 4px;">
              ${detailRows}
            </table>
          </td>
        </tr>
      </table>

      <!-- What's Next -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
        <tr>
          <td style="padding: 14px 16px; background-color: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 4px;">
            <p style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #1e40af;">What's Next?</p>
            <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.7;">
              &#8226; Your invoice has been generated and is ready for download<br>
              &#8226; Access your invoice from your customer dashboard<br>
              &#8226; A receipt has been sent to your registered email<br>
              &#8226; Questions? Don't hesitate to contact us
            </p>
          </td>
        </tr>
      </table>

      ${ctaButton(dashboardUrl, 'View Your Dashboard')}

      <!-- Important notice -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0 20px;">
        <tr>
          <td style="padding: 12px 14px; background-color: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 13px; color: #92400e; line-height: 1.5;">
            <strong>Important:</strong> Please keep this email for your records. If you did not make this payment, contact support immediately.
          </td>
        </tr>
      </table>

      <p style="margin: 16px 0 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
        Thank you for choosing ${companyName}. We appreciate your business.
      </p>
      <p style="margin: 16px 0 0; font-size: 14px; color: #6b7280;">
        Best regards,<br><strong style="color: #1f2937;">${companyName} Team</strong>
      </p>
    `;

    const emailSubject = `Payment Confirmed - Quotation #${quotationNo}`;

    await sendEmail({
      to: customerEmail,
      subject: emailSubject,
      html: emailShell('Payment Successful!', bodyContent),
    });

    console.log(`Payment confirmation email sent to: ${customerEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
    return { success: false, error: error.message };
  }
}
