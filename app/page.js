'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '../lib/auth';
import LandingPage from './components/LandingPage';
import LoginPage from './login/page';

export default function Home() {
  const router = useRouter();
  const [showLanding, setShowLanding] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const handleNavigation = useCallback(() => {
    if (isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    // Check if user has already seen the landing page in this session
    if (typeof window !== 'undefined') {
      const landingSeen = sessionStorage.getItem('landingPageSeen');
      
      if (landingSeen === 'true') {
        // Skip landing page if already seen
        setShowLanding(false);
        setShowLogin(true);
        if (!isAuthenticated()) {
          router.push('/login');
        } else {
          handleNavigation();
        }
      }
    }
  }, [handleNavigation, router]);

  const handleLandingComplete = () => {
    // Mark landing page as seen
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('landingPageSeen', 'true');
    }
    
    // Show login page below viewport first (it will slide up)
    setShowLogin(true);
    
    // Small delay to ensure login page is rendered, then start transition
    setTimeout(() => {
      setIsTransitioning(true);
      
      // After animation completes, navigate to login route and clean up
      setTimeout(() => {
        setShowLanding(false);
        setIsTransitioning(false);
        // Navigate to login route - Next.js will handle it from here
        router.push('/login');
        // Remove our manual login page render after a brief moment
        setTimeout(() => {
          setShowLogin(false);
        }, 100);
      }, 1000); // Match animation duration
    }, 50);
  };

  // If user is authenticated, redirect immediately
  useEffect(() => {
    if (isAuthenticated() && !showLanding) {
      router.push('/dashboard');
    }
  }, [router, showLanding]);

  // Don't show login page if user is authenticated
  if (isAuthenticated() && !showLanding) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Landing Page - scrolls up during transition */}
      {showLanding && (
        <div 
          className={`fixed inset-0 z-50 transition-transform duration-1000 ease-in-out ${
            isTransitioning ? '-translate-y-full' : 'translate-y-0'
          }`}
          style={{ willChange: 'transform' }}
        >
          <LandingPage onComplete={handleLandingComplete} />
        </div>
      )}
      
      {/* Login Page - slides up from bottom */}
      {showLogin && !isAuthenticated() && (
        <div 
          className={`fixed inset-0 z-40 transition-transform duration-1000 ease-in-out ${
            isTransitioning ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ willChange: 'transform' }}
        >
          <div className="h-full w-full overflow-auto">
            <LoginPage />
          </div>
        </div>
      )}
    </div>
  );
}
