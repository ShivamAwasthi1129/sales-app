import User from '../../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import connectDB from '../../lib/mongodb.js';
import { sendWelcomeEmail, sendPasswordChangeEmail } from '../../lib/email.js';

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Helper function to verify token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const userResolvers = {
  Query: {
    getUsers: async (_, __, context) => {
      await connectDB();
      
      // Check if user is authenticated
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Check if user has permission (Super Admin or Admin)
      if (!['Super Admin', 'Admin'].includes(context.user.role)) {
        throw new Error('Not authorized');
      }

      const users = await User.find({}).sort({ createdAt: -1 });
      return users.map(user => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }));
    },

    getUser: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const user = await User.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },

    getCurrentUser: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const user = await User.findById(context.user.userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },
  },

  Mutation: {
    login: async (_, { email, password }) => {
      await connectDB();

      // Find user with password field
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (user.status !== 'Active') {
        throw new Error('Account is inactive. Please contact administrator.');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Generate token
      const token = generateToken(user);

      return {
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone || '',
          address: user.address || '',
          status: user.status,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      };
    },

    register: async (_, { name, email, password, role, phone, address }) => {
      await connectDB();

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create new user
      const user = await User.create({
        name,
        email,
        password,
        role: role || 'Client',
        phone,
        address,
      });

      // Generate token
      const token = generateToken(user);

      return {
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone || '',
          address: user.address || '',
          status: user.status,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      };
    },

    createUser: async (_, { name, email, password, role, phone, address }, context) => {
      await connectDB();

      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Check authorization (Super Admin, Admin, and AdminTeam can create users)
      if (!['Super Admin', 'Admin', 'AdminTeam'].includes(context.user.role)) {
        throw new Error('Not authorized to create users');
      }

      // Role restrictions for created users
      const currentUserRole = context.user.role;
      
      // Admin cannot create Super Admin
      if (currentUserRole === 'Admin' && role === 'Super Admin') {
        throw new Error('Not authorized to create Super Admin');
      }
      
      // AdminTeam cannot create Super Admin or Admin
      if (currentUserRole === 'AdminTeam' && (role === 'Super Admin' || role === 'Admin')) {
        throw new Error('Not authorized to create this role');
      }

      // Clean and validate email from input
      const cleanEmail = email ? email.trim().toLowerCase() : '';
      if (!cleanEmail || !cleanEmail.includes('@')) {
        throw new Error('Invalid email address');
      }

      console.log('Creating user with email:', cleanEmail);

      // Check if user already exists
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create new user
      const user = await User.create({
        name,
        email: cleanEmail, // Use cleaned email
        password,
        role,
        phone,
        address,
      });

      // Send welcome email to new user using the cleaned email from input
      // Note: Pass password before it gets hashed (it's still in plain text at this point)
      try {
        console.log('Sending welcome email to:', cleanEmail);
        const emailResult = await sendWelcomeEmail({
          name: name,
          email: cleanEmail, // Use the cleaned email from input
          password: password, // Pass the original password before hashing
          role: role,
          phone: phone || '',
          address: address || '',
          status: user.status,
        });
        console.log('Email send result:', emailResult);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't throw error, just log it - user creation should still succeed
      }

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },

    updateUser: async (_, { id, name, email, password, role, phone, address, status }, context) => {
      await connectDB();

      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Get the target user
      const targetUser = await User.findById(id);
      if (!targetUser) {
        throw new Error('User not found');
      }

      const currentUserRole = context.user.role;
      const targetUserRole = targetUser.role;
      const currentUserId = context.user.userId;

      // Check authorization based on roles
      // Super Admin can edit anyone
      if (currentUserRole === 'Super Admin') {
        // Super Admin can edit anyone
      }
      // Admin cannot edit Super Admin
      else if (currentUserRole === 'Admin') {
        if (targetUserRole === 'Super Admin') {
          throw new Error('Not authorized to edit Super Admin');
        }
        // Admin can edit itself and others (except Super Admin)
      }
      // AdminTeam cannot edit Super Admin or Admin
      else if (currentUserRole === 'AdminTeam') {
        if (targetUserRole === 'Super Admin' || targetUserRole === 'Admin') {
          throw new Error('Not authorized to edit this user');
        }
        // AdminTeam can edit itself and others (except Super Admin and Admin)
      }
      // Client cannot edit anyone
      else {
        throw new Error('Not authorized to update users');
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      
      // Password update (only if provided)
      if (password) {
        // Only Super Admin and Admin can change passwords
        if (currentUserRole === 'Super Admin' || currentUserRole === 'Admin') {
          // Hash the password before updating (since findByIdAndUpdate doesn't trigger pre-save hook)
          const salt = await bcrypt.genSalt(10);
          updateData.password = await bcrypt.hash(password, salt);
        } else {
          throw new Error('Not authorized to change password');
        }
      }
      
      // Role change restrictions
      if (role) {
        // Super Admin can change anyone's role
        if (currentUserRole === 'Super Admin') {
          updateData.role = role;
        }
        // Admin cannot change Super Admin's role
        else if (currentUserRole === 'Admin') {
          if (targetUserRole === 'Super Admin') {
            throw new Error('Not authorized to change Super Admin role');
          }
          updateData.role = role;
        }
        // AdminTeam cannot change Super Admin or Admin's role
        else if (currentUserRole === 'AdminTeam') {
          if (targetUserRole === 'Super Admin' || targetUserRole === 'Admin') {
            throw new Error('Not authorized to change this user\'s role');
          }
          updateData.role = role;
        }
      }
      
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (status) updateData.status = status;

      const user = await User.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      // Send password change notification email if password was updated
      if (password && (currentUserRole === 'Super Admin' || currentUserRole === 'Admin')) {
        try {
          await sendPasswordChangeEmail({
            name: user.name,
            email: user.email,
          });
        } catch (emailError) {
          console.error('Failed to send password change email:', emailError);
          // Don't throw error, just log it
        }
      }

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },

    deleteUser: async (_, { id }, context) => {
      await connectDB();

      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Get the target user
      const targetUser = await User.findById(id);
      if (!targetUser) {
        throw new Error('User not found');
      }

      const currentUserRole = context.user.role;
      const targetUserRole = targetUser.role;
      const currentUserId = context.user.userId;

      // Prevent self-deletion
      if (currentUserId === id) {
        throw new Error('Cannot delete your own account');
      }

      // Check authorization based on roles
      // Super Admin can delete anyone (except itself)
      if (currentUserRole === 'Super Admin') {
        // Super Admin can delete anyone
      }
      // Admin cannot delete Super Admin or itself
      else if (currentUserRole === 'Admin') {
        if (targetUserRole === 'Super Admin') {
          throw new Error('Not authorized to delete Super Admin');
        }
        // Admin can delete others (except Super Admin)
      }
      // AdminTeam cannot delete Super Admin, Admin, or itself
      else if (currentUserRole === 'AdminTeam') {
        if (targetUserRole === 'Super Admin' || targetUserRole === 'Admin') {
          throw new Error('Not authorized to delete this user');
        }
        // AdminTeam can delete others (except Super Admin and Admin)
      }
      // Client cannot delete anyone
      else {
        throw new Error('Not authorized to delete users');
      }

      const user = await User.findByIdAndDelete(id);

      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        message: 'User deleted successfully',
      };
    },
  },
};


