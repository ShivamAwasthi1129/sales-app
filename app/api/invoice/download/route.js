import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Invoice from '../../../../models/Invoice';
import { requireAuth } from '../../../../lib/authMiddleware';
import { generateInvoicePDFBuffer } from '../../../../lib/invoicePDFGenerator';
import User from '../../../../models/User';

/**
 * Download Invoice PDF
 * GET /api/invoice/download?id=<invoiceId>
 */
export async function GET(request) {
  try {
    // Authenticate user
    const authResult = requireAuth(request);
    
    // Check if authentication failed
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    const user = authResult.user;
    console.log('[Invoice Download] Authenticated user:', user);
    
    await connectDB();

    // Get invoice ID from query params
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('id');

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Fetch invoice from database
    const invoice = await Invoice.findById(invoiceId).lean();

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Authorization check
    const userId = user.userId || user.id;
    const userRole = user.role;

    console.log('[Invoice Download] Authorization check:', {
      userId,
      userRole,
      invoiceId,
      invoiceCustomerId: invoice.customerId?.toString(),
      invoiceCompanyId: invoice.companyId?.toString(),
    });

    let authorized = false;

    if (userRole === 'Super Admin') {
      // Super Admin can download any invoice
      authorized = true;
      console.log('[Invoice Download] Authorized: Super Admin');
    } else if (userRole === 'Admin' || userRole === 'Sales Person') {
      // Check if invoice belongs to user's company
      const userDoc = await User.findById(userId).lean();
      if (userDoc && userDoc.companyId && invoice.companyId.toString() === userDoc.companyId.toString()) {
        authorized = true;
        console.log('[Invoice Download] Authorized: Admin/Sales Person from same company');
      }
    } else if (userRole === 'Customer') {
      // Check if invoice belongs to customer
      const customerIdMatch = invoice.customerId?.toString() === userId?.toString();
      console.log('[Invoice Download] Customer ID comparison:', {
        invoiceCustomerId: invoice.customerId?.toString(),
        userId: userId?.toString(),
        match: customerIdMatch,
      });
      if (customerIdMatch) {
        authorized = true;
        console.log('[Invoice Download] Authorized: Customer owns this invoice');
      }
    }

    if (!authorized) {
      console.error('[Invoice Download] Authorization DENIED for user:', {
        userId,
        userRole,
        invoiceId,
        invoiceCustomerId: invoice.customerId?.toString(),
      });
      return NextResponse.json(
        { error: 'Not authorized to download this invoice' },
        { status: 403 }
      );
    }

    // Generate PDF
    const pdfBuffer = generateInvoicePDFBuffer(invoice);

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${invoice.invoiceNo}.pdf"`,
      },
    });

  } catch (error) {
    console.error('[Invoice Download] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download invoice' },
      { status: 500 }
    );
  }
}

