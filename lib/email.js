import nodemailer from 'nodemailer';

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

