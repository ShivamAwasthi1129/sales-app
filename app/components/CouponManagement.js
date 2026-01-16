// components/CouponManagement.js

"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import { gql } from "graphql-tag";
import { toast } from "react-toastify";

const GET_COUPONS = gql`
  query GetCoupons($type: String) {
    getCoupons(type: $type) {
      id
      code
      type
      name
      description
      discountType
      discountValue
      minPurchase
      maxDiscount
      validFrom
      validTo
      usageLimit
      usedCount
      status
      applicableTo
      applicableProductIds
      applicableGroupIds
      companyId
      createdAt
      updatedAt
    }
  }
`;

const GET_COUPON = gql`
  query GetCoupon($id: ID!) {
    getCoupon(id: $id) {
      id
      code
      type
      name
      description
      discountType
      discountValue
      minPurchase
      maxDiscount
      validFrom
      validTo
      usageLimit
      usedCount
      status
      applicableTo
      applicableProductIds
      applicableGroupIds
      companyId
    }
  }
`;

const CREATE_COUPON = gql`
  mutation CreateCoupon($input: CouponInput!) {
    createCoupon(input: $input) {
      id
      code
      type
      name
      description
      discountType
      discountValue
      minPurchase
      maxDiscount
      validFrom
      validTo
      usageLimit
      usedCount
      status
      applicableTo
      companyId
    }
  }
`;

const UPDATE_COUPON = gql`
  mutation UpdateCoupon($id: ID!, $input: CouponInput!) {
    updateCoupon(id: $id, input: $input) {
      id
      code
      type
      name
      description
      discountType
      discountValue
      minPurchase
      maxDiscount
      validFrom
      validTo
      usageLimit
      usedCount
      status
      applicableTo
      companyId
    }
  }
`;

const DELETE_COUPON = gql`
  mutation DeleteCoupon($id: ID!) {
    deleteCoupon(id: $id) {
      success
      message
    }
  }
`;

const GET_PRODUCTS = gql`
  query GetProducts {
    getProducts {
      id
      name
      group {
        id
        name
      }
    }
  }
`;

const GET_GROUPS = gql`
  query GetGroups {
    getGroups {
      id
      name
    }
  }
`;

