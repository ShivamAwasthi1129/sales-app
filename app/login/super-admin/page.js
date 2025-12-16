'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { setAuthToken } from '../../../lib/auth';
import { useAuth } from '../../../contexts/AuthContext';
import { ROLES } from '../../../config/navigation.config';

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
        role
      }
    }
  }
`;

export default function SuperAdminLoginPage() {
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
        
        // Validate that the user is a Super Admin
        if (user.role !== ROLES.SUPER_ADMIN) {
          setError(`Access denied. This account is registered as ${user.role}. Super Admin access required.`);
          setLoading(false);
          return;
        }

        // Store token
        setAuthToken(token);
        
        // Use auth context to login and redirect
        authLogin(user, token);
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-indigo-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">
        {/* Left Side - Super Admin Branding */}
        <div className="hidden lg:flex flex-col justify-center space-y-8 px-8 animate-fade-in-up">
          <div className="space-y-6">
            {/* Lightning Logo with Crown */}
            <div className="inline-block animate-scale-up relative">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-2xl glow-effect relative overflow-hidden group">
                <svg className="w-14 h-14 text-white animate-lightning relative z-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
              </div>
              {/* Crown Icon */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce-subtle">
                <svg className="w-5 h-5 text-yellow-900" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z"/>
                </svg>
              </div>
            </div>

            {/* Hero Text */}
            <div className="space-y-4">
              <h1 className="text-5xl xl:text-6xl font-black leading-tight text-white">
                Super Admin
                <span className="block bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 bg-clip-text text-transparent">
                  Portal
                </span>
              </h1>
              <p className="text-xl font-bold text-gray-300">
                👑 Ultimate Control Center
              </p>
              <p className="text-base text-gray-400 leading-relaxed">
                Full system access with complete control over all operations, users, and analytics. 
                Manage everything from one powerful dashboard.
              </p>
            </div>
          </div>
          
          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 hover:scale-105 transition-transform duration-300 card-3d">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-bold text-white text-lg">Secure Access</h3>
              <p className="text-sm text-gray-300 font-medium">Admin-only portal</p>
            </div>
            <div className="space-y-3 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 hover:scale-105 transition-transform duration-300 card-3d">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-bold text-white text-lg">Full Control</h3>
              <p className="text-sm text-gray-300 font-medium">Complete system access</p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-block mb-4 relative">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-2xl glow-effect relative overflow-hidden">
                <svg className="w-12 h-12 text-white animate-lightning relative z-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce-subtle">
                <svg className="w-5 h-5 text-yellow-900" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-black text-white">
              Super Admin Portal
            </h2>
            <p className="text-gray-300 mt-2 font-medium">👑 Ultimate Control</p>
          </div>

          {/* Login Card */}
          <div className="bg-white/95 backdrop-blur-xl shadow-2xl border-2 border-white/50 rounded-3xl overflow-hidden card-3d">
            {/* Card Header */}
            <div className="space-y-4 pb-6 bg-gradient-to-br from-gray-50 via-orange-50 to-red-50 border-b-2 border-orange-200 px-6 sm:px-8 pt-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-100/50 to-transparent animate-gradient"></div>
              <div className="space-y-2 relative z-10">
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 text-center flex items-center justify-center gap-2">
                  <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z"/>
                  </svg>
                  Super Admin Access
                </h2>
                <p className="text-gray-600 text-center font-medium">
                  Enter your credentials to continue
                </p>
              </div>
            </div>
            
            {/* Form Container */}
            <div className="px-6 sm:px-8 py-8 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Input */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-gray-800 font-bold text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Admin Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full px-5 py-3.5 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-500 transition-all duration-300 text-sm sm:text-base text-gray-900 font-medium hover:border-orange-300 shadow-sm hover:shadow-md"
                    />
                  </div>
                </div>
                
                {/* Password Input */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-gray-800 font-bold text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Admin Password
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
                      className="w-full px-5 py-3.5 pr-14 border-2 border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-500 transition-all duration-300 text-sm sm:text-base text-gray-900 font-medium hover:border-orange-300 shadow-sm hover:shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-orange-600 transition-all duration-300 hover:scale-110 p-1"
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
                  className="w-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 text-white py-4 rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group" 
                  disabled={loading}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity shimmer"></div>
                  {loading ? (
                    <div className="flex items-center justify-center relative z-10">
                      <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Authenticating...
                    </div>
                  ) : (
                    <span className="flex items-center justify-center relative z-10">
                      👑 Access Portal
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
          <div className="text-center mt-6 text-gray-300 text-xs sm:text-sm px-4 font-medium">
            <p className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z"/>
              </svg>
              © 2025 SaleStar. Secure Admin Portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
