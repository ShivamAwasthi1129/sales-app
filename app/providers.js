'use client';

import { ApolloProvider } from '@apollo/client/react';
import getApolloClient from '../lib/apolloClient';
import { AuthProvider } from '../contexts/AuthContext';
import RouteGuard from '../components/RouteGuard';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export function Providers({ children }) {
  const client = getApolloClient();
  
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <RouteGuard>
          {children}
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </RouteGuard>
      </AuthProvider>
    </ApolloProvider>
  );
}
