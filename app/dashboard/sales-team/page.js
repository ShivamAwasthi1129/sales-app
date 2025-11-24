'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import SalesPersonForm from '../../components/SalesPersonForm';
import SalesPersonList from '../../components/SalesPersonList';

const GET_SALES_PERSONS = gql`
  query GetSalesPersons {
    getSalesPersons {
      id
      name
      dateOfBirth
      phone
      email
      salesPersonId
      role
      about
      companyName
      address
      photo
      status
      createdAt
      updatedAt
    }
  }
`;

const DELETE_SALES_PERSON = gql`
  mutation DeleteSalesPerson($id: ID!) {
    deleteSalesPerson(id: $id) {
      success
      message
    }
  }
`;

export default function SalesTeamPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingSalesPerson, setEditingSalesPerson] = useState(null);
  const { data, loading, error, refetch } = useQuery(GET_SALES_PERSONS, {
    fetchPolicy: 'network-only',
  });
  const [deleteSalesPerson] = useMutation(DELETE_SALES_PERSON);

  const handleAddNew = () => {
    setEditingSalesPerson(null);
    setShowForm(true);
  };

  const handleEdit = (salesPerson) => {
    setEditingSalesPerson(salesPerson);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this sales person?')) {
      try {
        await deleteSalesPerson({ variables: { id } });
        refetch();
      } catch (error) {
        console.error('Error deleting sales person:', error);
        alert('Failed to delete sales person: ' + error.message);
      }
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingSalesPerson(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingSalesPerson(null);
    refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Error loading sales persons: {error.message}</p>
        </div>
      </div>
    );
  }

  const salesPersons = data?.getSalesPersons || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sales Team Management</h1>
              <p className="mt-2 text-gray-600">
                Manage your sales team members. Total: {salesPersons.length} sales person(s)
              </p>
            </div>
            <button
              onClick={handleAddNew}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Sales Person</span>
            </button>
          </div>
        </div>

        {showForm && (
          <SalesPersonForm
            salesPerson={editingSalesPerson}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
          />
        )}

        <SalesPersonList
          salesPersons={salesPersons}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}

