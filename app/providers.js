'use client';

import { ApolloProvider } from '@apollo/client/react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import getApolloClient from '../lib/apolloClient';

export function Providers({ children }) {
  const client = getApolloClient();
  
  return (
    <ApolloProvider client={client}>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </ApolloProvider>
  );
}
