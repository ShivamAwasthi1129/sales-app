// components/LandingPage.js

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage({ onComplete }) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);

    // Auto-transition after 6 seconds
    const autoTransitionTimer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 6000); // 6 seconds

    return () => clearTimeout(autoTransitionTimer);
  }, [onComplete]);

  // Handle "Get Started" button click
  const handleGetStarted = () => {
    router.push('/login');
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center overflow-hidden py-12">
      {/* Main Content Container */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Label */}
        <div className="text-center mb-4">
          <p className="text-sm font-bold text-blue-500 tracking-wide uppercase">
            Lightning Fast Sales Engine
          </p>
        </div>

        {/* Main Heading */}
        <div className="text-center mb-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800">
            Close Deals in Minutes, Not Meetings
            <span className="block mt-2">with SaleStar.</span>
          </h1>
        </div>

        {/* Subtitle */}
        <div className="text-center mb-6">
          <p className="text-sm sm:text-base text-gray-500 max-w-3xl mx-auto">
            Transform conversations into closed deals instantly. No complexity, just speed.
          </p>
        </div>

        {/* Get Started Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={handleGetStarted}
            className="px-12 py-2 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md"
            style={{ backgroundColor: 'rgba(49, 128, 238)' }}
          >
            Get Started
          </button>
        </div>

        {/* Dashboard Image Section */}
        <div className="flex justify-center">
          <div className="w-full max-w-4xl">
            <img
              src="/landingPage.png"
              alt="Dashboard Preview"
              className="w-full h-auto rounded-lg object-contain"
              style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.50)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
