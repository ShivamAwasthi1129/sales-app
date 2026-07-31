import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { requireAuth, requireRole } from '@/lib/authMiddleware';

// GET all users
export async function GET(request) {
  try {
    const authResult = requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Usually only Super Admin or Admin can get all users
    const roleCheck = requireRole(authResult.user, ['Super Admin', 'Admin']);
    if (roleCheck) {
      return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });
    }

    await connectDB();
    
    // Parse query params for filtering
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const companyId = searchParams.get('companyId');

    const query = {};
    if (role) query.role = role;
    if (companyId) query.companyId = companyId;

    // Super Admins can see all. Admins can only see users in their company.
    if (authResult.user.role === 'Admin') {
      query.companyId = authResult.user.companyId;
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    return NextResponse.json(users.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      companyId: u.companyId,
      salesPersonId: u.salesPersonId,
      createdAt: u.createdAt
    })), { status: 200 });

  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create user
export async function POST(request) {
  try {
    const authResult = requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const roleCheck = requireRole(authResult.user, ['Super Admin', 'Admin']);
    if (roleCheck) {
      return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });
    }

    await connectDB();
    const body = await request.json();

    // Check if user exists
    const existingUser = await User.findOne({ email: body.email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Security: Admins can only create users for their own company
    let companyId = body.companyId;
    if (authResult.user.role === 'Admin') {
      companyId = authResult.user.companyId;
    }

    // Validate role
    const validRoles = ['Super Admin', 'Admin', 'Customer', 'Sales Person'];
    if (body.role && !validRoles.includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const newUser = new User({
      ...body,
      companyId: companyId,
      createdByAdminId: authResult.user.userId
    });

    await newUser.save();

    return NextResponse.json({
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      salesPersonId: newUser.salesPersonId,
      message: 'User created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create user error:', error);
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
