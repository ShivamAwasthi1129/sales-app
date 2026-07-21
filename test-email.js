import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testEmail() {
  console.log('Testing SMTP with:');
  console.log('HOST:', process.env.SMTP_HOST);
  console.log('PORT:', process.env.SMTP_PORT);
  console.log('SECURE:', process.env.SMTP_SECURE);
  console.log('USER:', process.env.SMTP_USER);
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: 'Test Email',
      text: 'This is a test email.'
    });
    console.log('Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Email send failed:', error);
  }
}

testEmail();