export default function CouponManagement() {
  const [activeTab, setActiveTab] = useState("list");
  const [couponTypeTab, setCouponTypeTab] = useState("discount_coupon"); // New state for coupon type tabs
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [seedingCoupons, setSeedingCoupons] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    type: "discount_coupon",
    name: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    minPurchase: 0,
    maxDiscount: null,
    validFrom: new Date().toISOString().split("T")[0],
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0], // 30 days from now
    usageLimit: null,
    status: "active",
    applicableTo: "all",
    applicableProductIds: [],
    applicableGroupIds: [],
  });

  const {
    data: couponsData,
    loading: couponsLoading,
    refetch: refetchCoupons,
  } = useQuery(GET_COUPONS, {
    variables: { type: couponTypeTab },
    fetchPolicy: "network-only",
  });

  const { data: productsData } = useQuery(GET_PRODUCTS, {
    fetchPolicy: "network-only",
    skip: formData.applicableTo !== "products",
  });

  const { data: groupsData } = useQuery(GET_GROUPS, {
    fetchPolicy: "network-only",
    skip: formData.applicableTo !== "groups",
  });

  const [getCoupon, { data: couponData }] = useLazyQuery(GET_COUPON, {
    fetchPolicy: "network-only",
  });

  const [createCoupon, { loading: creating, error: createError }] = useMutation(
    CREATE_COUPON,
    {
      onError: (error) => {
        console.error("Create coupon error:", error);
        toast.error(error.message || "Failed to create coupon");
      },
      onCompleted: (data) => {
        console.log("Create coupon completed:", data);
      },
    }
  );
  const [updateCoupon, { loading: updating, error: updateError }] = useMutation(
    UPDATE_COUPON,
    {
      onError: (error) => {
        console.error("Update coupon error:", error);
        toast.error(error.message || "Failed to update coupon");
      },
    }
  );
  const [deleteCoupon] = useMutation(DELETE_COUPON);

  // Load coupon for editing
  useEffect(() => {
    if (editingCouponId && couponData?.getCoupon) {
      const coupon = couponData.getCoupon;
      setFormData({
        code: coupon.code || "",
        type: coupon.type || "discount_coupon",
        name: coupon.name || "",
        description: coupon.description || "",
        discountType: coupon.discountType || "percentage",
        discountValue: coupon.discountValue || 0,
        minPurchase: coupon.minPurchase || 0,
        maxDiscount: coupon.maxDiscount || null,
        validFrom: coupon.validFrom
          ? coupon.validFrom.split("T")[0]
          : new Date().toISOString().split("T")[0],
        validTo: coupon.validTo
          ? coupon.validTo.split("T")[0]
          : new Date().toISOString().split("T")[0],
        usageLimit: coupon.usageLimit || null,
        status: coupon.status || "active",
        applicableTo: coupon.applicableTo || "all",
        applicableProductIds: coupon.applicableProductIds || [],
        applicableGroupIds: coupon.applicableGroupIds || [],
      });
    }
  }, [couponData, editingCouponId]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEdit = (couponId) => {
    setEditingCouponId(couponId);
    setActiveTab("add");
    getCoupon({ variables: { id: couponId } });
  };

  const handleDelete = async (couponId) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) {
      return;
    }

    try {
      await deleteCoupon({ variables: { id: couponId } });
      toast.success("Coupon deleted successfully");
      refetchCoupons();
    } catch (error) {
      toast.error(error.message || "Failed to delete coupon");
    }
  };

  const handleCancel = () => {
    setEditingCouponId(null);
    setActiveTab("list");
    setFormData({
      code: "",
      type: couponTypeTab, // Use current type tab
      name: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      minPurchase: 0,
      maxDiscount: null,
      validFrom: new Date().toISOString().split("T")[0],
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      usageLimit: null,
      status: "active",
      applicableTo: "all",
      applicableProductIds: [],
      applicableGroupIds: [],
    });
  };

  const handleCreate = () => {
    setEditingCouponId(null);
    setFormData({
      code: "",
      type: couponTypeTab, // Use current type tab
      name: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      minPurchase: 0,
      maxDiscount: null,
      validFrom: new Date().toISOString().split("T")[0],
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      usageLimit: null,
      status: "active",
      applicableTo: couponTypeTab === "group_discount" ? "groups" : "all",
      applicableProductIds: [],
      applicableGroupIds: [],
    });
    setActiveTab("form");
  };

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log("=== Form submit triggered ===", {
      formData,
      creating,
      updating,
      editingCouponId,
      hasCreateCoupon: !!createCoupon,
      hasUpdateCoupon: !!updateCoupon,
    });

    // Prevent double submission
    if (creating || updating) {
      console.log("Already processing, skipping...");
      return;
    }

    // Validation
    if (!formData.type) {
      toast.error("Coupon type is required");
      return;
    }
    if (!formData.code.trim()) {
      toast.error("Coupon code is required");
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Coupon name is required");
      return;
    }
    const discountValue =
      typeof formData.discountValue === "string" &&
        formData.discountValue.trim() === ""
        ? null
        : parseFloat(formData.discountValue);

    if (!discountValue || discountValue <= 0 || isNaN(discountValue)) {
      toast.error("Discount value must be greater than 0");
      return;
    }
    if (formData.discountType === "percentage" && discountValue > 100) {
      toast.error("Percentage discount cannot exceed 100%");
      return;
    }
    if (new Date(formData.validTo) < new Date(formData.validFrom)) {
      toast.error("Valid To date must be after Valid From date");
      return;
    }

    try {
      // Clean and format input data
      const input = {
        code: formData.code.trim().toUpperCase(),
        type: formData.type || "discount_coupon", // ✅ Added type field
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        discountType: formData.discountType,
        discountValue: discountValue,
        minPurchase: formData.minPurchase || 0,
        maxDiscount: formData.maxDiscount || null,
        usageLimit: formData.usageLimit || null,
        status: formData.status || "active",
        applicableTo: formData.applicableTo || "all",
        applicableProductIds: formData.applicableProductIds || [],
        applicableGroupIds: formData.applicableGroupIds || [],
        validFrom: new Date(formData.validFrom).toISOString(),
        validTo: new Date(formData.validTo).toISOString(),
      };

      console.log("=== SUBMITTING COUPON ===");
      console.log("FormData type:", formData.type);
      console.log("Input data:", JSON.stringify(input, null, 2));
      console.log("Editing mode:", !!editingCouponId);
      console.log(
        "createCoupon available:",
        typeof createCoupon === "function"
      );
      console.log(
        "updateCoupon available:",
        typeof updateCoupon === "function"
      );

      if (editingCouponId) {
        console.log("Updating coupon:", editingCouponId);
        const result = await updateCoupon({
          variables: { id: editingCouponId, input },
          refetchQueries: [{ query: GET_COUPONS }],
        });
        console.log("Update result:", result);
        if (result?.data?.updateCoupon) {
          toast.success("Coupon updated successfully");
          handleCancel();
          await refetchCoupons();
        } else {
          console.error("Update failed - no data returned");
          toast.error("Failed to update coupon");
        }
      } else {
        console.log("Creating new coupon...");
        if (!createCoupon || typeof createCoupon !== "function") {
          console.error("createCoupon is not a function!", createCoupon);
          toast.error(
            "Coupon creation service unavailable. Please refresh the page."
          );
          return;
        }

        const result = await createCoupon({
          variables: { input },
          refetchQueries: [{ query: GET_COUPONS }],
        });

        console.log("=== CREATE RESULT ===");
        console.log("Full result:", result);
        console.log("Result data:", result?.data);
        console.log("Result errors:", result?.errors);

        if (result?.data?.createCoupon) {
          console.log("✅ Coupon created successfully!");
          toast.success("Coupon created successfully");
          handleCancel();
          await refetchCoupons();
        } else if (result?.errors && result.errors.length > 0) {
          console.error("❌ GraphQL errors:", result.errors);
          const errorMsg =
            result.errors[0]?.message || "Failed to create coupon";
          toast.error(errorMsg);
        } else {
          console.error("❌ No data and no errors - unexpected response");
          toast.error("Failed to create coupon - unexpected response");
        }
      }
    } catch (error) {
      console.error("=== ERROR IN HANDLESUBMIT ===");
      console.error("Error object:", error);
      console.error("Error message:", error.message);
      console.error("Error name:", error.name);
      console.error("GraphQL errors:", error.graphQLErrors);
      console.error("Network error:", error.networkError);
      console.error("Error stack:", error.stack);

      const errorMessage =
        error.message ||
        error.graphQLErrors?.[0]?.message ||
        error.networkError?.message ||
        "Failed to save coupon. Check console for details.";
      toast.error(errorMessage);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-300";
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-300";
      case "expired":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const isCouponExpired = (validTo) => {
    return new Date(validTo) < new Date();
  };

  const isCouponValid = (coupon) => {
    const now = new Date();
    return (
      coupon.status === "active" &&
      now >= new Date(coupon.validFrom) &&
      now <= new Date(coupon.validTo) &&
      (coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit)
    );
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "discount_coupon":
        return "Discount Coupon";
      case "promo_code":
        return "Promo Code";
      case "group_discount":
        return "Group Discount";
      case "shipping_coupon":
        return "Shipping Coupon";
      case "additional_discount":
        return "Additional Discount";
      default:
        return "Discount Coupon";
    }
  };

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case "discount_coupon":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "promo_code":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "group_discount":
        return "bg-green-100 text-green-800 border-green-300";
      case "shipping_coupon":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "additional_discount":
        return "bg-pink-100 text-pink-800 border-pink-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 hover:shadow-md transition-all">
        <div className="flex space-x-2 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab("list");
              handleCancel();
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === "list"
              ? "bg-blue-900 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
              }`}
          >
            All Coupons
          </button>
          <button
            onClick={() => {
              setEditingCouponId(null);
              setFormData({
                code: "",
                type: couponTypeTab,
                name: "",
                description: "",
                discountType: "percentage",
                discountValue: "",
                minPurchase: 0,
                maxDiscount: null,
                validFrom: new Date().toISOString().split("T")[0],
                validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0],
                usageLimit: null,
                status: "active",
                applicableTo:
                  couponTypeTab === "group_discount" ? "groups" : "all",
                applicableProductIds: [],
                applicableGroupIds: [],
              });
              setActiveTab("form");
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === "form" || activeTab === "add"
              ? "bg-blue-900 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
              }`}
          >
            {editingCouponId ? "Edit Coupon" : "Create Coupon"}
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "list" ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
          {/* Header with Create Button */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-blue-900">
              Coupons & Offers
            </h2>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center space-x-2 shadow-sm hover:shadow-md"
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
              <span>Create New</span>
            </button>
          </div>

          {/* Type Tabs */}
          <div className="px-6 pt-4 pb-4 border-b border-gray-200">
            <nav
              className="flex space-x-2 overflow-x-auto"
              aria-label="Coupon Types"
            >
              <button
                onClick={() => setCouponTypeTab("discount_coupon")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${couponTypeTab === "discount_coupon"
                  ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
                  }`}
              >
                <span className="flex items-center space-x-2">
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
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  <span>Discount Coupons</span>
                </span>
              </button>
              <button
                onClick={() => setCouponTypeTab("promo_code")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${couponTypeTab === "promo_code"
                  ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
                  }`}
              >
                <span className="flex items-center space-x-2">
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
                      d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                    />
                  </svg>
                  <span>Promo Codes</span>
                </span>
              </button>
              <button
                onClick={() => setCouponTypeTab("group_discount")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${couponTypeTab === "group_discount"
                  ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
                  }`}
              >
                <span className="flex items-center space-x-2">
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span>Group Discounts</span>
                </span>
              </button>
              <button
                onClick={() => setCouponTypeTab("shipping_coupon")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${couponTypeTab === "shipping_coupon"
                  ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
                  }`}
              >
                <span className="flex items-center space-x-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                    />
                  </svg>
                  <span>Shipping Coupons</span>
                </span>
              </button>
              <button
                onClick={() => setCouponTypeTab("additional_discount")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${couponTypeTab === "additional_discount"
                  ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
                  }`}
              >
                <span className="flex items-center space-x-2">
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
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  <span>Additional Discounts</span>
                </span>
              </button>
            </nav>
          </div>
          {couponsLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading coupons...</p>
            </div>
          ) : couponsData?.getCoupons?.length === 0 ? (
            <div className="p-8 text-center">
              <svg
                className="mx-auto h-16 w-16 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-gray-500">No coupons found</p>
              <p className="mt-2 text-sm text-gray-400 mb-4">
                Create your first coupon to get started
              </p>
              <button
                onClick={async () => {
                  setSeedingCoupons(true);
                  try {
                    const token = localStorage.getItem("token");
                    if (!token) {
                      toast.error("Please login to seed coupons");
                      setSeedingCoupons(false);
                      return;
                    }

                    const response = await fetch("/api/seed-coupons", {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                      },
                    });

                    const data = await response.json();

                    if (data.success) {
                      const breakdown = data.breakdown || {};
                      toast.success(
                        `✅ Seeded ${data.created} coupons!\n` +
                        `📦 ${breakdown.discount_coupons || 0
                        } Discount Coupons\n` +
                        `🎁 ${breakdown.promo_codes || 0} Promo Codes\n` +
                        `👥 ${breakdown.group_discounts || 0
                        } Group Discounts`,
                        { autoClose: 5000 }
                      );
                      refetchCoupons();
                    } else {
                      toast.error(data.error || "Failed to seed coupons");
                    }
                  } catch (error) {
                    console.error("Seed error:", error);
                    toast.error("Failed to seed coupons: " + error.message);
                  } finally {
                    setSeedingCoupons(false);
                  }
                }}
                disabled={seedingCoupons}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm hover:shadow-md"
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span>
                  {seedingCoupons
                    ? "Seeding..."
                    : "Seed Test Coupons (All 3 Types)"}
                </span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                      Code
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                      Discount
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                      Validity
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                      Usage
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {couponsData?.getCoupons?.map((coupon) => {
                    const expired = isCouponExpired(coupon.validTo);
                    const valid = isCouponValid(coupon);
                    return (
                      <tr key={coupon.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="font-mono font-semibold text-indigo-600">
                              {coupon.code}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center space-x-2">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {coupon.name}
                              </div>
                              {coupon.description && (
                                <div className="text-sm text-gray-600">
                                  {coupon.description}
                                </div>
                              )}
                            </div>
                            <span
                              className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getTypeBadgeColor(
                                coupon.type || "discount_coupon"
                              )}`}
                            >
                              {getTypeLabel(coupon.type || "discount_coupon")}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {coupon.discountType === "percentage"
                              ? `${coupon.discountValue}%`
                              : `$${coupon.discountValue.toFixed(2)}`}
                            {coupon.maxDiscount &&
                              coupon.discountType === "percentage" && (
                                <div className="text-xs text-gray-500">
                                  Max: ${coupon.maxDiscount.toFixed(2)}
                                </div>
                              )}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(coupon.validFrom).toLocaleDateString()} -{" "}
                            {new Date(coupon.validTo).toLocaleDateString()}
                          </div>
                          {expired && (
                            <div className="text-xs text-red-600">Expired</div>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {coupon.usedCount} / {coupon.usageLimit || "∞"}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                              coupon.status
                            )}`}
                          >
                            {coupon.status}
                          </span>
                          {valid && (
                            <div className="text-xs text-green-600 mt-1">
                              Valid
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(coupon.id)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="space-y-6"
          >
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-blue-900">
                Basic Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      handleInputChange("type", e.target.value);
                      // Auto-set applicableTo for group_discount
                      if (e.target.value === "group_discount") {
                        handleInputChange("applicableTo", "groups");
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="discount_coupon">Discount Coupon</option>
                    <option value="promo_code">Promo Code</option>
                    <option value="group_discount">Group Discount</option>
                    <option value="shipping_coupon">Shipping Coupon</option>
                    <option value="additional_discount">
                      Additional Discount
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coupon Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      handleInputChange("code", e.target.value.toUpperCase())
                    }
                    placeholder="SAVE20"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Code will be converted to uppercase
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Summer Sale 2024"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Enter coupon description..."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Discount Configuration */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-blue-900">
                Discount Configuration
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) =>
                      handleInputChange("discountType", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Value <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={
                      formData.discountType === "percentage" ? 100 : undefined
                    }
                    value={formData.discountValue}
                    onChange={(e) =>
                      handleInputChange(
                        "discountValue",
                        e.target.value ? parseFloat(e.target.value) : ""
                      )
                    }
                    placeholder={
                      formData.discountType === "percentage" ? "20" : "50.00"
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {formData.discountType === "percentage" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Discount ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.maxDiscount || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "maxDiscount",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      placeholder="Optional"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Purchase ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minPurchase}
                  onChange={(e) =>
                    handleInputChange(
                      "minPurchase",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Minimum order amount required to use this coupon
                </p>
              </div>
            </div>

            {/* Validity & Usage */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-blue-900">
                Validity & Usage
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valid From <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) =>
                      handleInputChange("validFrom", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valid To <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.validTo}
                    onChange={(e) =>
                      handleInputChange("validTo", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usageLimit || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "usageLimit",
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    placeholder="Unlimited (leave empty)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty for unlimited usage
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      handleInputChange("status", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Applicability */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-blue-900">Applicability</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Applicable To
                  {formData.type === "group_discount" && (
                    <span className="ml-2 text-xs text-gray-500">
                      (Fixed for Group Discounts)
                    </span>
                  )}
                </label>
                <select
                  value={formData.applicableTo}
                  onChange={(e) =>
                    handleInputChange("applicableTo", e.target.value)
                  }
                  disabled={formData.type === "group_discount"}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${formData.type === "group_discount"
                    ? "bg-gray-100 cursor-not-allowed"
                    : ""
                    }`}
                >
                  <option value="all">All Products</option>
                  <option value="products">Specific Products</option>
                  <option value="groups">Product Groups</option>
                </select>
                {formData.type === "group_discount" && (
                  <p className="mt-1 text-xs text-blue-600">
                    Group Discounts must be linked to specific product groups
                  </p>
                )}
              </div>

              {formData.applicableTo === "products" &&
                productsData?.getProducts && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Products
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2 bg-gray-50">
                      {productsData.getProducts.map((product) => (
                        <label
                          key={product.id}
                          className="flex items-center space-x-2 p-2 hover:bg-white rounded transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.applicableProductIds.includes(
                              product.id
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleInputChange("applicableProductIds", [
                                  ...formData.applicableProductIds,
                                  product.id,
                                ]);
                              } else {
                                handleInputChange(
                                  "applicableProductIds",
                                  formData.applicableProductIds.filter(
                                    (id) => id !== product.id
                                  )
                                );
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">
                            {product.name}
                          </span>
                          {product.group && (
                            <span className="text-xs text-gray-500">
                              ({product.group.name})
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

              {formData.applicableTo === "groups" && groupsData?.getGroups && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Groups
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2 bg-gray-50">
                    {groupsData.getGroups.map((group) => (
                      <label
                        key={group.id}
                        className="flex items-center space-x-2 p-2 hover:bg-white rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.applicableGroupIds.includes(
                            group.id
                          )}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleInputChange("applicableGroupIds", [
                                ...formData.applicableGroupIds,
                                group.id,
                              ]);
                            } else {
                              handleInputChange(
                                "applicableGroupIds",
                                formData.applicableGroupIds.filter(
                                  (id) => id !== group.id
                                )
                              );
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">
                          {group.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors shadow-sm hover:shadow-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async (e) => {
                  try {
                    e.preventDefault();
                    e.stopPropagation();

                    console.log("=== CREATE COUPON BUTTON CLICKED ===");
                    console.log("Button state:", {
                      creating,
                      updating,
                      editingQuotationId: editingCouponId,
                      formDataCode: formData.code,
                      formDataName: formData.name,
                      formDataDiscountValue: formData.discountValue,
                      hasCreateCoupon: typeof createCoupon === "function",
                      createCouponValue: createCoupon,
                    });

                    if (creating || updating) {
                      console.log("⚠️ Button disabled - already processing");
                      return;
                    }

                    console.log("✅ Calling handleSubmit...");
                    await handleSubmit(e);
                    console.log("✅ handleSubmit completed");
                  } catch (err) {
                    console.error("❌ Error in button onClick:", err);
                    toast.error(
                      "An error occurred. Check console for details."
                    );
                  }
                }}
                disabled={creating || updating}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                {creating || updating
                  ? "Saving..."
                  : editingCouponId
                    ? "Update Coupon"
                    : "Create Coupon"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
