import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateQuotationPDF = (quotationData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Helper function to get currency symbol
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

  const currencySymbol = getCurrencySymbol(quotationData.currency || 'USD');

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Header with gradient effect (simulated with colored rectangle)
  doc.setFillColor(102, 126, 234); // Indigo color
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION', pageWidth / 2, 25, { align: 'center' });
  
  // Quotation Number
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Quotation No: ${quotationData.quotationNo || 'N/A'}`, pageWidth / 2, 35, { align: 'center' });

  yPosition = 50;

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Quotation Details Section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Quotation Date: ${formatDate(quotationData.quotationDate)}`, 14, yPosition);
  if (quotationData.dueDate) {
    doc.text(`Due Date: ${formatDate(quotationData.dueDate)}`, pageWidth - 14, yPosition, { align: 'right' });
  }
  yPosition += 10;

  // Business Logo (if available)
  if (quotationData.businessLogo) {
    try {
      // For base64 images
      if (quotationData.businessLogo.startsWith('data:image')) {
        doc.addImage(quotationData.businessLogo, 'PNG', pageWidth - 60, 45, 50, 50);
      }
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
  }

  yPosition += 15;

  // From and To Section
  const fromX = 14;
  const toX = pageWidth / 2 + 7;
  const sectionWidth = pageWidth / 2 - 21;

  // From Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Quotation From:', fromX, yPosition);
  yPosition += 7;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(quotationData.from?.businessName || 'N/A', fromX, yPosition);
  yPosition += 5;
  
  if (quotationData.from?.address) {
    const addressLines = doc.splitTextToSize(quotationData.from.address, sectionWidth);
    doc.text(addressLines, fromX, yPosition);
    yPosition += addressLines.length * 5;
  }
  
  if (quotationData.from?.phone) {
    doc.text(`Phone: ${quotationData.from.phone}`, fromX, yPosition);
    yPosition += 5;
  }
  
  if (quotationData.from?.email) {
    doc.text(`Email: ${quotationData.from.email}`, fromX, yPosition);
    yPosition += 5;
  }
  
  if (quotationData.from?.salesPersonName) {
    doc.text(`Sales Person: ${quotationData.from.salesPersonName}`, fromX, yPosition);
    yPosition += 5;
  }

  // To Section
  let toYPosition = yPosition - (yPosition - 57); // Reset to same starting point
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Quotation For:', toX, toYPosition);
  toYPosition += 7;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(quotationData.to?.businessName || 'N/A', toX, toYPosition);
  toYPosition += 5;
  
  if (quotationData.to?.address) {
    const addressLines = doc.splitTextToSize(quotationData.to.address, sectionWidth);
    doc.text(addressLines, toX, toYPosition);
    toYPosition += addressLines.length * 5;
  }
  
  if (quotationData.to?.phone) {
    doc.text(`Phone: ${quotationData.to.phone}`, toX, toYPosition);
    toYPosition += 5;
  }
  
  if (quotationData.to?.email) {
    doc.text(`Email: ${quotationData.to.email}`, toX, toYPosition);
    toYPosition += 5;
  }

  // Use the maximum Y position from both sections
  yPosition = Math.max(yPosition, toYPosition) + 10;

  // Line Items Table
  if (quotationData.lineItems && quotationData.lineItems.length > 0) {
    const tableData = quotationData.lineItems.map((item, index) => {
      let itemDescription = item.itemName;
      if (item.description) {
        itemDescription += ` - ${item.description}`;
      }
      if (item.isSubscription) {
        itemDescription += ' [Subscription]';
      }
      if (item.selectedOptions && item.selectedOptions.length > 0) {
        const options = item.selectedOptions.map(opt => `${opt.attributeName}: ${opt.optionLabel}`).join(', ');
        itemDescription += ` (${options})`;
      }
      
      return [
        index + 1,
        itemDescription,
        item.quantity.toString(),
        `${currencySymbol}${item.rate.toFixed(2)}`,
        `${currencySymbol}${item.total.toFixed(2)}`
      ];
    });

    doc.autoTable({
      startY: yPosition,
      head: [['#', 'Item Description', 'Qty', 'Rate', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [102, 126, 234], // Indigo
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // Summary Section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Subtotal: ${currencySymbol}${quotationData.subtotal.toFixed(2)}`, pageWidth - 14, yPosition, { align: 'right' });
  yPosition += 7;
  
  // Coupon Discount
  if (quotationData.couponCode && quotationData.couponDiscount > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(34, 197, 94); // Green color
    doc.text(`Coupon Discount (${quotationData.couponCode}): -${currencySymbol}${quotationData.couponDiscount.toFixed(2)}`, pageWidth - 14, yPosition, { align: 'right' });
    yPosition += 7;
    doc.setTextColor(0, 0, 0); // Reset to black
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Amount: ${currencySymbol}${quotationData.totalAmount.toFixed(2)}`, pageWidth - 14, yPosition, { align: 'right' });
  yPosition += 15;

  // Notes Section
  if (quotationData.notes) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 14, yPosition);
    yPosition += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(quotationData.notes, pageWidth - 28);
    doc.text(notesLines, 14, yPosition);
    yPosition += notesLines.length * 5 + 5;
  }

  // Terms & Conditions Section
  if (quotationData.terms) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', 14, yPosition);
    yPosition += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const termsLines = doc.splitTextToSize(quotationData.terms, pageWidth - 28);
    doc.text(termsLines, 14, yPosition);
    yPosition += termsLines.length * 5 + 10;
  }

  // Footer
  const footerY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text('This is a computer-generated quotation.', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, footerY + 5, { align: 'center' });

  return doc;
};

// Generate PDF as blob for download
export const downloadQuotationPDF = (quotationData, filename = null) => {
  const doc = generateQuotationPDF(quotationData);
  const pdfFilename = filename || `Quotation-${quotationData.quotationNo || 'Draft'}.pdf`;
  doc.save(pdfFilename);
};

// Generate PDF as base64 string for email attachment
export const generateQuotationPDFBase64 = (quotationData) => {
  const doc = generateQuotationPDF(quotationData);
  return doc.output('datauristring');
};

// Generate PDF as buffer for email attachment
export const generateQuotationPDFBuffer = (quotationData) => {
  const doc = generateQuotationPDF(quotationData);
  return doc.output('arraybuffer');
};

