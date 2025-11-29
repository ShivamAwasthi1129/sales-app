import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import Cookies from 'js-cookie';

let apolloClient;

function createApolloClient() {
  const httpLink = createHttpLink({
    uri: '/api/graphql',
  });

  const authLink = setContext((_, { headers }) => {
    // Get the authentication token from cookies
    const token = typeof window !== 'undefined' ? Cookies.get('token') : null;
    
    // Return the headers to the context so httpLink can read them
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      }
    };
  });

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            getCompanies: {
              merge(existing, incoming) {
                return incoming;
              },
            },
            getUsers: {
              merge(existing, incoming) {
                return incoming;
              },
            },
            getCompanyControlData: {
              merge(existing, incoming) {
                return incoming;
              },
            },
          },
        },
      },
    }),
    ssrMode: typeof window === 'undefined',
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
      },
      query: {
        fetchPolicy: 'cache-and-network',
      },
    },
  });
}

export default function getApolloClient() {
  // Make sure to create a new client for every server-side request so that data
  // isn't shared between connections (which would be bad)
  if (typeof window === 'undefined') {
    return createApolloClient();
  }

  // Reuse client on the client-side
  if (!apolloClient) {
    apolloClient = createApolloClient();
  }

  return apolloClient;
}
