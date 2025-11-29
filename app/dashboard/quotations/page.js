'use client';

import { useState, useRef, useEffect } from 'react';
import { getCurrentUserFromToken } from '../../../lib/auth';
import QuotationForm from '../../components/QuotationFormSimplified';
import QuotationsList from '../../components/QuotationsList';

export default function QuotationsPage() {
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [userRole, setUserRole] = useState(null);
  const [editingQuotationId, setEditingQuotationId] = useState(null);
  const listRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    const user = getCurrentUserFromToken();
    if (user) {
      setUserRole(user.role);
    }
  }, []);

  const handleQuotationCreated = () => {
    // Go back to list and refresh
    setShowForm(false);
    setEditingQuotationId(null);
    setRefreshKey(prev => prev + 1);
    if (listRef.current && listRef.current.refetch) {
      listRef.current.refetch();
    }
  };

  const handleCreateNew = () => {
    setEditingQuotationId(null);
    setShowForm(true);
  };

  const handleEditQuotation = (quotationId) => {
    console.log('handleEditQuotation called with ID:', quotationId);
    setEditingQuotationId(quotationId);
    setShowForm(true);
    
    // Trigger edit mode after ensuring form is mounted
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (formRef.current && formRef.current.loadQuotationForEdit) {
          console.log('Calling loadQuotationForEdit with ID:', quotationId);
          formRef.current.loadQuotationForEdit(quotationId);
        } else {
          console.error('formRef.current or loadQuotationForEdit not available');
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

  const handleBackToList = () => {
    setShowForm(false);
    setEditingQuotationId(null);
  };

  // Customer always sees list, can't create
  if (userRole === 'Customer') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Quotations</h1>
            <p className="mt-2 text-sm text-gray-600">
              View your quotations and manage payments
            </p>
          </div>
          <QuotationsList key={refreshKey} ref={listRef} onEdit={handleEditQuotation} />
        </div>
      </div>
    );
  }

  // Admin and Sales Person can create quotations
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showForm ? (
          // List View
          <>
            <QuotationsList 
              key={refreshKey} 
              ref={listRef} 
              onEdit={handleEditQuotation}
              onCreateNew={handleCreateNew}
            />
          </>
        ) : (
          // Form View
          <>
            <div className="mb-6">
              <button
                onClick={handleBackToList}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to List
              </button>
            </div>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">
                {editingQuotationId ? 'Edit Quotation' : 'Create Quotation'}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {editingQuotationId ? 'Update quotation details' : 'Create a new quotation for your client'}
              </p>
            </div>
            <QuotationForm 
              ref={formRef} 
              onQuotationCreated={handleQuotationCreated}
              onCancel={handleBackToList}
            />
          </>
        )}
      </div>
    </div>
  );
}

