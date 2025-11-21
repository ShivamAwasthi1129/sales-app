'use client';

import { useState, useRef } from 'react';
import QuotationForm from '../../components/QuotationForm';
import QuotationsList from '../../components/QuotationsList';

export default function QuotationsPage() {
  const [activeTab, setActiveTab] = useState('create');
  const [refreshKey, setRefreshKey] = useState(0);
  const listRef = useRef(null);
  const formRef = useRef(null);

  const handleQuotationCreated = () => {
    // Switch to list tab and refresh
    setActiveTab('list');
    setRefreshKey(prev => prev + 1);
    if (listRef.current && listRef.current.refetch) {
      listRef.current.refetch();
    }
  };

  const handleEditQuotation = (quotationId) => {
    // Switch to create tab and trigger edit mode
    setActiveTab('create');
    if (formRef.current && formRef.current.loadQuotationForEdit) {
      formRef.current.loadQuotationForEdit(quotationId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Quotations</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create and manage professional quotations for your clients
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('create')}
                className={`${
                  activeTab === 'create'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Create Quotation
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={`${
                  activeTab === 'list'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                All Quotations
              </button>
            </nav>
          </div>
        </div>
        
        {/* Content */}
        {activeTab === 'create' ? (
          <QuotationForm ref={formRef} onQuotationCreated={handleQuotationCreated} />
        ) : (
          <QuotationsList key={refreshKey} ref={listRef} onEdit={handleEditQuotation} />
        )}
      </div>
    </div>
  );
}

