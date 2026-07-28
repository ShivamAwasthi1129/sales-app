import nodemailer from 'nodemailer';
import { generateQuotationPDFBuffer } from './pdfGeneratorServer.js';
import { createQuotationPaymentLink } from './stripe.js';

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

// ─── Shared Email Helpers ───────────────────────────────────────────────────

const BRAND_COLOR = '#1e3a5f';
const BRAND_LIGHT = '#f0f4f8';
const GREEN = '#059669';
const YEAR = new Date().getFullYear();

/**
 * Wraps email body content in a mobile-friendly, table-based shell.
 * All emails share this outer layout.
 */
const emailShell = (headerText, bodyContent, footerExtra = '') => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${headerText}</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .button-td, .button-a { transition: none !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    /* Mobile */
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .fluid { max-width: 100% !important; height: auto !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; }
      .stack-column-center { text-align: center !important; }
      .center-on-narrow { text-align: center !important; display: block !important; margin-left: auto !important; margin-right: auto !important; float: none !important; }
      table.center-on-narrow { display: inline-block !important; }
      .mobile-pad { padding-left: 16px !important; padding-right: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: Arial, Helvetica, sans-serif;">
  <!-- Background wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f5f7;">
    <tr>
      <td style="padding: 20px 0;">
        <!-- Email container: 600px max -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="margin: 0 auto; max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${BRAND_COLOR}; padding: 28px 30px; text-align: center;">
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
              ${footerExtra}
              <p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                This is an automated email. Please do not reply directly.<br>
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
 * Builds a CTA button using a bulletproof approach (VML for Outlook)
 */
const ctaButton = (url, text, bgColor = BRAND_COLOR) => `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px auto;">
  <tr>
    <td style="border-radius: 6px; background: ${bgColor};">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="14%" strokecolor="${bgColor}" fillcolor="${bgColor}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${text}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${url}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px; background-color: ${bgColor}; font-family: Arial, Helvetica, sans-serif;">${text}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;

/**
 * Info row for key-value display inside emails
 */
const infoRow = (label, value, isLast = false) => `
<tr>
  <td style="padding: 10px 12px; font-size: 14px; color: #6b7280; font-weight: 600; border-bottom: ${isLast ? 'none' : '1px solid #f3f4f6'}; width: 40%;">${label}</td>
  <td style="padding: 10px 12px; font-size: 14px; color: #1f2937; border-bottom: ${isLast ? 'none' : '1px solid #f3f4f6'};">${value}</td>
</tr>`;

const getCurrencySymbol = (currency) => {
  const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CAD': '$', 'AUD': '$' };
  return symbols[currency] || '$';
};


// ─── Send Welcome Email ─────────────────────────────────────────────────────

export const sendWelcomeEmail = async (userData) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('SMTP not configured. Email not sent.');
      return { success: false, message: 'SMTP not configured' };
    }

    const recipientEmail = userData.email ? userData.email.trim().toLowerCase() : '';
    if (!recipientEmail || !recipientEmail.includes('@') || !recipientEmail.includes('.')) {
      console.error('Invalid email address provided:', userData.email);
      return { success: false, error: 'Invalid email address' };
    }

    const transporter = createTransporter();
    const loginUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`;

    let detailsRows = '';
    detailsRows += infoRow('Name', userData.name);
    detailsRows += infoRow('Email', userData.email);
    if (userData.password) {
      detailsRows += infoRow('Password', `<code style="background: #eef2ff; color: ${BRAND_COLOR}; padding: 3px 8px; border-radius: 4px; font-size: 14px; font-weight: 700;">${userData.password}</code>`);
    }
    detailsRows += infoRow('Role', userData.role);
    if (userData.phone) detailsRows += infoRow('Phone', userData.phone);
    if (userData.address) detailsRows += infoRow('Address', userData.address);
    detailsRows += infoRow('Status', `<span style="background: ${GREEN}; color: #fff; padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">${userData.status || 'Active'}</span>`, true);

    const bodyContent = `
      <p style="margin: 0 0 16px; font-size: 16px; color: #1f2937; line-height: 1.5;">Hello <strong>${userData.name}</strong>,</p>
      <p style="margin: 0 0 24px; font-size: 15px; color: #4b5563; line-height: 1.6;">
        Welcome to our Sales Management System! Your account has been created successfully. Here are your account details:
      </p>

      <!-- Account Details Table -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BRAND_LIGHT}; border-radius: 6px; overflow: hidden; margin-bottom: 20px;">
        <tr><td style="padding: 14px 12px 4px; font-size: 13px; font-weight: 700; color: ${BRAND_COLOR}; text-transform: uppercase; letter-spacing: 0.5px;">Account Details</td></tr>
        <tr>
          <td style="padding: 0 12px 14px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #ffffff; border-radius: 4px;">
              ${detailsRows}
            </table>
          </td>
        </tr>
      </table>

      ${userData.password ? `
      <!-- Security Notice -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
        <tr>
          <td style="padding: 14px 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; font-size: 13px; color: #92400e; line-height: 1.5;">
            <strong>Important:</strong> Please keep your login credentials secure. You can change your password after logging in.
          </td>
        </tr>
      </table>` : ''}

      ${ctaButton(loginUrl, 'Login to Your Account')}

      <p style="margin: 20px 0 0; font-size: 14px; color: #6b7280; line-height: 1.5;">
        If you have any questions, please contact our support team.
      </p>
      <p style="margin: 16px 0 0; font-size: 14px; color: #6b7280;">
        Best regards,<br><strong style="color: #1f2937;">Sales Management System Team</strong>
      </p>
    `;

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Sales Management System'}" <${process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject: 'Welcome to Sales Management System',
      html: emailShell('Welcome to Sales Management System', bodyContent),
      text: `Welcome to Sales Management System\n\nHello ${userData.name},\n\nYour account has been created.\n\nName: ${userData.name}\nEmail: ${userData.email}\n${userData.password ? `Password: ${userData.password}\n` : ''}Role: ${userData.role}\n\nLogin: ${loginUrl}`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent successfully to ${recipientEmail}. Message ID:`, info.messageId);
    return { success: true, messageId: info.messageId, recipient: recipientEmail };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};


// ─── Send Password Change Email ─────────────────────────────────────────────

export const sendPasswordChangeEmail = async (userData) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('SMTP not configured. Email not sent.');
      return { success: false, message: 'SMTP not configured' };
    }

    const transporter = createTransporter();

    const bodyContent = `
      <p style="margin: 0 0 16px; font-size: 16px; color: #1f2937; line-height: 1.5;">Hello <strong>${userData.name}</strong>,</p>
      <p style="margin: 0 0 24px; font-size: 15px; color: #4b5563; line-height: 1.6;">
        This is to confirm that your account password has been successfully changed.
      </p>

      <!-- Security Notice -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
        <tr>
          <td style="padding: 14px 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; font-size: 13px; color: #92400e; line-height: 1.5;">
            <strong>Security Notice:</strong> If you did not request this password change, please contact your administrator immediately.
          </td>
        </tr>
      </table>

      <p style="margin: 20px 0 0; font-size: 14px; color: #6b7280;">
        Best regards,<br><strong style="color: #1f2937;">Sales Management System Team</strong>
      </p>
    `;

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Sales Management System'}" <${process.env.SMTP_USER}>`,
      to: userData.email,
      subject: 'Your Password Has Been Changed',
      html: emailShell('Password Changed', bodyContent),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password change email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password change email:', error);
    return { success: false, error: error.message };
  }
};


