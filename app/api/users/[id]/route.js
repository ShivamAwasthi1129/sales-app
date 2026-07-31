import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { requireAuth, requireRole } from '@/lib/authMiddleware';

// GET a specific user by ID
export async function GET(request, { params }) {
  try {
    const authResult = requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await connectDB();
    const { id } = await params;

    const user = await User.findById(id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Admins can only see users in their own company (or themselves)
    if (authResult.user.role === 'Admin' && 
        user.companyId?.toString() !== authResult.user.companyId && 
        authResult.user.userId !== user._id.toString()) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    return NextResponse.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      status: user.status,
      companyId: user.companyId,
      salesPersonId: user.salesPersonId,
      dateOfBirth: user.dateOfBirth,
      photo: user.photo,
      about: user.about,
      passwordChangeRequest: user.passwordChangeRequest,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }, { status: 200 });

  } catch (error) {
    console.error('Fetch user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update a specific user
export async function PUT(request, { params }) {
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
    const { id } = await params;
    const body = await request.json();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Admins can only update users in their own company
    if (authResult.user.role === 'Admin' && 
        user.companyId?.toString() !== authResult.user.companyId) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    // Cannot change role to Super Admin unless currently Super Admin
    if (body.role === 'Super Admin' && authResult.user.role !== 'Super Admin') {
      return NextResponse.json({ error: 'Cannot promote to Super Admin' }, { status: 403 });
    }

    // Update fields
    const updatableFields = [
      'name', 'email', 'role', 'phone', 'address', 'status', 
      'dateOfBirth', 'photo', 'about', 'password'
    ];
    
    // Admins cannot change companyId, only Super Admin can
    if (authResult.user.role === 'Super Admin' && body.companyId) {
      user.companyId = body.companyId;
    }

    updatableFields.forEach(field => {
      if (body[field] !== undefined) {
        user[field] = body[field];
      }
    });

    await user.save();

    return NextResponse.json({
      id: user._id,
      message: 'User updated successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Update user error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE a specific user
export async function DELETE(request, { params }) {
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
    const { id } = await params;

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Admins can only delete users in their own company
    if (authResult.user.role === 'Admin' && 
        user.companyId?.toString() !== authResult.user.companyId) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
