"use client";

import { useState, useRef } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import QuotationForm from "../../components/QuotationFormSimplified";
import QuotationsList from "../../components/QuotationsList";

export default function SalesQuotesPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingQuotationId, setEditingQuotationId] = useState(null);
  const listRef = useRef(null);
  const formRef = useRef(null);

  const handleQuotationCreated = () => {
    setShowForm(false);
    setEditingQuotationId(null);
    setRefreshKey((prev) => prev + 1);
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
    <div className="space-y-4">
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
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
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
