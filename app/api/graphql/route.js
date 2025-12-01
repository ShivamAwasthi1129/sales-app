import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { userTypeDefs } from '../../../graphql/schema/userSchema.js';
import { userResolvers, verifyToken } from '../../../graphql/resolvers/userResolvers.js';
import { productTypeDefs } from '../../../graphql/schema/productSchema.js';
import { productResolvers } from '../../../graphql/resolvers/productResolvers.js';
import { quotationTypeDefs } from '../../../graphql/schema/quotationSchema.js';
import { quotationResolvers } from '../../../graphql/resolvers/quotationResolvers.js';
import { couponTypeDefs } from '../../../graphql/schema/couponSchema.js';
import { couponResolvers } from '../../../graphql/resolvers/couponResolvers.js';
import { companyTypeDefs } from '../../../graphql/schema/companySchema.js';
import { companyResolvers } from '../../../graphql/resolvers/companyResolvers.js';
import { analyticsTypeDefs } from '../../../graphql/schema/analyticsSchema.js';
import { analyticsResolvers } from '../../../graphql/resolvers/analyticsResolvers.js';
import { planTypeDefs } from '../../../graphql/schema/planSchema.js';
import { planResolvers } from '../../../graphql/resolvers/planResolvers.js';
import { notesAndTermsTypeDefs } from '../../../graphql/schema/notesAndTermsSchema.js';
import { notesAndTermsResolvers } from '../../../graphql/resolvers/notesAndTermsResolvers.js';
import { invoiceTypeDefs } from '../../../graphql/schema/invoiceSchema.js';
import { invoiceResolvers } from '../../../graphql/resolvers/invoiceResolvers.js';
import { cookies } from 'next/headers';
import connectDB from '../../../lib/mongodb.js';
import Company from '../../../models/Company.js';
import User from '../../../models/User.js';

// Create Apollo Server instance
const server = new ApolloServer({
  typeDefs: [userTypeDefs, productTypeDefs, quotationTypeDefs, couponTypeDefs, companyTypeDefs, analyticsTypeDefs, planTypeDefs, notesAndTermsTypeDefs, invoiceTypeDefs],
  resolvers: [userResolvers, productResolvers, quotationResolvers, couponResolvers, companyResolvers, analyticsResolvers, planResolvers, notesAndTermsResolvers, invoiceResolvers],
});

// Create handler
const handler = startServerAndCreateNextHandler(server, {
  context: async (req) => {
    // Get token from cookies or authorization header
    const cookieStore = await cookies();
    let token = cookieStore.get('token')?.value;
    
    // Also check authorization header
    const authHeader = req.headers.get('authorization');
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Verify token and attach user to context
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        // Ensure user object has all necessary fields
        const user = {
          id: decoded.userId, // Add id field for compatibility
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          companyId: decoded.companyId || null, // IMPORTANT: Pass companyId from token
          salesPersonId: decoded.salesPersonId || null,
          type: decoded.type || null,
        };

        console.log('[GraphQL Context] User from token:', {
          userId: user.userId,
          role: user.role,
          companyId: user.companyId, // Log to verify
          email: user.email
        });

        // Check if user's role is enabled for their company (real-time validation)
        // Skip check for Super Admin (they're not tied to a company)
        if (user.role !== 'Super Admin') {
          try {
            await connectDB();
            
            // For regular users, check by companyId
            if (user.userId && !user.salesPersonId) {
              const dbUser = await User.findById(user.userId).lean();
              if (dbUser && dbUser.companyId) {
                const company = await Company.findById(dbUser.companyId).lean();
                if (company) {
                  const enabledRoles = company.enabledRoles || ['Admin', 'Customer', 'Sales Person'];
                  if (!enabledRoles.includes(user.role)) {
                    // Role is disabled - throw error to force logout with message
                    throw new Error(`Your ${user.role} role has been disabled for this company. Please contact your administrator.`);
                  }
                }
              }
            }
            
            // For sales persons, check by companyId (now in User model)
            if (user.role === 'Sales Person' || user.type === 'salesPerson') {
              const dbSalesPerson = await User.findById(user.userId).lean();
              if (dbSalesPerson && dbSalesPerson.companyId) {
                const company = await Company.findById(dbSalesPerson.companyId).lean();
                if (company) {
                  const enabledRoles = company.enabledRoles || ['Admin', 'Customer', 'Sales Person'];
                  if (!enabledRoles.includes('Sales Person')) {
                    // Sales Person role is disabled - throw error to force logout with message
                    throw new Error('Your Sales Person role has been disabled for this company. Please contact your administrator.');
                  }
                }
              }
            }
          } catch (error) {
            // If role is disabled, re-throw the error to prevent access
            if (error.message && error.message.includes('role has been disabled')) {
              throw error;
            }
            // For other errors, log but allow access (don't break the system)
            console.error('Error checking enabled roles:', error);
          }
        }
        
        console.log('[GraphQL Context] Returning user with companyId:', user.companyId);
        return { user };
      }
    }

    console.log('[GraphQL Context] No token found, returning null user');
    return { user: null };
  },
});

export async function GET(request) {
  return handler(request);
}

export async function POST(request) {
  return handler(request);
}
