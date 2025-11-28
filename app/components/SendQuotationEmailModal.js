'use client';

import { useState, useEffect } from 'react';
import { downloadQuotationPDF } from '../../lib/pdfGenerator';

const SendQuotationEmailModal = ({ isOpen, onClose, quotationData, onSend }) => {
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);

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

  const generateEmailBody = (data) => {
    const currencySymbol = getCurrencySymbol(data.currency);
    const quotationDate = new Date(data.quotationDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const dueDate = data.dueDate ? new Date(data.dueDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'N/A';

    let itemsHtml = '';
    data.lineItems.forEach((item, index) => {
      itemsHtml += `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">${index + 1}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">
            <strong>${item.itemName}</strong>
            ${item.description ? `<br><small style="color: #666;">${item.description}</small>` : ''}
            ${item.isSubscription ? `<br><span style="background: #e1bee7; color: #4a148c; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-top: 4px; display: inline-block;">Subscription</span>` : ''}
            ${item.selectedOptions && item.selectedOptions.length > 0 ? `
              <div style="margin-top: 4px; font-size: 12px; color: #666;">
                ${item.selectedOptions.map(opt => `• ${opt.attributeName}: ${opt.optionLabel}`).join('<br>')}
              </div>
            ` : ''}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${currencySymbol}${item.rate.toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;"><strong>${currencySymbol}${item.total.toFixed(2)}</strong></td>
        </tr>
      `;
    });

    return `Dear ${data.to.businessName || 'Valued Client'},

I hope this email finds you well. Please find attached our quotation for your consideration.

**Quotation Details:**
- Quotation Number: ${data.quotationNo || 'TBD'}
- Quotation Date: ${quotationDate}
${data.dueDate ? `- Due Date: ${dueDate}` : ''}

**From:**
${data.from.businessName}
${data.from.address ? `Address: ${data.from.address}` : ''}
${data.from.phone ? `Phone: ${data.from.phone}` : ''}
${data.from.email ? `Email: ${data.from.email}` : ''}
${data.from.salesPersonName ? `Sales Person: ${data.from.salesPersonName}${data.from.salesPersonId ? ` (ID: ${data.from.salesPersonId})` : ''}` : ''}

**To:**
${data.to.businessName}
${data.to.address ? `Address: ${data.to.address}` : ''}
${data.to.phone ? `Phone: ${data.to.phone}` : ''}
${data.to.email ? `Email: ${data.to.email}` : ''}

**Items:**
${data.lineItems.map((item, index) => {
  let itemText = `${index + 1}. ${item.itemName} - Quantity: ${item.quantity} - Rate: ${currencySymbol}${item.rate.toFixed(2)} - Total: ${currencySymbol}${item.total.toFixed(2)}`;
  if (item.description) itemText += `\n   Description: ${item.description}`;
  if (item.isSubscription) itemText += `\n   Type: Subscription`;
  if (item.selectedOptions && item.selectedOptions.length > 0) {
    itemText += `\n   Options: ${item.selectedOptions.map(opt => `${opt.attributeName}: ${opt.optionLabel}`).join(', ')}`;
  }
  return itemText;
}).join('\n\n')}

**Summary:**
Subtotal: ${currencySymbol}${data.subtotal.toFixed(2)}
${data.couponCode && data.couponDiscount > 0 ? `Coupon Discount (${data.couponCode}): -${currencySymbol}${data.couponDiscount.toFixed(2)}\n` : ''}Total Amount: ${currencySymbol}${data.totalAmount.toFixed(2)}

${data.notes ? `**Notes:**\n${data.notes}\n\n` : ''}
${data.terms ? `**Terms & Conditions:**\n${data.terms}\n\n` : ''}

Please review the quotation and let us know if you have any questions or require any modifications. We look forward to working with you.

Best regards,
${data.from.salesPersonName || data.from.businessName}`;
  };

  // Generate email body when modal opens or quotation data changes
  useEffect(() => {
    if (isOpen && quotationData) {
      const body = generateEmailBody(quotationData);
      setEmailBody(body);
    }
  }, [isOpen, quotationData]);

  const getSalesPersonEmail = () => {
    return quotationData?.from?.email || '';
  };

  const getClientEmail = () => {
    return quotationData?.to?.email || '';
  };

  const handleSend = async () => {
    if (!getSalesPersonEmail() && !getClientEmail()) {
      alert('Please provide at least one email address (Sales Person or Client)');
      return;
    }

    setIsSending(true);
    try {
      await onSend(emailBody);
    } catch (error) {
      console.error('Error sending email:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Send Quotation Email</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Email Preview */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Preview</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">From:</span>
                  <span className="ml-2 text-gray-900">shivamawasthi1129@gmail.com</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">To:</span>
                  <div className="ml-2 text-gray-900">
                    {getSalesPersonEmail() && (
                      <div>{getSalesPersonEmail()}</div>
                    )}
                    {getClientEmail() && (
                      <div>{getClientEmail()}</div>
                    )}
                    {!getSalesPersonEmail() && !getClientEmail() && (
                      <span className="text-red-500 italic">No email addresses provided</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Subject:</span>
                  <span className="ml-2 text-gray-900">Quotation {quotationData?.quotationNo || ''} - {quotationData?.from?.businessName || ''}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Email Body Editor */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Body
            </label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={20}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
              placeholder="Email body will be generated automatically..."
            />
          </div>

          {/* Quotation Summary */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h4 className="font-semibold text-indigo-900 mb-2">Quotation Summary</h4>
            <div className="text-sm text-gray-700 space-y-1">
              <div><strong>Quotation No:</strong> {quotationData?.quotationNo || 'TBD'}</div>
              <div><strong>Total Amount:</strong> {getCurrencySymbol(quotationData?.currency || 'USD')}{quotationData?.totalAmount?.toFixed(2) || '0.00'}</div>
              <div><strong>Items:</strong> {quotationData?.lineItems?.length || 0}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => {
              if (quotationData) {
                downloadQuotationPDF(quotationData);
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download PDF</span>
          </button>
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              disabled={isSending}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || (!getSalesPersonEmail() && !getClientEmail())}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                'Create and Send Quotation'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendQuotationEmailModal;

