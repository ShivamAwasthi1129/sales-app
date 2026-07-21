const fs = require('fs');
let code = fs.readFileSync('mcp-server.js', 'utf8');

// Replace import
code = code.replace(
  /import nodemailer from 'nodemailer';/,
  "import nodemailer from 'nodemailer';\nimport { Resend } from 'resend';"
);

// 1. sendSystemEmail
const sysRegex = /const transporter = nodemailer\.createTransport\(\{[\s\S]*?\}\);\s*await transporter\.sendMail\(\{\s*from:[\s\S]*?to: toEmail,\s*subject,\s*html\s*\}\);/m;
code = code.replace(
  sysRegex,
  `const resend = new Resend('re_Q3JHKhPK_EyqrjhPST6zrPFFfBFAGnSA4');
        const data = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: toEmail,
          subject,
          html
        });
        if (data.error) throw new Error(data.error.message);`
);

// 2. send_quotation
const quotRegex = /const transporter = nodemailer\.createTransport\(\{[\s\S]*?\}\);\s*const customMsg =[\s\S]*?\}\);/m;
code = code.replace(
  quotRegex,
  `const resend = new Resend('re_Q3JHKhPK_EyqrjhPST6zrPFFfBFAGnSA4');
            const customMsg = emailMessage || \`Please find your quotation \${quotation.quotationNo} attached.\`;
            const viewLink = \`\${GUI_BASE}/customer/tracking\`;
            
            const data = await resend.emails.send({
              from: 'onboarding@resend.dev',
              to: quotation.to.email,
              subject: \`Quotation \${quotation.quotationNo} - \${quotation.from?.businessName || 'Sales Team'}\`,
              html: \`
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1e40af;">Quotation \${quotation.quotationNo}</h2>
                  <p>Dear \${quotation.to?.businessName || 'Client'},</p>
                  <p>\${customMsg}</p>
                  <table style="width:100%; border-collapse:collapse; margin:16px 0;">
                    <tr><td style="padding:8px; background:#f3f4f6;"><strong>Quotation No</strong></td><td style="padding:8px;">\${quotation.quotationNo}</td></tr>
                    <tr><td style="padding:8px; background:#f3f4f6;"><strong>Amount</strong></td><td style="padding:8px;">\${quotation.currency} \${quotation.totalAmount?.toFixed(2)}</td></tr>
                    <tr><td style="padding:8px; background:#f3f4f6;"><strong>Due Date</strong></td><td style="padding:8px;">\${quotation.dueDate ? new Date(quotation.dueDate).toLocaleDateString() : 'N/A'}</td></tr>
                  </table>
                  <p><a href="\${viewLink}" style="background:#1e40af; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; display:inline-block;">View Quotation</a></p>
                  <p style="color:#6b7280; font-size:12px;">This quotation was sent via the Hexerve Sales Platform.</p>
                </div>
              \`
            });
            if (data.error) throw new Error(data.error.message);`
);

// 3. send_invoice
const invRegex = /const transporter = nodemailer\.createTransport\(\{[\s\S]*?\}\);\s*const customMsg =[\s\S]*?\}\);/m;
code = code.replace(
  invRegex,
  `const resend = new Resend('re_Q3JHKhPK_EyqrjhPST6zrPFFfBFAGnSA4');
            const customMsg = emailMessage || \`Please find attached your invoice \${invoice.invoiceNo}.\`;
            const viewLink = \`\${GUI_BASE}/customer/invoices\`;
            
            const data = await resend.emails.send({
              from: 'onboarding@resend.dev',
              to: invoice.billTo.email,
              subject: \`Invoice \${invoice.invoiceNo}\`,
              html: \`
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1e40af;">Invoice \${invoice.invoiceNo}</h2>
                  <p>Dear \${invoice.billTo?.name || 'Customer'},</p>
                  <p>\${customMsg}</p>
                  <table style="width:100%; border-collapse:collapse; margin:16px 0;">
                    <tr><td style="padding:8px; background:#f3f4f6;"><strong>Invoice No</strong></td><td style="padding:8px;">\${invoice.invoiceNo}</td></tr>
                    <tr><td style="padding:8px; background:#f3f4f6;"><strong>Amount</strong></td><td style="padding:8px;">\${invoice.currency} \${invoice.totalAmount?.toFixed(2)}</td></tr>
                    <tr><td style="padding:8px; background:#f3f4f6;"><strong>Due Date</strong></td><td style="padding:8px;">\${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</td></tr>
                  </table>
                  <p><a href="\${viewLink}" style="background:#1e40af; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; display:inline-block;">View Invoice</a></p>
                  <p style="color:#6b7280; font-size:12px;">This invoice was sent via the Hexerve Sales Platform.</p>
                </div>
              \`
            });
            if (data.error) throw new Error(data.error.message);`
);

// 4. send_email
const sendEmailRegex = /const transporter = nodemailer\.createTransport\(\{[\s\S]*?\}\);\s*await transporter\.sendMail\(\{[\s\S]*?\}\);/m;
code = code.replace(
  sendEmailRegex,
  `const resend = new Resend('re_Q3JHKhPK_EyqrjhPST6zrPFFfBFAGnSA4');
          const data = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: toEmail,
            subject: subject,
            html: bodyHtml
          });
          if (data.error) throw new Error(data.error.message);`
);

fs.writeFileSync('mcp-server.js', code);
