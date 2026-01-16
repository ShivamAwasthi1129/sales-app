// sales-person-management/page.js

"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "graphql-tag";
import { toast } from "react-toastify";
import SalesPersonForm from "../../components/SalesPersonForm";
import SalesPersonList from "../../components/SalesPersonList";

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
      address
      photo
      status
      createdByAdminId
      companyId
      passwordChangeRequest {
        status
        requestedAt
        canChangePassword
      }
      createdAt
      updatedAt
    }
  }
`;

const RESPOND_TO_PASSWORD_REQUEST = gql`
  mutation RespondToPasswordChangeRequest($userId: ID!, $action: String!) {
    respondToPasswordChangeRequest(userId: $userId, action: $action) {
      success
      message
      user {
        id
        passwordChangeRequest {
          status
          respondedAt
        }
      }
    }
  }
`;

const DELETE_SALES_PERSON = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id) {
      success
      message
    }
  }
`;

export default function AdminSalesPersonManagementPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingSalesPerson, setEditingSalesPerson] = useState(null);
  const { data, loading, error, refetch } = useQuery(GET_SALES_PERSONS, {
    fetchPolicy: "network-only",
  });
  const [deleteSalesPerson] = useMutation(DELETE_SALES_PERSON);
  const [respondToRequest] = useMutation(RESPOND_TO_PASSWORD_REQUEST);

  const handleAddNew = () => {
    setEditingSalesPerson(null);
    setShowForm(true);
  };

  const handleEdit = (salesPerson) => {
    setEditingSalesPerson(salesPerson);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this sales person?")) {
      return;
    }

    try {
      await deleteSalesPerson({
        variables: { id },
        refetchQueries: ["GetSalesPersons"],
        awaitRefetchQueries: true,
      });
      refetch();
    } catch (err) {
      alert(err.message || "Failed to delete sales person");
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

  const handlePasswordRequestResponse = async (userId, action) => {
    try {
      const { data } = await respondToRequest({
        variables: { userId, action },
      });

      if (data.respondToPasswordChangeRequest.success) {
        toast.success(data.respondToPasswordChangeRequest.message);
        refetch();
      }
    } catch (err) {
      toast.error(err.message || "Failed to process request");
    }
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

  const activeCount =
    data?.getSalesPersons?.filter((sp) => sp.status === "Active").length || 0;
  const inactiveCount =
    data?.getSalesPersons?.filter((sp) => sp.status !== "Active").length || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
          {/* Left Section - Title and Info */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-blue-600 animate-lightning"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                  Sales Management
                </h1>
              </div>
            </div>
            <p className="text-base mt-4 text-gray-700">
              Manage and track your sales team performance
            </p>
          </div>

          {/* Right Section - Add Button */}
          <div className="w-full sm:w-auto">
            <button
              onClick={handleAddNew}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 transition-colors flex items-center space-x-2 shadow-sm hover:shadow-md"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Add Sales Person</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Card */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
                Total Team Members
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {data?.getSalesPersons?.length || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                Complete sales team
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Card */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">
                Active Members
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {activeCount}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                Currently working
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Inactive Card */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-orange-600 font-bold uppercase tracking-wide mb-1">
                Inactive Members
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {inactiveCount}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                Not active
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Persons List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-blue-900">Team Members</h3>
          <p className="text-sm text-gray-500 mt-1">
            View and manage all sales personnel
          </p>
        </div>
        <div className="p-6">
          <SalesPersonList
            salesPersons={data?.getSalesPersons || []}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPasswordRequestResponse={handlePasswordRequestResponse}
          />
        </div>
      </div>

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
