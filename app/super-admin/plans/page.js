// super-admin/plans/page.js

"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "graphql-tag";
import PlanForm from "../../components/PlanForm";
import PlanList from "../../components/PlanList";

const GET_PLANS = gql`
  query GetPlans {
    getPlans {
      id
      name
      description
      price
      billingCycle
      usersLimit
      features {
        name
        value
        isIncluded
      }
      status
      isPopular
      displayOrder
      subscriptionCount
      totalRevenue
      createdAt
      updatedAt
    }
  }
`;

const GET_PLAN_STATS = gql`
  query GetPlanStats {
    getPlanStats {
      totalPlans
      activePlans
      totalRevenue
      averageUsersLimit
      totalSubscriptions
    }
  }
`;

const DELETE_PLAN = gql`
  mutation DeletePlan($id: ID!) {
    deletePlan(id: $id) {
      success
      message
    }
  }
`;

export default function SuperAdminPlansPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const { data, loading, error, refetch } = useQuery(GET_PLANS);
  const { data: statsData } = useQuery(GET_PLAN_STATS);
  const [deletePlan] = useMutation(DELETE_PLAN);

  const handleCreate = () => {
    setEditingPlan(null);
    setShowForm(true);
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (
      !confirm(
        "Are you sure you want to delete this plan? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deletePlan({
        variables: { id },
      });
      refetch();
    } catch (err) {
      alert(err.message || "Failed to delete plan");
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingPlan(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPlan(null);
    refetch();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
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
        <p className="font-semibold">Error loading plans</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  const stats = statsData?.getPlanStats || {
    totalPlans: 0,
    activePlans: 0,
    totalRevenue: 0,
    averageUsersLimit: 0,
    totalSubscriptions: 0,
  };

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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                  Subscription Plans
                </h1>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <p className="text-sm text-gray-400 font-semibold">
                    System-wide Plans
                  </p>
                </div>
              </div>
            </div>
            <p className="text-base mt-4 text-gray-700">
              Create and manage subscription plans for companies
            </p>
          </div>

          {/* Right Section - Add Button */}
          <div className="w-full sm:w-auto">
            <button
              onClick={handleCreate}
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
              <span>Add New Plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Plans */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
                Total Plans
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.totalPlans}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                All plans
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
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Plans */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">
                Active Plans
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.activePlans}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                Currently active
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

        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">
                Total Revenue
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                {stats.totalSubscriptions || 0} subscriptions
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
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Avg Users Limit */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-purple-600 font-bold uppercase tracking-wide mb-1">
                Avg Users Limit
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.averageUsersLimit}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                Per plan
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
        <PlanList
          plans={data?.getPlans || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Plan Form Modal */}
      {showForm && (
        <PlanForm
          plan={editingPlan}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
