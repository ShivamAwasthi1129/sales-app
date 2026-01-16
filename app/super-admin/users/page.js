// super-admin/users/page.js

"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "graphql-tag";
import UserForm from "../../components/UserForm";
import UserList from "../../components/UserList";

const GET_USERS = gql`
  query GetUsers {
    getUsers {
      id
      name
      email
      role
      phone
      address
      status
      companyId
      salesPersonId
      dateOfBirth
      photo
      about
      createdByAdminId
      createdAt
      updatedAt
    }
  }
`;

const GET_COMPANIES = gql`
  query GetCompanies {
    getCompanies {
      id
      name
      status
    }
  }
`;

const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    getCurrentUser {
      id
      role
    }
  }
`;

const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id) {
      success
      message
    }
  }
`;

export default function SuperAdminUsersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filterRole, setFilterRole] = useState("all");
  const [filterCompany, setFilterCompany] = useState("all");

  const { data, loading, error, refetch } = useQuery(GET_USERS, {
    fetchPolicy: "cache-and-network",
  });
  const { data: currentUserData } = useQuery(GET_CURRENT_USER);
  const { data: companiesData } = useQuery(GET_COMPANIES, {
    fetchPolicy: "cache-and-network",
  });
  const [deleteUser] = useMutation(DELETE_USER);

  const currentUser = currentUserData?.getCurrentUser;
  const companies = companiesData?.getCompanies || [];

  // Available roles
  const roles = ["Super Admin", "Admin", "Sales Person", "Customer"];

  // Filter users based on selected filters
  const filteredUsers = (data?.getUsers || []).filter((user) => {
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesCompany =
      filterCompany === "all" || user.companyId === filterCompany;
    return matchesRole && matchesCompany;
  });

  const handleCreate = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      await deleteUser({
        variables: { id },
        refetchQueries: ["GetUsers", "GetCompanies", "GetCompanyControlData"],
        awaitRefetchQueries: true,
      });
      refetch();
    } catch (err) {
      alert(err.message || "Failed to delete user");
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingUser(null);
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
        <p className="font-semibold">Error loading users</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  // Calculate role counts
  const roleCounts = (data?.getUsers || []).reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});

  const activeUsers = (data?.getUsers || []).filter(
    (user) => user.status === "Active"
  ).length;
  const inactiveUsers = (data?.getUsers || []).filter(
    (user) => user.status !== "Active"
  ).length;

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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                  User Management
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
                    System-wide Users
                  </p>
                </div>
              </div>
            </div>
            <p className="text-base mt-4 text-gray-700">
              Manage all system users across roles and permissions
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
              <span>Add New User</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
                Total Users
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {data?.getUsers?.length || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                {filteredUsers.length} filtered
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">
                Active Users
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {activeUsers}
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

        {/* Inactive Users */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-orange-600 font-bold uppercase tracking-wide mb-1">
                Inactive Users
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {inactiveUsers}
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

        {/* Companies */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-purple-600 font-bold uppercase tracking-wide mb-1">
                Companies
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {companies.length}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                Total companies
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Role Distribution Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {roles.map((role) => (
          <div
            key={role}
            className={`p-4 rounded-lg shadow-sm border hover:shadow-md transition-all ${filterRole === role
              ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500"
              : "bg-gray-50 border-gray-100 hover:border-gray-300"
              }`}
            onClick={() => setFilterRole(filterRole === role ? "all" : role)}
            style={{ cursor: "pointer" }}
          >
            <p className="text-xs text-gray-700 font-bold uppercase tracking-wide">
              {role}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {roleCounts[role] || 0}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span className="text-sm font-semibold text-gray-700">Filters</span>
          </div>

          {/* Role Filter */}
          <div className="flex-1 max-w-xs">
            <label className="text-xs font-bold text-blue-900 mb-2 block">
              ROLE
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full bg-white text-gray-800 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 hover:border-gray-400 transition-all duration-300 cursor-pointer"
            >
              <option value="all">All Roles</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Company Filter */}
          <div className="flex-1 max-w-xs">
            <label className="text-xs font-bold text-blue-900 mb-2 block">
              COMPANY
            </label>
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="w-full bg-white text-gray-800 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 hover:border-gray-400 transition-all duration-300 cursor-pointer"
            >
              <option value="all">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(filterRole !== "all" || filterCompany !== "all") && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterRole("all");
                  setFilterCompany("all");
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
        <UserList
          users={filteredUsers}
          currentUser={currentUser}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* User Form Modal */}
      {showForm && (
        <UserForm
          user={editingUser}
          currentUser={currentUser}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
