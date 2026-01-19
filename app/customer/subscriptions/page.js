"use client";

import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "graphql-tag";
import { useState } from "react";
import { toast } from "react-toastify";

const GET_SUBSCRIPTIONS = gql`
  query GetSubscriptions {
    getSubscriptions {
      id
      userId
      productId
      product {
        id
        name
        description
        imageUrl
      }
      priceItems {
        id
        amount
        currency
        billingType
        interval
        intervalCount
      }
      configurationSnapshot {
        attributeName
        optionLabel
        amount
        currency
        billingType
      }
      stripeSubscriptionId
      status
      currentPeriodStart
      currentPeriodEnd
      cancelAtPeriodEnd
      canceledAt
      endedAt
      trialStart
      trialEnd
      createdAt
      updatedAt
    }
  }
`;

const CANCEL_SUBSCRIPTION = gql`
  mutation CancelSubscription(
    $subscriptionId: ID!
    $cancelAtPeriodEnd: Boolean
  ) {
    cancelSubscription(
      subscriptionId: $subscriptionId
      cancelAtPeriodEnd: $cancelAtPeriodEnd
    ) {
      id
      status
      cancelAtPeriodEnd
      canceledAt
    }
  }
`;

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800 border-green-300",
  trialing: "bg-blue-100 text-blue-800 border-blue-300",
  past_due: "bg-yellow-100 text-yellow-800 border-yellow-300",
  unpaid: "bg-orange-100 text-orange-800 border-orange-300",
  canceled: "bg-red-100 text-red-800 border-red-300",
  incomplete: "bg-gray-100 text-gray-800 border-gray-300",
  incomplete_expired: "bg-gray-100 text-gray-800 border-gray-300",
};

