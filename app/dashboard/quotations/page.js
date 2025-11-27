'use client';

import { useState, useRef, useEffect } from 'react';
import { getCurrentUserFromToken } from '../../../lib/auth';
import QuotationForm from '../../components/QuotationForm';
import QuotationsList from '../../components/QuotationsList';

export default function QuotationsPage() {
  const [activeTab, setActiveTab] = useState('list');
  const [refreshKey, setRefreshKey] = useState(0);
  const [userRole, setUserRole] = useState(null);
  const [editingQuotationId, setEditingQuotationId] = useState(null);
  const listRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    const user = getCurrentUserFromToken();
    if (user) {
      setUserRole(user.role);
      // If user is Client, only show list view
      if (user.role === 'Client') {
        setActiveTab('list');
      }
    }
  }, []);

  const handleQuotationCreated = () => {
    // Switch to list tab and refresh
    setActiveTab('list');
    setRefreshKey(prev => prev + 1);
    if (listRef.current && listRef.current.refetch) {
      listRef.current.refetch();
    }
  };

  const handleEditQuotation = (quotationId) => {
    console.log('handleEditQuotation called with ID:', quotationId);
    setEditingQuotationId(quotationId);
    // Switch to create tab to show form
    setActiveTab('create');
    
    // Trigger edit mode after ensuring form is mounted
    // Use requestAnimationFrame for better timing
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (formRef.current && formRef.current.loadQuotationForEdit) {
          console.log('Calling loadQuotationForEdit with ID:', quotationId);
          formRef.current.loadQuotationForEdit(quotationId);
        } else {
          console.error('formRef.current or loadQuotationForEdit not available');
          // Retry once more after a longer delay
          setTimeout(() => {
            if (formRef.current && formRef.current.loadQuotationForEdit) {
              console.log('Retrying loadQuotationForEdit');
              formRef.current.loadQuotationForEdit(quotationId);
            }
          }, 500);
        }
      }, 100);
    });
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

        {/* Tabs - Only show for non-Client users */}
        {userRole !== 'Client' && (
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
        )}
        
        {/* Show title for Client users */}
        {userRole === 'Client' && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">My Quotations</h2>
            <p className="mt-1 text-sm text-gray-600">
              View your quotations, edit unpaid quotations, and manage payment
            </p>
          </div>
        )}
        
        {/* Content */}
        {activeTab === 'create' ? (
          <QuotationForm 
            ref={formRef} 
            onQuotationCreated={handleQuotationCreated} 
          />
        ) : (
          <QuotationsList key={refreshKey} ref={listRef} onEdit={handleEditQuotation} />
        )}
      </div>
    </div>
  );
}

