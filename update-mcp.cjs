const fs = require('fs');
let code = fs.readFileSync('mcp-server.js', 'utf8');

code = code.replace(
  /'update_company_settings', 'get_invoice_details', 'generate_payment_link', 'track_payment',/g,
  "'update_company_settings', 'get_invoice_details', 'get_quotation_details', 'generate_payment_link', 'track_payment',"
);
code = code.replace(
  /'get_invoice_details', 'generate_payment_link', 'track_payment',/g,
  "'get_invoice_details', 'get_quotation_details', 'generate_payment_link', 'track_payment',"
);
code = code.replace(
  /'get_invoice_details', 'track_payment',/g,
  "'get_invoice_details', 'get_quotation_details', 'track_payment',"
);

code = code.replace(
  /- To send a quotation to the client   call `send_quotation`/g,
  "- To view quotation details   call `get_quotation_details`\n- To send a quotation to the client   call `send_quotation`"
);

const schemaStr = `        // ════════════════════════════════════════════════════════════════════════
        // INVOICE DETAILS
        // ════════════════════════════════════════════════════════════════════════`;
const newSchemaStr = `        // ════════════════════════════════════════════════════════════════════════
        // QUOTATION DETAILS
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'get_quotation_details',
          description: 'Get full details of a single quotation by quotation number (e.g. QT-202501-00001) or quotation ID. Returns all fields including line items, billing info, and status.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              id: { type: 'string', description: 'Quotation ID (ObjectId) or quotation number (e.g. QT-202501-00001)' },
            },
            required: ['id']
          }
        },

        // ════════════════════════════════════════════════════════════════════════
        // INVOICE DETAILS
        // ════════════════════════════════════════════════════════════════════════`;
code = code.replace(schemaStr, newSchemaStr);

const handlerStr = `    // ── GET INVOICE DETAILS ──────────────────────────────────────────────────`;
const newHandlerStr = `    // ── GET QUOTATION DETAILS ────────────────────────────────────────────────
    if (name === 'get_quotation_details') {
      try {
        const { id } = args;
        if (!id) return err('Quotation ID or quotation number is required.');

        let quotation = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
          quotation = await Quotation.findById(id).lean();
        } else {
          quotation = await Quotation.findOne({ quotationNo: id }).lean();
        }
        if (!quotation) return err(\`Quotation not found: \${id}\`);

        // Role-based access check
        if (role === 'Customer') {
          const customer = await User.findById(userId).lean();
          const hasAccess = quotation.clientId?.toString() === userId ||
            (customer?.email && quotation.to?.email?.toLowerCase() === customer.email.toLowerCase());
          if (!hasAccess) return err('Access denied to this quotation.');
        } else if ((role === 'Admin' || role === 'Sales Person') && companyId) {
          if (quotation.companyId?.toString() !== companyId) return err('Access denied to this quotation.');
        }

        return ok({
          _id: quotation._id.toString(),
          quotationNo: quotation.quotationNo,
          status: quotation.status,
          currency: quotation.currency,
          totalAmount: quotation.totalAmount,
          subtotal: quotation.subtotal,
          quotationDate: quotation.quotationDate?.toISOString(),
          dueDate: quotation.dueDate?.toISOString(),
          from: quotation.from,
          to: quotation.to,
          lineItems: quotation.lineItems,
          notes: quotation.notes,
          terms: quotation.terms,
          payment: quotation.payment,
          invoiceNo: quotation.invoiceNo,
          createdAt: quotation.createdAt?.toISOString(),
          updatedAt: quotation.updatedAt?.toISOString()
        });
      } catch (e) { return err(e.message); }
    }

    // ── GET INVOICE DETAILS ──────────────────────────────────────────────────`;
code = code.replace(handlerStr, newHandlerStr);

fs.writeFileSync('mcp-server.js', code);
