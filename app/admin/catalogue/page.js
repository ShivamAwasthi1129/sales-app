'use client';

import { useState } from 'react';
import ProductForm from '../../components/ProductForm';
import ProductAnalytics from '../../components/ProductAnalytics';

export default function AdminCataloguePage() {
  const [activeView, setActiveView] = useState('catalogue');

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Product Catalogue</h1>
            <p className="text-purple-100 text-lg">Create and manage your product inventory</p>
          </div>
          <div className="flex items-center gap-4">
            {/* View Toggle Buttons */}
            <div className="flex gap-2 bg-white/10 backdrop-blur-sm rounded-xl p-1">
              <button
                onClick={() => setActiveView('catalogue')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeView === 'catalogue'
                    ? 'bg-white text-purple-700 shadow-lg'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Catalogue
              </button>
              <button
                onClick={() => setActiveView('analytics')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeView === 'analytics'
                    ? 'bg-white text-purple-700 shadow-lg'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </button>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/20 backdrop-blur-lg rounded-xl p-4">
                {activeView === 'catalogue' ? (
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content based on active view */}
      {activeView === 'catalogue' ? (
        <ProductForm />
      ) : (
        <ProductAnalytics />
      )}
    </div>
  );
}

