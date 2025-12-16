'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { setAuthToken } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';
import { getDefaultPathForRole, ROLES } from '../../config/navigation.config';

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
      const { data } = await loginMutation({
        variables: { email, password },
      });

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">
        {/* Left Side - SaleStar Branding */}
        <div className="hidden lg:flex flex-col justify-center space-y-8 px-8 animate-fade-in-up">
          <div className="space-y-6">
            {/* Lightning Logo */}
            <div className="inline-block animate-scale-up">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl hover-glow relative overflow-hidden group">
                <svg className="w-12 h-12 text-white animate-lightning relative z-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
              </div>
            </div>

            {/* Hero Text */}
            <div className="space-y-4">
              <h1 className="text-5xl xl:text-6xl font-black leading-tight">
                <span className="gradient-text">SaleStar</span>
              </h1>
              <p className="text-2xl font-bold text-gray-700">
                ⚡ Close Deals in Minutes
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                Lightning-fast sales engine that turns conversations into closed deals instantly. 
                No meetings required.
              </p>
            </div>
          </div>
          
          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3 glass-effect p-5 rounded-2xl border border-white/30 hover:scale-105 transition-transform duration-300 card-3d">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Lightning Fast</h3>
              <p className="text-sm text-gray-600 font-medium">Close deals in seconds, not days</p>
            </div>
            <div className="space-y-3 glass-effect p-5 rounded-2xl border border-white/30 hover:scale-105 transition-transform duration-300 card-3d">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Secure Access</h3>
              <p className="text-sm text-gray-600 font-medium">Enterprise-grade security</p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-block mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl hover-glow relative overflow-hidden">
                <svg className="w-10 h-10 text-white animate-lightning relative z-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-black gradient-text">
              SaleStar
            </h2>
            <p className="text-gray-600 mt-2 font-medium">⚡ Lightning-Fast Sales</p>
          </div>

          {/* Login Card */}
          <div className="glass-effect shadow-2xl border-2 border-white/50 rounded-3xl overflow-hidden card-3d">
            {/* Card Header */}
            <div className="space-y-4 pb-6 bg-gradient-to-br from-white/90 via-white/70 to-white/50 backdrop-blur-xl border-b-2 border-white/30 px-6 sm:px-8 pt-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-100/50 to-transparent animate-gradient"></div>
              <div className="space-y-2 relative z-10">
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 text-center">
                  Welcome Back! 👋
                </h2>
                <p className="text-gray-600 text-center font-medium">
                  Sign in to access your dashboard
                </p>
              </div>
            </div>
            
            {/* Form Container */}
            <div className="px-6 sm:px-8 py-8 space-y-6 bg-white/80 backdrop-blur-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Input */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-gray-800 font-bold text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full px-5 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-300 text-sm sm:text-base text-gray-900 font-medium hover:border-indigo-300 shadow-sm hover:shadow-md"
                    />
                  </div>
                </div>
                
                {/* Password Input */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-gray-800 font-bold text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="w-full px-5 py-3.5 pr-14 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-300 text-sm sm:text-base text-gray-900 font-medium hover:border-indigo-300 shadow-sm hover:shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-all duration-300 hover:scale-110 p-1"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Error Message */}
                {error && (
                  <div className="border-2 border-red-200 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-4 flex items-start animate-scale-up shadow-lg">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-700 text-sm font-semibold">{error}</p>
                  </div>
                )}
                
                {/* Submit Button */}
                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white py-4 rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group" 
                  disabled={loading}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity shimmer"></div>
                  {loading ? (
                    <div className="flex items-center justify-center relative z-10">
                      <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </div>
                  ) : (
                    <span className="flex items-center justify-center relative z-10">
                      ⚡ Sign In
                      <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  )}
                </button>
              </form>
            </div>
          </div>
          
          {/* Footer */}
          <div className="text-center mt-6 text-gray-600 text-xs sm:text-sm px-4 font-medium">
            <p className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
              </svg>
              © 2025 SaleStar. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
