import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateInvoicePDFBuffer = (invoiceData) => {
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
      'INR': '₹',
    };
    return symbols[currency] || '$';
  };

  const currencySymbol = getCurrencySymbol(invoiceData.currency || 'USD');

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
  doc.setFillColor(34, 197, 94); // Green color for invoice
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth / 2, 25, { align: 'center' });
  
  // Invoice Number
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${invoiceData.invoiceNo || 'N/A'}`, pageWidth / 2, 35, { align: 'center' });

  yPosition = 50;

  // Reset text color for body
  doc.setTextColor(0, 0, 0);

  // From and To sections side by side
  const columnWidth = (pageWidth - 40) / 2;
  
  // Bill From (Left side)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL FROM:', 20, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  yPosition += 6;
  const billFromLines = [
    invoiceData.billFrom?.businessName || 'N/A',
    invoiceData.billFrom?.email || '',
    invoiceData.billFrom?.phone || '',
    invoiceData.billFrom?.address || '',
    invoiceData.billFrom?.country || '',
  ].filter(line => line);

  billFromLines.forEach((line) => {
    const splitLines = doc.splitTextToSize(line, columnWidth - 5);
    doc.text(splitLines, 20, yPosition);
    yPosition += splitLines.length * 5;
  });

  // Bill To (Right side)
  let rightYPosition = 50;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', pageWidth / 2 + 10, rightYPosition);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  rightYPosition += 6;
  const billToLines = [
    invoiceData.billTo?.businessName || 'N/A',
    invoiceData.billTo?.email || '',
    invoiceData.billTo?.phone || '',
    invoiceData.billTo?.address || '',
    invoiceData.billTo?.country || '',
  ].filter(line => line);

  billToLines.forEach((line) => {
    const splitLines = doc.splitTextToSize(line, columnWidth - 5);
    doc.text(splitLines, pageWidth / 2 + 10, rightYPosition);
    rightYPosition += splitLines.length * 5;
  });

  yPosition = Math.max(yPosition, rightYPosition) + 8;

  // Invoice Details
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPosition, pageWidth - 40, 20, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Date:', 25, yPosition + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(invoiceData.invoiceDate), 25, yPosition + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('Due Date:', pageWidth / 2, yPosition + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(invoiceData.dueDate), pageWidth / 2, yPosition + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('Payment Status:', pageWidth - 70, yPosition + 7);
  doc.setFont('helvetica', 'normal');
  const statusText = (invoiceData.paymentStatus || 'unpaid').toUpperCase();
  if (invoiceData.paymentStatus === 'paid') {
    doc.setTextColor(34, 197, 94); // Green
  } else {
    doc.setTextColor(239, 68, 68); // Red
  }
  doc.text(statusText, pageWidth - 70, yPosition + 14);
  doc.setTextColor(0, 0, 0); // Reset to black

  yPosition += 28;

  // Line Items Table
  const tableData = invoiceData.lineItems.map(item => {
    const optionsText = item.selectedOptions && item.selectedOptions.length > 0
      ? item.selectedOptions.map(opt => `${opt.attributeName}: ${opt.optionLabel}`).join(', ')
      : '';
    
    const description = item.description
      ? (optionsText ? `${item.description}\n${optionsText}` : item.description)
      : optionsText;

    return [
      item.itemName || 'N/A',
      description || '-',
      item.quantity || 1,
      `${currencySymbol}${(item.rate || 0).toFixed(2)}`,
      `${currencySymbol}${(item.total || 0).toFixed(2)}`,
    ];
  });

  doc.autoTable({
    startY: yPosition,
    head: [['Item Name', 'Description', 'Qty', 'Rate', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [34, 197, 94], // Green
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 60 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });

  yPosition = doc.lastAutoTable.finalY + 10;

  // Financial Summary
  const summaryX = pageWidth - 90;
  const summaryWidth = 70;

  doc.setFontSize(9);
  
  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', summaryX, yPosition);
  doc.text(`${currencySymbol}${(invoiceData.subtotal || 0).toFixed(2)}`, summaryX + summaryWidth, yPosition, { align: 'right' });
  yPosition += 6;

  // Tax
  if (invoiceData.totalTax && invoiceData.totalTax > 0) {
    doc.text('Tax:', summaryX, yPosition);
    doc.text(`${currencySymbol}${invoiceData.totalTax.toFixed(2)}`, summaryX + summaryWidth, yPosition, { align: 'right' });
    yPosition += 6;
  }

  // Discount
  if (invoiceData.discount && invoiceData.discount > 0) {
    doc.setTextColor(239, 68, 68); // Red for discount
    doc.text('Discount:', summaryX, yPosition);
    doc.text(`-${currencySymbol}${invoiceData.discount.toFixed(2)}`, summaryX + summaryWidth, yPosition, { align: 'right' });
    doc.setTextColor(0, 0, 0); // Reset
    yPosition += 6;
  }

  // Total
  doc.setDrawColor(200, 200, 200);
  doc.line(summaryX, yPosition, summaryX + summaryWidth, yPosition);
  yPosition += 6;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total Amount:', summaryX, yPosition);
  doc.text(`${currencySymbol}${(invoiceData.totalAmount || 0).toFixed(2)}`, summaryX + summaryWidth, yPosition, { align: 'right' });
  
  yPosition += 10;

  // Payment Information
  if (invoiceData.paymentStatus === 'paid' && invoiceData.paymentDate) {
    doc.setFillColor(220, 252, 231); // Light green background
    doc.rect(summaryX - 5, yPosition - 2, summaryWidth + 10, 16, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94); // Green
    doc.text('PAID', summaryX, yPosition + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(`on ${formatDate(invoiceData.paymentDate)}`, summaryX, yPosition + 11);
    doc.setTextColor(0, 0, 0);
    yPosition += 20;
  }

  // Notes and Terms
  if (invoiceData.notes || invoiceData.terms) {
    yPosition += 5;
    
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    if (invoiceData.notes) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 20, yPosition);
      yPosition += 6;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const notesLines = doc.splitTextToSize(invoiceData.notes, pageWidth - 40);
      doc.text(notesLines, 20, yPosition);
      yPosition += notesLines.length * 5 + 5;
    }

    if (invoiceData.terms) {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Terms & Conditions:', 20, yPosition);
      yPosition += 6;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const termsLines = doc.splitTextToSize(invoiceData.terms, pageWidth - 40);
      doc.text(termsLines, 20, yPosition);
      yPosition += termsLines.length * 5;
    }
  }

  // Footer
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY + 5, { align: 'center' });

  // Return PDF as buffer
  return doc.output('arraybuffer');
};

