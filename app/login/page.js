// login/page.js

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { setAuthToken } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';
import { getDefaultPathForRole, ROLES } from '../../config/navigation.config';

// GraphQL mutation for login
const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
        role
        salesPersonId
      }
    }
  }
`;

// Login Page Component
export default function LoginPage() {
  const { login: authLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loginMutation] = useMutation(LOGIN_MUTATION);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const { data } = await loginMutation({ variables: { email, password } });
      if (data?.login) {
        const { user, token } = data.login;

        // Validate that Super Admin cannot login through regular login page
        if (user.role === ROLES.SUPER_ADMIN) {
          setError('Super Admin access is restricted. Please use the Super Admin login portal.');
          setLoading(false);
          return;
        }

        // Map old role names to new role constants
        let normalizedRole = user.role;
        if (user.role === 'Client') {
          normalizedRole = ROLES.CUSTOMER;
        }

        // Store token
        setAuthToken(token);

        // Use auth context to login and redirect
        const userData = { ...user, role: normalizedRole };
        authLogin(userData, token);
      }
    } catch (err) {
      const errorMessage = err.message ||
        err.graphQLErrors?.[0]?.message ||
        'Login failed. Please check your credentials.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex items-start justify-center overflow-hidden pt-6 pr-6">
      <div className="w-full flex flex-col md:flex-row items-stretch h-full">
        {/* Left: Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex items-center justify-center overflow-hidden">
          <div className="w-full max-w-sm flex flex-col justify-center">
            <h1 className="text-2xl font-semibold text-gray-900">Sign in to your account</h1>
            <p className="text-sm text-gray-600 mt-2 mb-6">Enter your credentials to access the dashboard.</p>

            {/* Email Input */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="Enter email address"
                  required
                  className="mt-1 block w-full px-4 py-2 border border-gray-200 rounded-md bg-white text-gray-800 placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <div className="relative mt-1">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Enter Password"
                    required
                    className="block w-full px-4 py-2 border border-gray-200 rounded-md bg-white text-gray-800 placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M13.875 18.825A10.05 10.05 0 0112 19
                          c-4.478 0-8.268-2.943-9.543-7
                          a9.97 9.97 0 011.563-3.029
                          m5.858.908a3 3 0 114.243 4.243
                          M9.878 9.878l4.242 4.242
                          M9.88 9.88l-3.29-3.29
                          m7.532 7.532l3.29 3.29
                          M3 3l3.59 3.59
                          m0 0A9.953 9.953 0 0112 5
                          c4.478 0 8.268 2.943 9.543 7
                          a10.025 10.025 0 01-4.132 5.411
                          m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 border border-red-200 bg-red-50 rounded-md text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white py-2 rounded-md font-medium shadow-sm disabled:opacity-60 bg-blue-900"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>

            <div className="mt-6 text-xs text-gray-600">© {new Date().getFullYear()} SaleStar. All rights reserved.</div>
          </div>
        </div>

        {/* Right: Visuals */}
        <div className="hidden md:flex w-1/2 items-center justify-start relative overflow-hidden rounded-tl-3xl rounded-tr-3xl">
          {/* Heading */}
          <div className="absolute top-8 left-63 z-10">
            <p className="text-xs font-semibold text-gray-400 bg-white px-3 py-1 inline-block rounded-md border-2 border-gray-200">SALES STAR Login Portal</p>
          </div>

          {/* Tagline */}
          <div className="absolute top-15 left-65 z-10 mt-4">
            <p className="text-sm font-bold text-gray-600">Lightning fast sales engine that turns conversation <br /><span className="text-blue-700">closed deals instantly</span></p>
          </div>

          {/* Background Gradient container */}
          <div className="absolute inset-y-0 right-0 left-1/5 bg-linear-to-b from-blue-100 to-white rounded-tl-3xl" />
          <div className="absolute inset-0 bg-linear-to-l from-purple-100/40 via-pink-50/25 to-transparent" />

          {/* Image container */}
          <div className="relative h-full w-full flex items-start justify-end pl-0 pr-0 pt-35">
            <img
              src="/loginImage.png"
              alt="Dashboard preview"
              className="h-full w-auto object-cover rounded-tl-3xl shadow-lg transform scale-105 origin-top-right transition-transform duration-200"
            />
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t from-white via-white/50 to-transparent rounded-tl-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
