'use client';

import { useEffect, useState } from 'react';

export default function LandingPage({ onComplete }) {
  const [mounted, setMounted] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Stagger animations
    setTimeout(() => setShowContent(true), 300);
    setTimeout(() => setShowFeatures(true), 600);
    setTimeout(() => setShowButton(true), 900);
    
    // Auto-transition to login after animations complete (6 seconds total)
    const autoTransitionTimer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 6000);

    return () => clearTimeout(autoTransitionTimer);
  }, [onComplete]);

  const handleGetStarted = () => {
    if (onComplete) {
      onComplete();
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center overflow-hidden relative py-4">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-20 right-10 w-64 h-64 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-10 left-1/3 w-64 h-64 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Content - Compact */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
        {/* Lightning Logo - Smaller */}
        <div className={`mb-4 transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
          <div className="inline-block">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-110 transition-all duration-300 hover-glow animate-pulse-ring relative overflow-hidden">
              <svg className="w-10 h-10 text-white animate-lightning relative z-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Main Heading - Compact */}
        <div className={`mb-3 transition-all duration-1000 delay-100 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-2">
            <span className="gradient-text">SaleStar</span>
          </h1>
          <p className="text-sm sm:text-base font-bold bg-gradient-to-r from-gray-700 to-gray-600 bg-clip-text text-transparent">
            ⚡ Lightning-Fast Sales Engine
          </p>
        </div>

        {/* Hero Tagline - Compact */}
        <h2 className={`text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 mb-3 transition-all duration-1000 delay-200 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          Close Deals in Minutes
          <br />
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Not Meetings
          </span>
        </h2>

        {/* Subtitle - Compact */}
        <p className={`text-sm sm:text-base text-gray-700 font-semibold mb-6 max-w-3xl mx-auto transition-all duration-1000 delay-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          Transform conversations into closed deals instantly. No complexity, just speed.
        </p>

        {/* Features Grid - Compact */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-5xl mx-auto transition-all duration-1000 delay-400 ${showFeatures ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Feature 1 */}
          <div className="glass-effect rounded-2xl p-4 border-2 border-white/50 transform hover:scale-105 transition-all duration-300 hover:shadow-xl card-3d group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-all duration-300 relative z-10">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-base font-black text-gray-900 mb-1 relative z-10">⚡ Lightning Fast</h3>
            <p className="text-xs text-gray-700 font-semibold relative z-10">Close deals in seconds</p>
          </div>

          {/* Feature 2 */}
          <div className="glass-effect rounded-2xl p-4 border-2 border-white/50 transform hover:scale-105 transition-all duration-300 hover:shadow-xl card-3d group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-all duration-300 relative z-10">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-base font-black text-gray-900 mb-1 relative z-10">📊 Real-Time Analytics</h3>
            <p className="text-xs text-gray-700 font-semibold relative z-10">Live insights & metrics</p>
          </div>

          {/* Feature 3 */}
          <div className="glass-effect rounded-2xl p-4 border-2 border-white/50 transform hover:scale-105 transition-all duration-300 hover:shadow-xl card-3d group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-green-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-all duration-300 relative z-10">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-base font-black text-gray-900 mb-1 relative z-10">🔒 Secure & Reliable</h3>
            <p className="text-xs text-gray-700 font-semibold relative z-10">Enterprise-grade security</p>
          </div>
        </div>

        {/* CTA Button - Compact */}
        <div className={`mb-4 transition-all duration-1000 delay-500 ${showButton ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <button
            onClick={handleGetStarted}
            className="group relative px-8 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-base sm:text-lg font-black rounded-xl shadow-2xl transform hover:scale-110 transition-all duration-300 hover-glow overflow-hidden"
          >
            <span className="relative z-10 flex items-center">
              ⚡ Get Started Now
              <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
          <p className="text-xs text-gray-600 mt-2 font-semibold">
            🎯 No credit card required
          </p>
        </div>

        {/* Stats Bar - Compact */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mb-4 transition-all duration-1000 delay-600 ${showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="glass-effect rounded-xl p-2 border border-white/30">
            <p className="text-xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">50K+</p>
            <p className="text-xs font-bold text-gray-700">Deals Closed</p>
          </div>
          <div className="glass-effect rounded-xl p-2 border border-white/30">
            <p className="text-xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">$250M+</p>
            <p className="text-xs font-bold text-gray-700">Revenue</p>
          </div>
          <div className="glass-effect rounded-xl p-2 border border-white/30">
            <p className="text-xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">10K+</p>
            <p className="text-xs font-bold text-gray-700">Users</p>
          </div>
          <div className="glass-effect rounded-xl p-2 border border-white/30">
            <p className="text-xl font-black bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">75%</p>
            <p className="text-xs font-bold text-gray-700">Time Saved</p>
          </div>
        </div>

        {/* Scroll Indicator - Small */}
        <div className={`transition-all duration-1000 delay-700 ${showButton ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex flex-col items-center text-gray-600">
            <span className="text-xs font-bold mb-2 flex items-center gap-1">
              <svg className="w-3 h-3 text-indigo-600 animate-bounce" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
              </svg>
              Continue to Login
            </span>
            <div className="w-5 h-8 border-2 border-indigo-600 rounded-full flex justify-center animate-bounce-subtle">
              <div className="w-1 h-2 bg-indigo-600 rounded-full mt-1.5 animate-bounce"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
    </div>
  );
}
