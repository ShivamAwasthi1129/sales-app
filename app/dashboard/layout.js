'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '../../lib/auth';
import Sidebar from '../components/Sidebar';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const authStatus = isAuthenticated();
    setAuthenticated(authStatus);
    
    if (!authStatus) {
      router.push('/login');
    }
  }, [router]);

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return null;
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="dashboard-layout-wrapper flex h-screen bg-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="p-8 pb-16">
          {children}
        </div>
      </main>
    </div>
  );
}

