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
      createdByAdminId
      companyId
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

export default function AdminSalesPersonManagementPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingSalesPerson, setEditingSalesPerson] = useState(null);
  const { data, loading, error, refetch } = useQuery(GET_SALES_PERSONS, {
    fetchPolicy: 'cache-and-network',
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
    if (!confirm('Are you sure you want to delete this sales person?')) {
      return;
    }

    try {
      await deleteSalesPerson({
        variables: { id },
        refetchQueries: ['GetSalesPersons'],
        awaitRefetchQueries: true,
      });
      refetch();
    } catch (err) {
      alert(err.message || 'Failed to delete sales person');
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        <p className="font-semibold">Error loading sales persons</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Sales Person Management</h1>
            <p className="text-blue-100 text-lg">Manage your sales team members</p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/20 backdrop-blur-lg rounded-xl p-4">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Total Sales Persons</p>
            <p className="text-2xl font-bold text-gray-900">{data?.getSalesPersons?.length || 0}</p>
          </div>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-xl flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add New Sales Person</span>
        </button>
      </div>

      {/* Sales Persons Table */}
      <SalesPersonList
        salesPersons={data?.getSalesPersons || []}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Sales Person Form Modal */}
      {showForm && (
        <SalesPersonForm
          salesPerson={editingSalesPerson}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

