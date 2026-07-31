import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import { requireAuth, requireRole } from '@/lib/authMiddleware';

// GET all companies
export async function GET(request) {
  try {
    const authResult = requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Restrict access: Only Super Admin and Admin can fetch companies for user creation
    const roleCheck = requireRole(authResult.user, ['Super Admin', 'Admin']);
    if (roleCheck) {
      return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });
    }

    await connectDB();
    
    let query = {};
    
    // Admins can only see their own company. Super Admins see all.
    if (authResult.user.role === 'Admin') {
      query._id = authResult.user.companyId;
    }

    const companies = await Company.find(query).sort({ createdAt: -1 });

    return NextResponse.json(companies.map(c => ({
      id: c._id,
      name: c.name,
      status: c.status,
      planId: c.planId,
      createdAt: c.createdAt
    })), { status: 200 });

  } catch (error) {
    console.error('Fetch companies error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
