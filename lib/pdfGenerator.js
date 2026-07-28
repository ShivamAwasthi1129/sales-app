// lib/pdfGenerator.js - Client-side PDF generator using pdfmake
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Register fonts
if (typeof window !== 'undefined') {
  pdfMake.vfs = pdfFonts;
}

const getCurrencySymbol = (currency) => {
  const symbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    INR: '₹',
  };
  return symbols[currency] || currency || '$';
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatAmount = (amount, currency) => {
  const sym = getCurrencySymbol(currency);
  return `${sym}${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Build the pdfmake document definition for a quotation
 */
const buildQuotationDocDefinition = (quotation) => {
  const currency = quotation.currency || 'USD';
  const accentColor = '#1e3a5f';
  const lightAccent = '#f0f4f8';

  // ── Header section ──
  const headerContent = {
    columns: [
      {
        width: '*',
        stack: [
          { text: 'QUOTATION', style: 'title' },
          {
            text: quotation.quotationNo || 'DRAFT',
            style: 'quotationNumber',
            margin: [0, 4, 0, 0],
          },
        ],
      },
      {
        width: 'auto',
        stack: [
          {
            text: `Date: ${formatDate(quotation.quotationDate)}`,
            style: 'headerMeta',
          },
          quotation.dueDate
            ? {
                text: `Due: ${formatDate(quotation.dueDate)}`,
                style: 'headerMeta',
                margin: [0, 2, 0, 0],
              }
            : {},
        ],
        alignment: 'right',
      },
    ],
    margin: [0, 0, 0, 20],
  };

  // ── Separator line ──
  const separator = {
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 515,
        y2: 0,
        lineWidth: 2,
        lineColor: accentColor,
      },
    ],
    margin: [0, 0, 0, 20],
  };

  // ── From / To addresses ──
  const buildAddressBlock = (label, data) => {
    const lines = [];
    lines.push({ text: label, style: 'addressLabel' });
    if (data?.businessName) lines.push({ text: data.businessName, style: 'businessName' });
    if (data?.address) lines.push({ text: data.address, style: 'addressText' });
    if (data?.phone) lines.push({ text: `Phone: ${data.phone}`, style: 'addressText' });
    if (data?.email) lines.push({ text: `Email: ${data.email}`, style: 'addressText' });
    if (data?.country) lines.push({ text: data.country, style: 'addressText' });
    if (data?.salesPersonName) {
      lines.push({
        text: `Sales Rep: ${data.salesPersonName}${data.salesPersonId ? ` (${data.salesPersonId})` : ''}`,
        style: 'addressText',
        margin: [0, 4, 0, 0],
      });
    }
    return { stack: lines };
  };

  const addressSection = {
    columns: [
      { width: '*', ...buildAddressBlock('FROM', quotation.from) },
      { width: 20, text: '' },
      { width: '*', ...buildAddressBlock('TO', quotation.to) },
    ],
    margin: [0, 0, 0, 25],
  };

  // ── Line items table ──
  const tableHeader = [
    { text: '#', style: 'tableHeader', alignment: 'center' },
    { text: 'Item', style: 'tableHeader' },
    { text: 'Qty', style: 'tableHeader', alignment: 'center' },
    { text: 'Rate', style: 'tableHeader', alignment: 'right' },
    { text: 'Total', style: 'tableHeader', alignment: 'right' },
  ];

  const tableBody = (quotation.lineItems || []).map((item, index) => {
    // Build item description parts
    const itemContent = [{ text: item.itemName || 'N/A', bold: true, fontSize: 9 }];

    if (item.description) {
      itemContent.push({ text: item.description, fontSize: 8, color: '#666666', margin: [0, 2, 0, 0] });
    }

    if (item.isSubscription) {
      const interval = item.subscriptionDetails?.interval || 'month';
      const count = item.subscriptionDetails?.intervalCount || 1;
      itemContent.push({
        text: `Subscription: every ${count} ${interval}(s)`,
        fontSize: 7,
        color: '#7c3aed',
        italics: true,
        margin: [0, 2, 0, 0],
      });
    }

    if (item.selectedOptions && item.selectedOptions.length > 0) {
      const optionTexts = item.selectedOptions.map(
        (opt) => `${opt.attributeName}: ${opt.optionLabel}`
      );
      itemContent.push({
        text: optionTexts.join('  |  '),
        fontSize: 7,
        color: '#888888',
        margin: [0, 2, 0, 0],
      });
    }

    return [
      { text: (index + 1).toString(), alignment: 'center', fontSize: 9, margin: [0, 4, 0, 4] },
      { stack: itemContent, margin: [0, 4, 0, 4] },
      { text: (item.quantity || 0).toString(), alignment: 'center', fontSize: 9, margin: [0, 4, 0, 4] },
      { text: formatAmount(item.rate, currency), alignment: 'right', fontSize: 9, margin: [0, 4, 0, 4] },
      { text: formatAmount(item.total, currency), alignment: 'right', fontSize: 9, bold: true, margin: [0, 4, 0, 4] },
    ];
  });

  const itemsTable = {
    table: {
      headerRows: 1,
      widths: [25, '*', 35, 70, 75],
      body: [tableHeader, ...tableBody],
    },
    layout: {
      hLineWidth: (i, node) => {
        if (i === 0) return 0;
        if (i === 1) return 1.5;
        return 0.5;
      },
      vLineWidth: () => 0,
      hLineColor: (i) => (i === 1 ? accentColor : '#e5e7eb'),
      fillColor: (rowIndex) => {
        if (rowIndex === 0) return accentColor;
        return rowIndex % 2 === 0 ? '#f9fafb' : null;
      },
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 0, 0, 15],
  };

  // ── Totals summary ──
  const totalsRows = [];

  totalsRows.push([
    { text: 'Subtotal', alignment: 'right', fontSize: 9, color: '#555555' },
    { text: formatAmount(quotation.subtotal, currency), alignment: 'right', fontSize: 9 },
  ]);

  if (quotation.totalTax && quotation.totalTax > 0) {
    totalsRows.push([
      { text: 'Tax', alignment: 'right', fontSize: 9, color: '#555555' },
      { text: formatAmount(quotation.totalTax, currency), alignment: 'right', fontSize: 9 },
    ]);
  }

  if (quotation.couponCode && quotation.couponDiscount > 0) {
    totalsRows.push([
      { text: `Discount (${quotation.couponCode})`, alignment: 'right', fontSize: 9, color: '#16a34a' },
      { text: `-${formatAmount(quotation.couponDiscount, currency)}`, alignment: 'right', fontSize: 9, color: '#16a34a' },
    ]);
  }

  totalsRows.push([
    { text: 'Total Amount', alignment: 'right', fontSize: 11, bold: true, color: accentColor },
    { text: formatAmount(quotation.totalAmount, currency), alignment: 'right', fontSize: 11, bold: true, color: accentColor },
  ]);

  const totalsSection = {
    columns: [
      { width: '*', text: '' },
      {
        width: 220,
        table: {
          widths: ['*', 100],
          body: totalsRows,
        },
        layout: {
          hLineWidth: (i, node) => {
            if (i === node.table.body.length - 1) return 1.5;
            if (i === node.table.body.length) return 1.5;
            return 0;
          },
          vLineWidth: () => 0,
          hLineColor: () => accentColor,
          paddingTop: () => 5,
          paddingBottom: () => 5,
          paddingLeft: () => 0,
          paddingRight: () => 0,
        },
      },
    ],
    margin: [0, 0, 0, 25],
  };

  // ── Notes and Terms ──
  const notesTerms = [];

  if (quotation.notes) {
    notesTerms.push({
      stack: [
        { text: 'Notes', style: 'sectionLabel' },
        {
          text: quotation.notes,
          fontSize: 9,
          color: '#555555',
          lineHeight: 1.4,
          margin: [0, 0, 0, 15],
        },
      ],
    });
  }

  if (quotation.terms) {
    notesTerms.push({
      stack: [
        { text: 'Terms & Conditions', style: 'sectionLabel' },
        {
          text: quotation.terms,
          fontSize: 9,
          color: '#555555',
          lineHeight: 1.4,
          margin: [0, 0, 0, 15],
        },
      ],
    });
  }

  // ── Footer ──
  const footer = (currentPage, pageCount) => ({
    columns: [
      {
        text: quotation.from?.businessName || '',
        fontSize: 8,
        color: '#999999',
        margin: [40, 0, 0, 0],
      },
      {
        text: `Page ${currentPage} of ${pageCount}`,
        fontSize: 8,
        color: '#999999',
        alignment: 'right',
        margin: [0, 0, 40, 0],
      },
    ],
    margin: [0, 10, 0, 0],
  });

  // ── Build full document definition ──
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 50],
    footer,
    content: [
      headerContent,
      separator,
      addressSection,
      itemsTable,
      totalsSection,
      ...notesTerms,
    ],
    styles: {
      title: {
        fontSize: 26,
        bold: true,
        color: accentColor,
        characterSpacing: 2,
      },
      quotationNumber: {
        fontSize: 11,
        color: '#666666',
      },
      headerMeta: {
        fontSize: 9,
        color: '#666666',
      },
      addressLabel: {
        fontSize: 8,
        bold: true,
        color: '#ffffff',
        margin: [0, 0, 0, 6],
        background: accentColor,
        // Use a filled rect-like approach by wrapping in a table below
      },
      businessName: {
        fontSize: 12,
        bold: true,
        color: '#1f2937',
        margin: [0, 0, 0, 3],
      },
      addressText: {
        fontSize: 9,
        color: '#555555',
        lineHeight: 1.4,
      },
      tableHeader: {
        fontSize: 9,
        bold: true,
        color: '#ffffff',
      },
      sectionLabel: {
        fontSize: 10,
        bold: true,
        color: accentColor,
        margin: [0, 0, 0, 6],
      },
    },
    defaultStyle: {
      font: 'Roboto',
    },
  };

  // Wrap address labels in styled tables for background color effect
  const fromBlock = docDefinition.content[2].columns[0];
  const toBlock = docDefinition.content[2].columns[2];

  const wrapAddressLabel = (block) => {
    if (block.stack && block.stack.length > 0 && block.stack[0].style === 'addressLabel') {
      const label = block.stack[0];
      block.stack[0] = {
        table: {
          widths: ['*'],
          body: [[{ text: label.text, fontSize: 8, bold: true, color: '#ffffff', margin: [6, 3, 6, 3] }]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          fillColor: () => accentColor,
        },
        margin: [0, 0, 0, 8],
      };
    }
  };

  wrapAddressLabel(fromBlock);
  wrapAddressLabel(toBlock);

  return docDefinition;
};

/**
 * Download quotation as PDF (client-side)
 */
export const downloadQuotationPDF = (quotation) => {
  try {
    const docDefinition = buildQuotationDocDefinition(quotation);
    const filename = `Quotation-${quotation.quotationNo || 'Draft'}.pdf`;
    pdfMake.createPdf(docDefinition).download(filename);
  } catch (error) {
    console.error('Error generating quotation PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
};

/**
 * Open quotation PDF in a new tab (client-side)
 */
export const openQuotationPDF = (quotation) => {
  try {
    const docDefinition = buildQuotationDocDefinition(quotation);
    pdfMake.createPdf(docDefinition).open();
  } catch (error) {
    console.error('Error opening quotation PDF:', error);
    alert('Failed to open PDF. Please try again.');
  }
};

export { buildQuotationDocDefinition };

/**
 * Download invoice as PDF (client-side)
 */
export const downloadInvoicePDF = (invoice) => {
  try {
    // Map invoice to quotation format for the PDF generator
    const mappedQuotation = {
      ...invoice,
      quotationNo: invoice.invoiceNo,
      quotationDate: invoice.invoiceDate || invoice.createdAt,
      from: invoice.billFrom,
      to: invoice.billTo,
    };
    
    const docDefinition = buildQuotationDocDefinition(mappedQuotation);
    
    // Change QUOTATION to INVOICE in the header
    if (docDefinition.content[0] && docDefinition.content[0].columns && docDefinition.content[0].columns[0]) {
      const stack = docDefinition.content[0].columns[0].stack;
      if (stack && stack[0] && stack[0].text === 'QUOTATION') {
        stack[0].text = 'INVOICE';
      }
    }
    
    const filename = `Invoice-${invoice.invoiceNo || 'Draft'}.pdf`;
    pdfMake.createPdf(docDefinition).download(filename);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
};
