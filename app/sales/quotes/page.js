'use client';

import { useState, useRef } from 'react';
import QuotationForm from '../../components/QuotationFormSimplified';
import QuotationsList from '../../components/QuotationsList';

export default function SalesQuotesPage() {
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingQuotationId, setEditingQuotationId] = useState(null);
  const listRef = useRef(null);
  const formRef = useRef(null);

  const handleQuotationCreated = () => {
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
    setEditingQuotationId(quotationId);
    setShowForm(true);
    
    setTimeout(() => {
      if (formRef.current && formRef.current.loadQuotationForEdit) {
        formRef.current.loadQuotationForEdit(quotationId);
      }
    }, 100);
  };

  const handleBackToList = () => {
    setShowForm(false);
    setEditingQuotationId(null);
  };

  return (
    <div className="space-y-8">
      {!showForm && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">My Quotations</h1>
              <p className="text-blue-100 text-lg">Create and manage your quotations</p>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/20 backdrop-blur-lg rounded-xl p-4">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!showForm ? (
        <QuotationsList 
          key={refreshKey}
          ref={listRef}
          onEdit={handleEditQuotation}
          onCreateNew={handleCreateNew}
        />
      ) : (
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
          <QuotationForm 
            ref={formRef}
            onQuotationCreated={handleQuotationCreated}
            onCancel={handleBackToList}
          />
        </>
      )}
    </div>
  );
}

