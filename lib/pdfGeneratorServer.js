// lib/pdfGeneratorServer.js - Server-side PDF generator using pdfmake
import PdfPrinter from 'pdfmake';
import path from 'path';

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
 * Build pdfmake doc definition (same design as client-side)
 */
const buildDocDefinition = (quotation) => {
  const currency = quotation.currency || 'USD';
  const accentColor = '#1e3a5f';

  // ── Header ──
  const headerContent = {
    columns: [
      {
        width: '*',
        stack: [
          { text: 'QUOTATION', fontSize: 26, bold: true, color: accentColor, characterSpacing: 2 },
          { text: quotation.quotationNo || 'DRAFT', fontSize: 11, color: '#666666', margin: [0, 4, 0, 0] },
        ],
      },
      {
        width: 'auto',
        stack: [
          { text: `Date: ${formatDate(quotation.quotationDate)}`, fontSize: 9, color: '#666666', alignment: 'right' },
          quotation.dueDate
            ? { text: `Due: ${formatDate(quotation.dueDate)}`, fontSize: 9, color: '#666666', alignment: 'right', margin: [0, 2, 0, 0] }
            : {},
        ],
        alignment: 'right',
      },
    ],
    margin: [0, 0, 0, 20],
  };

  const separator = {
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: accentColor }],
    margin: [0, 0, 0, 20],
  };

  // ── Address blocks ──
  const buildAddr = (label, data) => {
    const lines = [];
    lines.push({
      table: { widths: ['*'], body: [[{ text: label, fontSize: 8, bold: true, color: '#ffffff', margin: [6, 3, 6, 3] }]] },
      layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => accentColor },
      margin: [0, 0, 0, 8],
    });
    if (data?.businessName) lines.push({ text: data.businessName, fontSize: 12, bold: true, color: '#1f2937', margin: [0, 0, 0, 3] });
    if (data?.address) lines.push({ text: data.address, fontSize: 9, color: '#555555', lineHeight: 1.4 });
    if (data?.phone) lines.push({ text: `Phone: ${data.phone}`, fontSize: 9, color: '#555555' });
    if (data?.email) lines.push({ text: `Email: ${data.email}`, fontSize: 9, color: '#555555' });
    if (data?.country) lines.push({ text: data.country, fontSize: 9, color: '#555555' });
    if (data?.salesPersonName) {
      lines.push({ text: `Sales Rep: ${data.salesPersonName}${data.salesPersonId ? ` (${data.salesPersonId})` : ''}`, fontSize: 9, color: '#555555', margin: [0, 4, 0, 0] });
    }
    return { stack: lines };
  };

  const addressSection = {
    columns: [
      { width: '*', ...buildAddr('FROM', quotation.from) },
      { width: 20, text: '' },
      { width: '*', ...buildAddr('TO', quotation.to) },
    ],
    margin: [0, 0, 0, 25],
  };

  // ── Line items table ──
  const tableHeader = [
    { text: '#', fontSize: 9, bold: true, color: '#ffffff', alignment: 'center' },
    { text: 'Item', fontSize: 9, bold: true, color: '#ffffff' },
    { text: 'Qty', fontSize: 9, bold: true, color: '#ffffff', alignment: 'center' },
    { text: 'Rate', fontSize: 9, bold: true, color: '#ffffff', alignment: 'right' },
    { text: 'Total', fontSize: 9, bold: true, color: '#ffffff', alignment: 'right' },
  ];

  const tableBody = (quotation.lineItems || []).map((item, index) => {
    const itemContent = [{ text: item.itemName || 'N/A', bold: true, fontSize: 9 }];

    if (item.description) {
      itemContent.push({ text: item.description, fontSize: 8, color: '#666666', margin: [0, 2, 0, 0] });
    }
    if (item.isSubscription) {
      const interval = item.subscriptionDetails?.interval || 'month';
      const count = item.subscriptionDetails?.intervalCount || 1;
      itemContent.push({ text: `Subscription: every ${count} ${interval}(s)`, fontSize: 7, color: '#7c3aed', italics: true, margin: [0, 2, 0, 0] });
    }
    if (item.selectedOptions && item.selectedOptions.length > 0) {
      itemContent.push({ text: item.selectedOptions.map(o => `${o.attributeName}: ${o.optionLabel}`).join('  |  '), fontSize: 7, color: '#888888', margin: [0, 2, 0, 0] });
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
    table: { headerRows: 1, widths: [25, '*', 35, 70, 75], body: [tableHeader, ...tableBody] },
    layout: {
      hLineWidth: (i, node) => { if (i === 0) return 0; if (i === 1) return 1.5; return 0.5; },
      vLineWidth: () => 0,
      hLineColor: (i) => (i === 1 ? accentColor : '#e5e7eb'),
      fillColor: (rowIndex) => { if (rowIndex === 0) return accentColor; return rowIndex % 2 === 0 ? '#f9fafb' : null; },
      paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 6, paddingBottom: () => 6,
    },
    margin: [0, 0, 0, 15],
  };

  // ── Totals ──
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
        table: { widths: ['*', 100], body: totalsRows },
        layout: {
          hLineWidth: (i, node) => { if (i === node.table.body.length - 1 || i === node.table.body.length) return 1.5; return 0; },
          vLineWidth: () => 0, hLineColor: () => accentColor,
          paddingTop: () => 5, paddingBottom: () => 5, paddingLeft: () => 0, paddingRight: () => 0,
        },
      },
    ],
    margin: [0, 0, 0, 25],
  };

  // ── Notes & Terms ──
  const extra = [];
  if (quotation.notes) {
    extra.push({ text: 'Notes', fontSize: 10, bold: true, color: accentColor, margin: [0, 0, 0, 6] });
    extra.push({ text: quotation.notes, fontSize: 9, color: '#555555', lineHeight: 1.4, margin: [0, 0, 0, 15] });
  }
  if (quotation.terms) {
    extra.push({ text: 'Terms & Conditions', fontSize: 10, bold: true, color: accentColor, margin: [0, 0, 0, 6] });
    extra.push({ text: quotation.terms, fontSize: 9, color: '#555555', lineHeight: 1.4, margin: [0, 0, 0, 15] });
  }

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 50],
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: quotation.from?.businessName || '', fontSize: 8, color: '#999999', margin: [40, 0, 0, 0] },
        { text: `Page ${currentPage} of ${pageCount}`, fontSize: 8, color: '#999999', alignment: 'right', margin: [0, 0, 40, 0] },
      ],
      margin: [0, 10, 0, 0],
    }),
    content: [headerContent, separator, addressSection, itemsTable, totalsSection, ...extra],
    defaultStyle: { font: 'Roboto' },
  };
};

/**
 * Generate a quotation PDF buffer for use as an email attachment (server-side)
 */
export const generateQuotationPDFBuffer = (quotation) => {
  return new Promise((resolve, reject) => {
    try {
      // Define fonts for the printer using the pdfmake bundled fonts
      const fontDescriptors = {
        Roboto: {
          normal: path.join(process.cwd(), 'node_modules', 'pdfmake', 'build', 'fonts', 'Roboto', 'Roboto-Regular.ttf'),
          bold: path.join(process.cwd(), 'node_modules', 'pdfmake', 'build', 'fonts', 'Roboto', 'Roboto-Medium.ttf'),
          italics: path.join(process.cwd(), 'node_modules', 'pdfmake', 'build', 'fonts', 'Roboto', 'Roboto-Italic.ttf'),
          bolditalics: path.join(process.cwd(), 'node_modules', 'pdfmake', 'build', 'fonts', 'Roboto', 'Roboto-MediumItalic.ttf'),
        },
      };

      const printer = new PdfPrinter(fontDescriptors);
      const docDefinition = buildDocDefinition(quotation);
      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      const chunks = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
      pdfDoc.on('error', (err) => reject(err));
      pdfDoc.end();
    } catch (error) {
      reject(error);
    }
  });
};
