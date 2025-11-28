import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { userTypeDefs } from '../../../graphql/schema/userSchema.js';
import { userResolvers, verifyToken } from '../../../graphql/resolvers/userResolvers.js';
import { productTypeDefs } from '../../../graphql/schema/productSchema.js';
import { productResolvers } from '../../../graphql/resolvers/productResolvers.js';
import { quotationTypeDefs } from '../../../graphql/schema/quotationSchema.js';
import { quotationResolvers } from '../../../graphql/resolvers/quotationResolvers.js';
import { salesPersonTypeDefs } from '../../../graphql/schema/salesPersonSchema.js';
import { salesPersonResolvers } from '../../../graphql/resolvers/salesPersonResolvers.js';
import { couponTypeDefs } from '../../../graphql/schema/couponSchema.js';
import { couponResolvers } from '../../../graphql/resolvers/couponResolvers.js';
import { cookies } from 'next/headers';

// Create Apollo Server instance
const server = new ApolloServer({
  typeDefs: [userTypeDefs, productTypeDefs, quotationTypeDefs, salesPersonTypeDefs, couponTypeDefs],
  resolvers: [userResolvers, productResolvers, quotationResolvers, salesPersonResolvers, couponResolvers],
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
      const user = verifyToken(token);
      return { user };
    }

    return { user: null };
  },
});

export async function GET(request) {
  return handler(request);
}

export async function POST(request) {
  return handler(request);
}
