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

// Send welcome email to new user
export const sendWelcomeEmail = async (userData) => {
  try {
    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('SMTP not configured. Email not sent.');
      return { success: false, message: 'SMTP not configured' };
    }

    // Validate and clean email address
    const recipientEmail = userData.email ? userData.email.trim().toLowerCase() : '';
    
    if (!recipientEmail || !recipientEmail.includes('@') || !recipientEmail.includes('.')) {
      console.error('Invalid email address provided:', userData.email);
      return { success: false, error: 'Invalid email address' };
    }

    console.log('Preparing to send email to:', recipientEmail);
    
    const transporter = createTransporter();

    // Email content
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Sales Management System'}" <${process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject: 'Welcome to Sales Management System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Sales Management System</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to Sales Management System</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${userData.name}</strong>,</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Welcome to our Sales Management System! Your account has been successfully created. 
              We're excited to have you on board.
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #667eea; margin-top: 0; font-size: 20px;">Your Account Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #666;">Name:</td>
                  <td style="padding: 8px 0; color: #333;">${userData.name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #666;">Email:</td>
                  <td style="padding: 8px 0; color: #333;">${userData.email}</td>
                </tr>
                ${userData.password ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #666;">Password:</td>
                  <td style="padding: 8px 0; color: #333;">
                    <span style="background: #e3f2fd; color: #1976d2; padding: 6px 12px; border-radius: 4px; font-family: monospace; font-weight: bold; font-size: 14px;">
                      ${userData.password}
                    </span>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #666;">Role:</td>
                  <td style="padding: 8px 0; color: #333;">${userData.role}</td>
                </tr>
                ${userData.phone ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #666;">Phone:</td>
                  <td style="padding: 8px 0; color: #333;">${userData.phone}</td>
                </tr>
                ` : ''}
                ${userData.address ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #666;">Address:</td>
                  <td style="padding: 8px 0; color: #333;">${userData.address}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #666;">Status:</td>
                  <td style="padding: 8px 0; color: #333;">
                    <span style="background: #28a745; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px;">
                      ${userData.status || 'Active'}
                    </span>
                  </td>
                </tr>
              </table>
            </div>
            
            ${userData.password ? `
            <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #2e7d32;">
                <strong>🔐 Login Credentials:</strong><br>
                <strong>Email:</strong> ${userData.email}<br>
                <strong>Password:</strong> <span style="font-family: monospace; font-weight: bold; background: #fff; padding: 2px 8px; border-radius: 3px;">${userData.password}</span>
              </p>
            </div>
            ` : ''}
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #856404;">
                <strong>Important:</strong> Please keep your login credentials secure. 
                ${userData.password ? 'You can change your password after logging in.' : 'Please use your email address and the password provided by your administrator to log in.'}
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: #ffffff; 
                        padding: 12px 30px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        display: inline-block; 
                        font-weight: bold;">
                Login to Your Account
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If you have any questions or need assistance, please don't hesitate to contact our support team.
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              Best regards,<br>
              <strong>Sales Management System Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} Sales Management System. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to Sales Management System

Hello ${userData.name},

Welcome to our Sales Management System! Your account has been successfully created.

Your Account Details:
- Name: ${userData.name}
- Email: ${userData.email}
${userData.password ? `- Password: ${userData.password}` : ''}
- Role: ${userData.role}
${userData.phone ? `- Phone: ${userData.phone}` : ''}
${userData.address ? `- Address: ${userData.address}` : ''}
- Status: ${userData.status || 'Active'}

${userData.password ? `
Login Credentials:
Email: ${userData.email}
Password: ${userData.password}
` : ''}

Please use your email address and password to log in.

Login URL: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login

If you have any questions, please contact our support team.

Best regards,
Sales Management System Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent successfully to ${recipientEmail}. Message ID:`, info.messageId);
    console.log('Email response:', {
      accepted: info.accepted,
      rejected: info.rejected,
      messageId: info.messageId
    });
    return { success: true, messageId: info.messageId, recipient: recipientEmail };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

// Send password change notification email
export const sendPasswordChangeEmail = async (userData) => {
  try {
    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('SMTP not configured. Email not sent.');
      return { success: false, message: 'SMTP not configured' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Sales Management System'}" <${process.env.SMTP_USER}>`,
      to: userData.email,
      subject: 'Your Password Has Been Changed',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Changed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Password Changed</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${userData.name}</strong>,</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              This is to inform you that your account password has been successfully changed.
            </p>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #856404;">
                <strong>Security Notice:</strong> If you did not request this password change, 
                please contact your administrator immediately.
              </p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Best regards,<br>
              <strong>Sales Management System Team</strong>
            </p>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password change email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password change email:', error);
    return { success: false, error: error.message };
  }
};

// Send quotation email
export const sendQuotationEmail = async (quotationData, emailBody) => {
  try {
    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('SMTP not configured. Email not sent.');
      return { success: false, message: 'SMTP not configured' };
    }

    const transporter = createTransporter();

    // Get recipient emails
    const recipients = [];
    if (quotationData.from?.email) {
      recipients.push(quotationData.from.email);
    }
    if (quotationData.to?.email) {
      recipients.push(quotationData.to.email);
    }

    if (recipients.length === 0) {
      return { success: false, error: 'No recipient email addresses provided' };
    }

    // Generate HTML email body
    const currencySymbol = getCurrencySymbol(quotationData.currency || 'USD');
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };
    const quotationDate = formatDate(quotationData.quotationDate);
    const dueDate = formatDate(quotationData.dueDate);

    // Convert plain text email body to HTML (preserve line breaks)
    const htmlBody = emailBody.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Generate PDF attachment
    const pdfBuffer = generateQuotationPDFBuffer(quotationData);
    const pdfFilename = `Quotation-${quotationData.quotationNo || 'Draft'}.pdf`;

    // Check payment types
    const hasSubscriptions = quotationData.lineItems?.some(item => item.isSubscription) || false;
    const hasOneTime = quotationData.lineItems?.some(item => !item.isSubscription) || false;

    // Generate payment link if Stripe is configured
    let paymentLink = null;
    if (process.env.STRIPE_SECRET_KEY && quotationData.totalAmount > 0) {
      try {
        paymentLink = await createQuotationPaymentLink(quotationData);
        console.log('Payment link generated:', paymentLink);
      } catch (paymentError) {
        console.warn('Failed to generate payment link:', paymentError.message);
        // Continue without payment link if generation fails
      }
    }

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
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Quotation ${quotationData.quotationNo || ''}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f5f7fa;">
          <!-- Main Container -->
          <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
            <!-- Header with Gradient -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 32px; font-weight: 700; letter-spacing: 1px;">QUOTATION</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 16px; font-weight: 500;">${quotationData.quotationNo || 'Draft Quotation'}</p>
            </div>
            
            <!-- Email Body Content -->
            <div style="padding: 40px 30px;">
              <!-- Greeting and Introduction -->
              <div style="margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-left: 4px solid #667eea; border-radius: 6px;">
                ${htmlBody.split('\n').slice(0, 3).join('<br>')}
              </div>
              
              <!-- Quotation Details Card -->
              <div style="margin-bottom: 30px; padding: 25px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;">
                <h2 style="color: #667eea; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; display: flex; align-items: center;">
                  <span style="display: inline-block; width: 4px; height: 24px; background: #667eea; margin-right: 10px; border-radius: 2px;"></span>
                  Quotation Information
                </h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                  <div>
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Quotation Date</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: #333;">${formatDate(quotationData.quotationDate)}</p>
                  </div>
                  ${quotationData.dueDate ? `
                  <div>
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Due Date</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: #333;">${formatDate(quotationData.dueDate)}</p>
                  </div>
                  ` : ''}
                </div>
              </div>

              <!-- From and To Section -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                <!-- From Card -->
                <div style="padding: 20px; background: #fff; border: 2px solid #e0e0e0; border-radius: 8px;">
                  <h3 style="color: #667eea; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">From</h3>
                  <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #333;">${quotationData.from?.businessName || 'N/A'}</p>
                  ${quotationData.from?.address ? `<p style="margin: 4px 0; font-size: 13px; color: #666;">${quotationData.from.address}</p>` : ''}
                  ${quotationData.from?.phone ? `<p style="margin: 4px 0; font-size: 13px; color: #666;">📞 ${quotationData.from.phone}</p>` : ''}
                  ${quotationData.from?.email ? `<p style="margin: 4px 0; font-size: 13px; color: #666;">✉️ ${quotationData.from.email}</p>` : ''}
                  ${quotationData.from?.salesPersonName ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #667eea; font-weight: 500;">👤 ${quotationData.from.salesPersonName}${quotationData.from.salesPersonId ? ` (${quotationData.from.salesPersonId})` : ''}</p>` : ''}
                </div>
                
                <!-- To Card -->
                <div style="padding: 20px; background: #fff; border: 2px solid #e0e0e0; border-radius: 8px;">
                  <h3 style="color: #667eea; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">To</h3>
                  <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #333;">${quotationData.to?.businessName || 'N/A'}</p>
                  ${quotationData.to?.address ? `<p style="margin: 4px 0; font-size: 13px; color: #666;">${quotationData.to.address}</p>` : ''}
                  ${quotationData.to?.phone ? `<p style="margin: 4px 0; font-size: 13px; color: #666;">📞 ${quotationData.to.phone}</p>` : ''}
                  ${quotationData.to?.email ? `<p style="margin: 4px 0; font-size: 13px; color: #666;">✉️ ${quotationData.to.email}</p>` : ''}
                </div>
              </div>
              
              <!-- Line Items Table -->
              ${quotationData.lineItems && quotationData.lineItems.length > 0 ? `
              <div style="margin-bottom: 30px;">
                <h2 style="color: #667eea; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Item Details</h2>
                <div style="overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
                    <thead>
                      <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <th style="padding: 15px; text-align: center; color: white; font-weight: 600; font-size: 13px; border: none;">#</th>
                        <th style="padding: 15px; text-align: left; color: white; font-weight: 600; font-size: 13px; border: none;">Item</th>
                        <th style="padding: 15px; text-align: center; color: white; font-weight: 600; font-size: 13px; border: none;">Qty</th>
                        <th style="padding: 15px; text-align: right; color: white; font-weight: 600; font-size: 13px; border: none;">Rate</th>
                        <th style="padding: 15px; text-align: right; color: white; font-weight: 600; font-size: 13px; border: none;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${quotationData.lineItems.map((item, index) => `
                        <tr style="border-bottom: 1px solid #f0f0f0; ${index % 2 === 0 ? 'background: #fafafa;' : 'background: #fff;'}">
                          <td style="padding: 15px; text-align: center; color: #666; font-size: 13px;">${index + 1}</td>
                          <td style="padding: 15px;">
                            <div style="font-weight: 600; color: #333; font-size: 14px; margin-bottom: 4px;">${item.itemName}</div>
                            ${item.description ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">${item.description}</div>` : ''}
                            ${item.isSubscription ? `<span style="display: inline-block; background: #e1bee7; color: #4a148c; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; margin-top: 6px;">Subscription</span>` : ''}
                            ${item.selectedOptions && item.selectedOptions.length > 0 ? `
                              <div style="margin-top: 6px; font-size: 11px; color: #888;">
                                ${item.selectedOptions.map(opt => `<span style="display: inline-block; background: #f0f0f0; padding: 2px 8px; border-radius: 4px; margin-right: 4px; margin-bottom: 4px;">${opt.attributeName}: ${opt.optionLabel}</span>`).join('')}
                              </div>
                            ` : ''}
                          </td>
                          <td style="padding: 15px; text-align: center; color: #333; font-size: 13px; font-weight: 500;">${item.quantity}</td>
                          <td style="padding: 15px; text-align: right; color: #333; font-size: 13px; font-weight: 500;">${currencySymbol}${item.rate.toFixed(2)}</td>
                          <td style="padding: 15px; text-align: right; color: #333; font-size: 13px; font-weight: 600;">${currencySymbol}${item.total.toFixed(2)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                    <tfoot>
                      <tr style="background: #f8f9fa; border-top: 2px solid #e0e0e0;">
                        <td colspan="4" style="padding: 15px; text-align: right; font-weight: 600; color: #333; font-size: 14px;">Subtotal:</td>
                        <td style="padding: 15px; text-align: right; font-weight: 600; color: #333; font-size: 14px;">${currencySymbol}${quotationData.subtotal.toFixed(2)}</td>
                      </tr>
                      <tr style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border-top: 2px solid #4caf50;">
                        <td colspan="4" style="padding: 18px 15px; text-align: right; font-weight: 700; color: #2e7d32; font-size: 18px;">Total Amount:</td>
                        <td style="padding: 18px 15px; text-align: right; font-weight: 700; color: #2e7d32; font-size: 18px;">${currencySymbol}${quotationData.totalAmount.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              ` : ''}
              
              <!-- Notes and Terms -->
              ${(quotationData.notes || quotationData.terms) ? `
              <div style="display: grid; grid-template-columns: ${quotationData.notes && quotationData.terms ? '1fr 1fr' : '1fr'}; gap: 20px; margin-bottom: 30px;">
                ${quotationData.notes ? `
                <div style="padding: 20px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 6px;">
                  <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #856404; text-transform: uppercase;">Notes</h3>
                  <p style="margin: 0; font-size: 13px; color: #856404; white-space: pre-wrap;">${quotationData.notes}</p>
                </div>
                ` : ''}
                ${quotationData.terms ? `
                <div style="padding: 20px; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 6px;">
                  <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #1565c0; text-transform: uppercase;">Terms & Conditions</h3>
                  <p style="margin: 0; font-size: 13px; color: #1565c0; white-space: pre-wrap;">${quotationData.terms}</p>
                </div>
                ` : ''}
              </div>
              ` : ''}
              
              <!-- PDF Attachment Notice -->
              <div style="margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-radius: 8px; border: 2px dashed #2196f3;">
                <div style="display: flex; align-items: center; gap: 15px;">
                  <div style="width: 50px; height: 50px; background: #2196f3; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <span style="font-size: 24px;">📎</span>
                  </div>
                  <div>
                    <h3 style="margin: 0 0 5px 0; font-size: 16px; font-weight: 600; color: #1565c0;">PDF Attachment Included</h3>
                    <p style="margin: 0; font-size: 13px; color: #1565c0;">A detailed PDF version of this quotation is attached to this email for your records.</p>
                  </div>
                </div>
              </div>
              
              ${paymentLink ? `
              <!-- Payment Link Section -->
              <div style="margin-bottom: 30px; padding: 30px; background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); border-radius: 12px; text-align: center; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);">
                <div style="margin-bottom: 20px;">
                  <div style="width: 60px; height: 60px; background: rgba(255, 255, 255, 0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                    <span style="font-size: 32px;">💳</span>
                  </div>
                  <h2 style="color: #ffffff; margin: 0 0 10px 0; font-size: 24px; font-weight: 700;">${hasSubscriptions ? 'Activate Subscription' : 'Make Payment Now'}</h2>
                  <p style="color: rgba(255, 255, 255, 0.95); margin: 0; font-size: 16px; line-height: 1.5;">
                    ${hasSubscriptions 
                      ? (hasOneTime 
                          ? 'Pay securely online. One-time items will be charged immediately, and subscriptions will be activated for recurring billing.'
                          : 'Activate your subscription with secure online payment. Your subscription will be billed automatically.')
                      : 'Pay securely online using our payment gateway. Click the button below to proceed with payment.'}
                  </p>
                </div>
                <div style="margin-top: 25px;">
                  <a href="${paymentLink}" 
                     style="display: inline-block; 
                            background: #ffffff; 
                            color: #4caf50; 
                            padding: 16px 40px; 
                            text-decoration: none; 
                            border-radius: 8px; 
                            font-weight: 700; 
                            font-size: 18px;
                            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                            transition: all 0.3s ease;">
                    ${hasSubscriptions ? 'Activate' : 'Pay'} ${currencySymbol}${quotationData.totalAmount.toFixed(2)} Now
                  </a>
                </div>
                <p style="color: rgba(255, 255, 255, 0.9); margin: 20px 0 0 0; font-size: 12px;">
                  🔒 Secure payment powered by Stripe ${hasSubscriptions ? '| Recurring billing enabled' : ''}
                </p>
              </div>
              ` : ''}
              
              <!-- Closing -->
              <div style="margin-top: 30px; padding-top: 30px; border-top: 2px solid #e0e0e0;">
                <p style="font-size: 15px; color: #333; margin: 0 0 10px 0;">
                  ${htmlBody.split('\n').slice(3).join('<br>')}
                </p>
                <p style="font-size: 14px; color: #666; margin: 20px 0 0 0;">
                  Best regards,<br>
                  <strong style="color: #667eea; font-size: 16px;">${quotationData.from?.salesPersonName || quotationData.from?.businessName || 'Herxerve Team'}</strong>
                </p>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; padding: 20px; color: #999; font-size: 12px;">
            <p style="margin: 0 0 5px 0;">This is an automated email. Please do not reply to this message.</p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Herxerve. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: emailBody + (paymentLink ? `\n\n---\n\n💳 Make Payment Now:\nPay ${currencySymbol}${quotationData.totalAmount.toFixed(2)} securely online:\n${paymentLink}\n\n🔒 Secure payment powered by Stripe` : ''),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Quotation email sent successfully to ${recipients.join(', ')}. Message ID:`, info.messageId);
    return { success: true, messageId: info.messageId, recipients };
  } catch (error) {
    console.error('Error sending quotation email:', error);
    return { success: false, error: error.message };
  }
};

const getCurrencySymbol = (currency) => {
  const symbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CAD': '$',
    'AUD': '$',
  };
  return symbols[currency] || '$';
};