// ─── Send Quotation Email ───────────────────────────────────────────────────

export const sendQuotationEmail = async (quotationData, emailBody) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('SMTP not configured. Email not sent.');
      return { success: false, message: 'SMTP not configured' };
    }

    const transporter = createTransporter();

    // Get recipient emails
    const recipients = [];
    if (quotationData.from?.email) recipients.push(quotationData.from.email);
    if (quotationData.to?.email) recipients.push(quotationData.to.email);

    if (recipients.length === 0) {
      return { success: false, error: 'No recipient email addresses provided' };
    }

    const currencySymbol = getCurrencySymbol(quotationData.currency || 'USD');
    const formatDate = (ds) => {
      if (!ds) return 'N/A';
      return new Date(ds).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Convert plain text email body to HTML
    const htmlBody = emailBody.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Generate PDF attachment
    const pdfBuffer = await generateQuotationPDFBuffer(quotationData);
    const pdfFilename = `Quotation-${quotationData.quotationNo || 'Draft'}.pdf`;

    // Payment types
    const hasSubscriptions = quotationData.lineItems?.some(item => item.isSubscription) || false;
    const hasOneTime = quotationData.lineItems?.some(item => !item.isSubscription) || false;

    // Generate payment link
    let paymentLink = null;
    if (process.env.STRIPE_SECRET_KEY && quotationData.totalAmount > 0) {
      try {
        paymentLink = await createQuotationPaymentLink(quotationData);
        console.log('Payment link generated:', paymentLink);
      } catch (paymentError) {
        console.warn('Failed to generate payment link:', paymentError.message);
      }
    }

    // ── Build line items HTML ──
    let lineItemsHtml = '';
    if (quotationData.lineItems && quotationData.lineItems.length > 0) {
      const itemRows = quotationData.lineItems.map((item, idx) => {
        let itemDesc = '';
        if (item.description) itemDesc += `<br><span style="font-size: 12px; color: #6b7280;">${item.description}</span>`;
        if (item.isSubscription) itemDesc += `<br><span style="font-size: 11px; color: #7c3aed; font-style: italic;">Subscription</span>`;
        if (item.selectedOptions && item.selectedOptions.length > 0) {
          itemDesc += `<br><span style="font-size: 11px; color: #9ca3af;">${item.selectedOptions.map(o => `${o.attributeName}: ${o.optionLabel}`).join(', ')}</span>`;
        }

        return `
        <tr style="background-color: ${idx % 2 === 0 ? '#f9fafb' : '#ffffff'};">
          <td style="padding: 10px 8px; font-size: 13px; color: #6b7280; text-align: center; border-bottom: 1px solid #f3f4f6;">${idx + 1}</td>
          <td style="padding: 10px 8px; font-size: 13px; color: #1f2937; border-bottom: 1px solid #f3f4f6;">
            <strong>${item.itemName}</strong>${itemDesc}
          </td>
          <td style="padding: 10px 8px; font-size: 13px; color: #1f2937; text-align: center; border-bottom: 1px solid #f3f4f6;">${item.quantity}</td>
          <td style="padding: 10px 8px; font-size: 13px; color: #1f2937; text-align: right; border-bottom: 1px solid #f3f4f6;">${currencySymbol}${item.rate.toFixed(2)}</td>
          <td style="padding: 10px 8px; font-size: 13px; color: #1f2937; text-align: right; font-weight: 600; border-bottom: 1px solid #f3f4f6;">${currencySymbol}${item.total.toFixed(2)}</td>
        </tr>`;
      }).join('');

      lineItemsHtml = `
      <!-- Items Table -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
        <tr style="background-color: ${BRAND_COLOR};">
          <td style="padding: 10px 8px; font-size: 12px; font-weight: 700; color: #ffffff; text-align: center; width: 30px;">#</td>
          <td style="padding: 10px 8px; font-size: 12px; font-weight: 700; color: #ffffff;">Item</td>
          <td style="padding: 10px 8px; font-size: 12px; font-weight: 700; color: #ffffff; text-align: center; width: 40px;">Qty</td>
          <td style="padding: 10px 8px; font-size: 12px; font-weight: 700; color: #ffffff; text-align: right; width: 70px;">Rate</td>
          <td style="padding: 10px 8px; font-size: 12px; font-weight: 700; color: #ffffff; text-align: right; width: 80px;">Total</td>
        </tr>
        ${itemRows}
      </table>

      <!-- Totals -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
        <tr>
          <td width="50%">&nbsp;</td>
          <td width="50%">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Subtotal</td>
                <td style="padding: 6px 0; font-size: 13px; color: #1f2937; text-align: right;">${currencySymbol}${quotationData.subtotal.toFixed(2)}</td>
              </tr>
              ${quotationData.couponCode && quotationData.couponDiscount > 0 ? `
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: ${GREEN};">Discount (${quotationData.couponCode})</td>
                <td style="padding: 6px 0; font-size: 13px; color: ${GREEN}; text-align: right;">-${currencySymbol}${quotationData.couponDiscount.toFixed(2)}</td>
              </tr>` : ''}
              <tr>
                <td colspan="2" style="border-top: 2px solid ${BRAND_COLOR}; padding: 0;"></td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-size: 16px; font-weight: 700; color: ${BRAND_COLOR};">Total</td>
                <td style="padding: 10px 0; font-size: 16px; font-weight: 700; color: ${BRAND_COLOR}; text-align: right;">${currencySymbol}${quotationData.totalAmount.toFixed(2)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
    }

    // ── Notes / Terms ──
    let notesTermsHtml = '';
    if (quotationData.notes) {
      notesTermsHtml += `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 12px;">
        <tr>
          <td style="padding: 12px 14px; background-color: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #92400e; text-transform: uppercase;">Notes</p>
            <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.5; white-space: pre-wrap;">${quotationData.notes}</p>
          </td>
        </tr>
      </table>`;
    }
    if (quotationData.terms) {
      notesTermsHtml += `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 12px;">
        <tr>
          <td style="padding: 12px 14px; background-color: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 4px;">
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #1e40af; text-transform: uppercase;">Terms &amp; Conditions</p>
            <p style="margin: 0; font-size: 13px; color: #1e3a8a; line-height: 1.5; white-space: pre-wrap;">${quotationData.terms}</p>
          </td>
        </tr>
      </table>`;
    }

    // ── Payment section ──
    let paymentHtml = '';
    if (paymentLink) {
      const payBtnText = hasSubscriptions ? 'Activate Subscription' : 'Pay Now';
      const payDesc = hasSubscriptions
        ? (hasOneTime
            ? 'One-time items will be charged immediately, and subscriptions will activate for recurring billing.'
            : 'Your subscription will be billed automatically after activation.')
        : 'Click the button below to complete your payment securely.';

      paymentHtml = `
      <!-- Payment Section -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0; border: 2px solid #0ea5e9; border-radius: 6px; overflow: hidden;">
        <tr>
          <td style="padding: 24px 20px; text-align: center;">
            <p style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #0c4a6e;">${hasSubscriptions ? 'Activate Subscription' : 'Make Payment'}</p>
            <p style="margin: 0 0 6px; font-size: 14px; color: #075985; line-height: 1.5;">${payDesc}</p>
            <p style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: ${BRAND_COLOR};">${currencySymbol}${quotationData.totalAmount.toFixed(2)}</p>
            ${ctaButton(paymentLink, `${payBtnText} →`, '#0ea5e9')}
            <p style="margin: 8px 0 0; font-size: 11px; color: #6b7280;">Secure payment powered by Stripe</p>
          </td>
        </tr>
      </table>`;
    }

    // ── PDF notice ──
    const pdfNotice = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0;">
      <tr>
        <td style="padding: 12px 14px; background-color: ${BRAND_LIGHT}; border-radius: 6px; border: 1px dashed #93c5fd;">
          <p style="margin: 0; font-size: 13px; color: ${BRAND_COLOR}; line-height: 1.4;">
            <strong>PDF Attached</strong> — A detailed PDF of this quotation is attached to this email for your records.
          </p>
        </td>
      </tr>
    </table>`;

    // ── From / To section ──
    const buildContactBlock = (label, contact) => {
      if (!contact) return '';
      let html = `<td class="stack-column" style="padding: 10px; vertical-align: top; width: 50%;">
        <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: ${BRAND_COLOR}; text-transform: uppercase; letter-spacing: 0.5px;">${label}</p>
        <p style="margin: 0 0 3px; font-size: 14px; font-weight: 600; color: #1f2937;">${contact.businessName || 'N/A'}</p>`;
      if (contact.address) html += `<p style="margin: 0 0 2px; font-size: 12px; color: #6b7280; line-height: 1.4;">${contact.address}</p>`;
      if (contact.phone) html += `<p style="margin: 0 0 2px; font-size: 12px; color: #6b7280;">${contact.phone}</p>`;
      if (contact.email) html += `<p style="margin: 0 0 2px; font-size: 12px; color: #6b7280;">${contact.email}</p>`;
      if (contact.salesPersonName) html += `<p style="margin: 4px 0 0; font-size: 12px; color: #7c3aed;">Sales: ${contact.salesPersonName}</p>`;
      html += `</td>`;
      return html;
    };

    const contactsHtml = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0; background: ${BRAND_LIGHT}; border-radius: 6px;">
      <tr>
        ${buildContactBlock('From', quotationData.from)}
        ${buildContactBlock('To', quotationData.to)}
      </tr>
    </table>`;

    // ── Quotation details ──
    let detailsHtml = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 12px;">
      <tr>
        <td style="padding: 8px 0; font-size: 13px; color: #6b7280;">Quotation Date</td>
        <td style="padding: 8px 0; font-size: 13px; color: #1f2937; text-align: right; font-weight: 600;">${formatDate(quotationData.quotationDate)}</td>
      </tr>`;
    if (quotationData.dueDate) {
      detailsHtml += `
      <tr>
        <td style="padding: 8px 0; font-size: 13px; color: #6b7280;">Due Date</td>
        <td style="padding: 8px 0; font-size: 13px; color: #1f2937; text-align: right; font-weight: 600;">${formatDate(quotationData.dueDate)}</td>
      </tr>`;
    }
    detailsHtml += `</table>`;

    // ── Assemble body ──
    // Split user's text body into greeting (first 3 lines) and closing (rest)
    const bodyLines = emailBody.split('\n');
    const greetingText = bodyLines.slice(0, 3).join('<br>');
    const closingText = bodyLines.slice(3).join('<br>');
    const processedGreeting = greetingText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    const processedClosing = closingText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    const bodyContent = `
      <!-- Greeting -->
      <p style="margin: 0 0 16px; font-size: 15px; color: #1f2937; line-height: 1.6;">${processedGreeting}</p>

      <!-- Quotation Number -->
      <p style="margin: 0 0 12px; font-size: 13px; color: #6b7280;">Quotation: <strong style="color: ${BRAND_COLOR}; font-size: 15px;">${quotationData.quotationNo || 'Draft'}</strong></p>

      ${detailsHtml}
      ${contactsHtml}
      ${lineItemsHtml}
      ${notesTermsHtml}
      ${pdfNotice}
      ${paymentHtml}

      <!-- Closing -->
      ${processedClosing ? `<div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">${processedClosing}</p>
      </div>` : ''}

      <!-- Signature -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 20px;">
        <tr>
          <td style="padding: 14px 16px; background: ${BRAND_LIGHT}; border-left: 3px solid ${BRAND_COLOR}; border-radius: 4px;">
            <p style="margin: 0 0 2px; font-size: 13px; color: #6b7280;">Best regards,</p>
            <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${BRAND_COLOR};">${quotationData.from?.salesPersonName || quotationData.from?.businessName || 'Sales Team'}</p>
            ${quotationData.from?.email ? `<p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">${quotationData.from.email}</p>` : ''}
          </td>
        </tr>
      </table>
    `;

    const footerExtra = `
      <p style="margin: 0 0 6px; font-size: 12px; color: #6b7280;">
        Questions? Contact us at ${quotationData.from?.email || 'support@hexerve.com'}
      </p>`;

    const mailOptions = {
      from: '"Hexerve" <shivamawasthi1129@gmail.com>',
      to: recipients.join(', '),
      subject: `Quotation ${quotationData.quotationNo || ''} - ${quotationData.from?.businessName || ''}`,
      attachments: [
        {
          filename: pdfFilename,
          content: Buffer.from(pdfBuffer),
          contentType: 'application/pdf',
        },
      ],
      html: emailShell(`Quotation ${quotationData.quotationNo || ''}`, bodyContent, footerExtra),
      text: emailBody + (paymentLink ? `\n\n---\n\nMake Payment Now:\n${paymentLink}` : ''),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Quotation email sent successfully to ${recipients.join(', ')}. Message ID:`, info.messageId);
    return { success: true, messageId: info.messageId, recipients };
  } catch (error) {
    console.error('Error sending quotation email:', error);
    return { success: false, error: error.message };
  }
};


