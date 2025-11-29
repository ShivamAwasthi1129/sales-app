'use client';

import { ApolloProvider } from '@apollo/client/react';
import getApolloClient from '../lib/apolloClient';
import { AuthProvider } from '../contexts/AuthContext';
import RouteGuard from '../components/RouteGuard';

export function Providers({ children }) {
  const client = getApolloClient();
  
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <RouteGuard>
          {children}
        </RouteGuard>
      </AuthProvider>
    </ApolloProvider>
  );
}