export default function CustomerSubscriptionsPage() {
  const [cancellingId, setCancellingId] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [cancelImmediately, setCancelImmediately] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_SUBSCRIPTIONS, {
    fetchPolicy: "network-only",
  });

  const [cancelSubscription, { loading: cancelLoading }] = useMutation(
    CANCEL_SUBSCRIPTION,
    {
      onCompleted: () => {
        toast.success("Subscription cancelled successfully");
        setShowCancelModal(null);
        setCancelImmediately(false);
        refetch();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to cancel subscription");
      },
    }
  );

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getCurrencySymbol = (currency) => {
    const symbols = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
      CAD: "$",
      AUD: "$",
      INR: "₹",
    };
    return symbols[currency?.toUpperCase()] || "$";
  };

  const getIntervalLabel = (interval, intervalCount) => {
    if (!interval) return "";
    if (intervalCount === 1) {
      return `/${interval}`;
    }
    return `/every ${intervalCount} ${interval}s`;
  };

  const calculateTotalAmount = (subscription) => {
    // Try priceItems first
    if (subscription.priceItems && subscription.priceItems.length > 0) {
      return (
        subscription.priceItems.reduce(
          (sum, price) => sum + (price?.amount || 0),
          0
        ) / 100
      );
    }
    // Fallback to configurationSnapshot
    if (
      subscription.configurationSnapshot &&
      subscription.configurationSnapshot.length > 0
    ) {
      return (
        subscription.configurationSnapshot.reduce(
          (sum, config) => sum + (config?.amount || 0),
          0
        ) / 100
      );
    }
    return 0;
  };

  const handleCancelSubscription = async () => {
    if (!showCancelModal) return;

    try {
      await cancelSubscription({
        variables: {
          subscriptionId: showCancelModal.id,
          cancelAtPeriodEnd: !cancelImmediately,
        },
      });
    } catch (err) {
      console.error("Cancel error:", err);
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
        <p className="font-semibold">Error loading subscriptions</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  const subscriptions = data?.getSubscriptions || [];
  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === "active" || s.status === "trialing"
  );
  const cancelledSubscriptions = subscriptions.filter(
    (s) => s.status === "canceled" || s.cancelAtPeriodEnd
  );

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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                  My Subscriptions
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <p className="text-sm text-gray-400 font-semibold">
                    Manage Your Subscriptions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Subscriptions */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">
                Active Subscriptions
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {activeSubscriptions.length}
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

        {/* Cancelled / Pending Cancel */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600 font-bold uppercase tracking-wide mb-1">
                Cancelled / Pending
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {cancelledSubscriptions.length}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                Cancelled subscriptions
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-600"
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

        {/* Total Subscriptions */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
                Total Subscriptions
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {subscriptions.length}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                All time
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-blue-900">Subscriptions</h2>
          <span className="text-sm text-gray-600">
            {subscriptions.length}{" "}
            {subscriptions.length === 1 ? "subscription" : "subscriptions"}
          </span>
        </div>
        <div className="overflow-x-auto">
          {subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <p className="text-gray-500 mb-2">No subscriptions found</p>
              <p className="text-sm text-gray-400">
                You don't have any subscriptions yet.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Product
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Amount
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Current Period
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Started
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subscriptions.map((subscription) => {
                  const totalAmount = calculateTotalAmount(subscription);
                  const currency =
                    subscription.priceItems?.[0]?.currency ||
                    subscription.configurationSnapshot?.[0]?.currency ||
                    "USD";
                  const interval =
                    subscription.priceItems?.[0]?.interval || "month";
                  const intervalCount =
                    subscription.priceItems?.[0]?.intervalCount || 1;

                  return (
                    <tr key={subscription.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="flex items-center space-x-3">
                          {subscription.product?.imageUrl ? (
                            <img
                              src={subscription.product.imageUrl}
                              alt={subscription.product?.name}
                              className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
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
                                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                />
                              </svg>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">
                              {subscription.product?.name || "Subscription"}
                            </p>
                            {subscription.configurationSnapshot?.length > 0 && (
                              <p className="text-xs text-gray-500">
                                {subscription.configurationSnapshot
                                  .map((c) => c.optionLabel)
                                  .join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {getCurrencySymbol(currency)}
                            {totalAmount.toFixed(2)}
                            <span className="text-xs font-normal text-gray-500">
                              {getIntervalLabel(interval, intervalCount)}
                            </span>
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col space-y-1">
                          <span
                            className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${
                              STATUS_COLORS[subscription.status] ||
                              "bg-gray-100 text-gray-800 border-gray-300"
                            }`}
                          >
                            {subscription.status
                              ?.replace("_", " ")
                              .toUpperCase()}
                          </span>
                          {subscription.cancelAtPeriodEnd &&
                            subscription.status === "active" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 border border-orange-300">
                                Cancels at period end
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-sm">
                          <p className="text-gray-700">
                            {formatDate(subscription.currentPeriodStart)}
                          </p>
                          <p className="text-xs text-gray-500">
                            to {formatDate(subscription.currentPeriodEnd)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <p className="text-sm text-gray-600">
                          {formatDate(subscription.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-2 text-center whitespace-nowrap">
                        {(subscription.status === "active" ||
                          subscription.status === "trialing") &&
                        !subscription.cancelAtPeriodEnd ? (
                          <button
                            onClick={() => setShowCancelModal(subscription)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <svg
                              className="w-4 h-4 mr-1"
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
                            Cancel
                          </button>
                        ) : subscription.cancelAtPeriodEnd ? (
                          <span className="text-sm text-orange-600 font-medium">
                            Pending cancellation
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Cancel Subscription
              </h3>
              <button
                onClick={() => {
                  setShowCancelModal(null);
                  setCancelImmediately(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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

            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {showCancelModal.product?.imageUrl ? (
                  <img
                    src={showCancelModal.product.imageUrl}
                    alt={showCancelModal.product?.name}
                    className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
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
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">
                    {showCancelModal.product?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Current period ends:{" "}
                    {formatDate(showCancelModal.currentPeriodEnd)}
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Are you sure you want to cancel?
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      You will lose access to this subscription's features.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="cancelOption"
                    checked={!cancelImmediately}
                    onChange={() => setCancelImmediately(false)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      Cancel at period end
                    </p>
                    <p className="text-xs text-gray-500">
                      Keep access until{" "}
                      {formatDate(showCancelModal.currentPeriodEnd)}
                    </p>
                  </div>
                </label>
                <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="cancelOption"
                    checked={cancelImmediately}
                    onChange={() => setCancelImmediately(true)}
                    className="mt-1 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      Cancel immediately
                    </p>
                    <p className="text-xs text-gray-500">
                      Lose access right away, no refund
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCancelModal(null);
                  setCancelImmediately(false);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {cancelLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                    Cancelling...
                  </>
                ) : (
                  "Cancel Subscription"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
