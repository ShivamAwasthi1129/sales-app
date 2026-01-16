// components/UserForm.js

"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "graphql-tag";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

const GET_COMPANIES = gql`
  query GetCompanies {
    getCompanies {
      id
      name
      email
    }
  }
`;

const CREATE_USER = gql`
  mutation CreateUser(
    $name: String!
    $email: String!
    $password: String!
    $role: String!
    $phone: String
    $address: String
    $companyId: ID
  ) {
    createUser(
      name: $name
      email: $email
      password: $password
      role: $role
      phone: $phone
      address: $address
      companyId: $companyId
    ) {
      id
      name
      email
      role
    }
  }
`;

const UPDATE_USER = gql`
  mutation UpdateUser(
    $id: ID!
    $name: String
    $email: String
    $password: String
    $role: String
    $phone: String
    $address: String
    $status: String
    $companyId: ID
  ) {
    updateUser(
      id: $id
      name: $name
      email: $email
      password: $password
      role: $role
      phone: $phone
      address: $address
      status: $status
      companyId: $companyId
    ) {
      id
      name
      email
      role
    }
  }
`;

export default function UserForm({ user, currentUser, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Admin",
    phone: "",
    address: "",
    status: "Active",
    companyId: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [createUser] = useMutation(CREATE_USER);
  const [updateUser] = useMutation(UPDATE_USER);

  const isEditing = !!user;
  const isSuperAdminPage = currentUser?.role === "Super Admin";
  const showCompanyField = formData.role === "Admin" && isSuperAdminPage;

  const { data: companiesData } = useQuery(GET_COMPANIES, {
    skip: !showCompanyField, // Only fetch when showing company field
    fetchPolicy: "cache-and-network",
  });

  const companies = companiesData?.getCompanies || [];

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        password: "",
        role: user.role || "Admin",
        phone: user.phone || "",
        address: user.address || "",
        status: user.status || "Active",
        companyId: user.companyId || "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: value,
      };
      // If role is changed to Super Admin, clear companyId
      if (name === "role" && value === "Super Admin") {
        newData.companyId = "";
      }
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // No validation for companyId - Admins can be created without company
      // Company will be linked later when company is created

      if (isEditing) {
        const updateVariables = {
          id: user.id,
        };

        if (formData.name) updateVariables.name = formData.name;
        if (formData.email) updateVariables.email = formData.email;
        if (formData.password) updateVariables.password = formData.password;
        if (formData.role) updateVariables.role = formData.role;
        if (formData.phone !== undefined)
          updateVariables.phone = formData.phone;
        if (formData.address !== undefined)
          updateVariables.address = formData.address;
        if (formData.status) updateVariables.status = formData.status;
        if (formData.companyId !== undefined) {
          updateVariables.companyId =
            formData.role === "Super Admin" ? null : formData.companyId || null;
        }

        await updateUser({
          variables: updateVariables,
          refetchQueries: [
            "GetUsers",
            "GetCompanies",
            "GetCompanyControlData",
            "GetCurrentUser",
          ],
          awaitRefetchQueries: true,
        });
      } else {
        if (!formData.password) {
          setError("Password is required for new users");
          setLoading(false);
          return;
        }

        // Build variables object - only include companyId if it's actually provided
        const variables = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          phone: formData.phone || null,
          address: formData.address || null,
        };

        // Include companyId if provided (optional for Admin)
        if (formData.role !== "Super Admin" && formData.companyId) {
          variables.companyId = formData.companyId;
        }

        await createUser({
          variables,
          refetchQueries: [
            "GetUsers",
            "GetCompanies",
            "GetCompanyControlData",
            "GetCurrentUser",
          ],
          awaitRefetchQueries: true,
        });
      }

      onSuccess();
    } catch (err) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  // For Super Admin page, only show Super Admin and Admin roles
  const roles = isSuperAdminPage
    ? ["Super Admin", "Admin"]
    : ["Super Admin", "Admin", "Customer", "Sales Person"];
  const statuses = ["Active", "Inactive"];

  // Check if role can be changed
  const canChangeRole = () => {
    if (!isEditing || !currentUser || !user) return true;

    const currentUserRole = currentUser.role;
    const targetUserRole = user.role;

    // Super Admin can change anyone's role
    if (currentUserRole === "Super Admin") {
      return true;
    }

    // Admin cannot change Super Admin's role
    if (currentUserRole === "Admin") {
      if (targetUserRole === "Super Admin") {
        return false;
      }
      return true;
    }

    return false;
  };

  const roleChangeDisabled = !canChangeRole();

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white rounded-t-2xl px-6 py-5 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 flex-1">
              {/* Icon */}
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-blue-600"
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
              <div className="flex-1">
                <h2 className="text-3xl font-semibold text-gray-900">
                  {isEditing ? "Edit User" : "Create New User"}
                </h2>
                <p className="text-base mt-2 text-gray-700">
                  {isEditing
                    ? "Update user information and permissions"
                    : "Add a new user to the system"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg ml-4"
            >
              <svg
                className="w-6 h-6"
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
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start">
                <svg
                  className="w-5 h-5 text-red-600 mt-0.5 mr-2 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="Enter full name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
            </div>

            {(!isEditing ||
              (isEditing &&
                (currentUser?.role === "Super Admin" ||
                  currentUser?.role === "Admin"))) && (
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                  >
                    Password{" "}
                    {!isEditing && <span className="text-red-500">*</span>}
                    {isEditing && (
                      <span className="text-gray-500 text-xs font-normal normal-case ml-2">
                        (Leave blank to keep current password)
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      required={!isEditing}
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full pl-10 pr-12 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                      placeholder={
                        isEditing
                          ? "Enter new password (optional)"
                          : "Enter password"
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
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
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
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
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label
                  htmlFor="role"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Role <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                  <select
                    id="role"
                    name="role"
                    required
                    value={formData.role}
                    onChange={handleChange}
                    disabled={roleChangeDisabled}
                    className={`w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none text-gray-900 ${roleChangeDisabled
                      ? "opacity-50 cursor-not-allowed bg-gray-50"
                      : ""
                      }`}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  {roleChangeDisabled && (
                    <p className="text-xs text-gray-500 mt-1 font-medium">
                      You don't have permission to change this role
                    </p>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="space-y-2">
                  <label
                    htmlFor="status"
                    className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                  >
                    Status <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <select
                      id="status"
                      name="status"
                      required
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none text-gray-900"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Company Field - Optional for Admin role */}
            {showCompanyField && (
              <div className="space-y-2">
                <label
                  htmlFor="companyId"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Company{" "}
                  <span className="text-gray-500 text-xs font-normal normal-case">
                    (Optional - can link later)
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <select
                    id="companyId"
                    name="companyId"
                    value={formData.companyId}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none text-gray-900"
                  >
                    <option value="">Select a company (optional)</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name} ({company.email})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  You can link this admin to a company now or later when
                  creating the company.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label
                  htmlFor="phone"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Phone
                </label>
                <div className="phone-input-wrapper">
                  <PhoneInput
                    international
                    defaultCountry="US"
                    value={formData.phone}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, phone: value || "" }))
                    }
                    className="phone-input-wrapper"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="address"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Address
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-3 text-gray-400">
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
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <textarea
                    id="address"
                    name="address"
                    rows="3"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none text-gray-900 placeholder-gray-400"
                    placeholder="Enter address"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-900 text-white rounded-xl hover:bg-blue-800 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </span>
                ) : isEditing ? (
                  "Update User"
                ) : (
                  "Create User"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