// ─── Send Payment Receipt Email ─────────────────────────────────────────────

export const sendPaymentReceiptEmail = async (quotationData, paymentDetails) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('SMTP not configured. Email not sent.');
      return { success: false, message: 'SMTP not configured' };
    }

    const transporter = createTransporter();
    const recipientEmail = paymentDetails.customerEmail || quotationData.to?.email;

    if (!recipientEmail) {
      return { success: false, error: 'No recipient email address available' };
    }

    const currencySymbol = getCurrencySymbol(paymentDetails.currency?.toUpperCase() || quotationData.currency || 'USD');
    const amount = paymentDetails.amount || quotationData.totalAmount;
    const dashboardUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`;

    let receiptRows = '';
    receiptRows += infoRow('Quotation No', quotationData.quotationNo);
    receiptRows += infoRow('Amount Paid', `<strong style="color: ${GREEN}; font-size: 16px;">${currencySymbol}${parseFloat(amount).toFixed(2)}</strong>`);
    receiptRows += infoRow('Date', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
    if (paymentDetails.sessionId) {
      receiptRows += infoRow('Transaction ID', `<span style="font-size: 11px; font-family: monospace; color: #6b7280;">${paymentDetails.sessionId}</span>`, true);
    }

    const bodyContent = `
      <p style="margin: 0 0 16px; font-size: 16px; color: #1f2937; line-height: 1.5;">Hello <strong>${quotationData.to?.businessName || 'Customer'}</strong>,</p>
      <p style="margin: 0 0 24px; font-size: 15px; color: #4b5563; line-height: 1.6;">
        Thank you for your payment. We have successfully received your payment for Quotation <strong>${quotationData.quotationNo}</strong>.
      </p>

      <!-- Receipt Details -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0fdf4; border-radius: 6px; overflow: hidden; margin-bottom: 24px;">
        <tr><td style="padding: 14px 12px 4px; font-size: 13px; font-weight: 700; color: ${GREEN}; text-transform: uppercase; letter-spacing: 0.5px;">Receipt Details</td></tr>
        <tr>
          <td style="padding: 0 12px 14px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #ffffff; border-radius: 4px;">
              ${receiptRows}
            </table>
          </td>
        </tr>
      </table>

      ${ctaButton(dashboardUrl, 'View Your Dashboard', GREEN)}

      <p style="margin: 20px 0 0; font-size: 14px; color: #6b7280;">
        Best regards,<br><strong style="color: #1f2937;">Sales Management System Team</strong>
      </p>
    `;

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Sales Management System'}" <${process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject: `Payment Receipt for Quotation ${quotationData.quotationNo}`,
      html: emailShell('Payment Successful!', bodyContent),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Payment receipt email sent successfully to ${recipientEmail}. Message ID:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending payment receipt email:', error);
    return { success: false, error: error.message };
  }
};


// ─── Generic Send Email ─────────────────────────────────────────────────────

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('SMTP not configured. Email not sent.');
      return { success: false, message: 'SMTP not configured' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Sales Management System'}" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      html: html,
      text: text || html.replace(/<[^>]*>/g, ''),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}. Message ID:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};
