'use client';

import { ApolloProvider } from '@apollo/client/react';
import getApolloClient from '../lib/apolloClient';

export function Providers({ children }) {
  const client = getApolloClient();
  
  return (
    <ApolloProvider client={client}>
      {children}
    </ApolloProvider>
  );
}
