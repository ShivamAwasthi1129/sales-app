// components/ProductAnalytics.js

"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { gql } from "graphql-tag";

const GET_PRODUCT_ANALYTICS = gql`
  query GetProductAnalytics {
    getProductAnalytics {
      topSellingProducts {
        productId
        productName
        imageUrl
        groupName
        totalQuantitySold
        totalRevenue
        totalOrders
        averageOrderValue
        lastSoldAt
      }
      lowSellingProducts {
        productId
        productName
        imageUrl
        groupName
        totalQuantitySold
        totalRevenue
        totalOrders
        averageOrderValue
        lastSoldAt
      }
      productDemandTrends {
        productId
        productName
        trends {
          month
          quantity
          revenue
          orders
        }
        peakMonth
        peakQuantity
        growthRate
      }
      topBuyersByProduct {
        productId
        productName
        topBuyers {
          clientName
          clientEmail
          totalPurchases
          totalSpent
          lastPurchaseAt
        }
      }
      overallStats {
        totalProducts
        totalProductsSold
        totalRevenue
        averageProductRevenue
        mostProfitableProduct
        fastestGrowingProduct
      }
    }
  }
`;

export default function ProductAnalytics() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { data, loading, error } = useQuery(GET_PRODUCT_ANALYTICS, {
    fetchPolicy: "network-only",
  });

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
        <p className="font-semibold">Error loading analytics</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  const analytics = data?.getProductAnalytics;
  if (!analytics) return null;

  const {
    topSellingProducts,
    lowSellingProducts,
    productDemandTrends,
    topBuyersByProduct,
    overallStats,
  } = analytics;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate max values for bar chart scaling
  const getMaxTrendValue = (trends) => {
    if (!trends || trends.length === 0) return 1;
    return Math.max(...trends.map((t) => t.quantity), 1);
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 hover:shadow-md transition-all">
        <div className="flex space-x-2 overflow-x-auto">
          {["overview", "trends", "buyers"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === tab
                ? "bg-blue-900 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              {tab === "overview"
                ? "Overview"
                : tab === "trends"
                  ? "Demand Trends"
                  : "Top Buyers"}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats Cards */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
                    Total Products
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {overallStats.totalProducts || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">
                    In catalogue
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
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">
                    Products Sold
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {overallStats.totalProductsSold || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">
                    With sales
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
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-amber-600 font-bold uppercase tracking-wide mb-1">
                    Total Revenue
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {formatCurrency(overallStats.totalRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">
                    From all products
                  </p>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-amber-600"
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

            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-purple-600 font-bold uppercase tracking-wide mb-1">
                    Avg Revenue/Product
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {formatCurrency(overallStats.averageProductRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">
                    Per product
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
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Highlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-yellow-600 font-bold uppercase tracking-wide mb-1">
                    Most Profitable Product
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {overallStats.mostProfitableProduct || "N/A"}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3">
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
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">
                    Fastest Growing
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {overallStats.fastestGrowingProduct || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Top & Low Selling Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Selling */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <h3 className="text-lg font-bold text-blue-900 mb-3">
                Top Selling Products
              </h3>
              <div className="space-y-3 max-h-100 overflow-y-auto">
                {topSellingProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <svg
                      className="w-12 h-12 text-gray-400 mx-auto mb-2"
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
                    <p className="text-gray-500">No sales data available yet</p>
                  </div>
                ) : (
                  topSellingProducts.map((product, index) => (
                    <ProductCard
                      key={product.productId}
                      product={product}
                      rank={index + 1}
                      type="top"
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Low Selling */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <h3 className="text-lg font-bold text-blue-900 mb-3">
                Low Performing Products
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {lowSellingProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <svg
                      className="w-12 h-12 text-gray-400 mx-auto mb-2"
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
                    <p className="text-gray-500">
                      All products are performing well!
                    </p>
                  </div>
                ) : (
                  lowSellingProducts.map((product, index) => (
                    <ProductCard
                      key={product.productId}
                      product={product}
                      rank={index + 1}
                      type="low"
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Demand Trends Tab */}
      {activeTab === "trends" && (
        <div className="space-y-4">
          {productDemandTrends.length === 0 ? (
            <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No trend data available
              </h3>
              <p className="text-gray-500">
                Start making sales to see demand trends!
              </p>
            </div>
          ) : (
            productDemandTrends.map((productTrend) => (
              <div
                key={productTrend.productId}
                className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-blue-900">
                      {productTrend.productName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    {productTrend.peakMonth && (
                      <div className="bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200">
                        <span className="text-xs text-gray-600">Peak: </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {productTrend.peakMonth}
                        </span>
                      </div>
                    )}
                    <div
                      className={`rounded-lg px-3 py-1.5 border ${productTrend.growthRate > 0
                        ? "bg-green-50 border-green-200 text-green-800"
                        : productTrend.growthRate < 0
                          ? "bg-red-50 border-red-200 text-red-800"
                          : "bg-gray-50 border-gray-200 text-gray-800"
                        }`}
                    >
                      <span className="text-sm font-semibold">
                        {productTrend.growthRate > 0
                          ? "↑"
                          : productTrend.growthRate < 0
                            ? "↓"
                            : "→"}
                        {Math.abs(productTrend.growthRate).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  {/* Mini Bar Chart */}
                  <div className="flex items-end justify-between gap-2 h-32 mb-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {productTrend.trends.map((trend, idx) => {
                      const maxVal = getMaxTrendValue(productTrend.trends);
                      const height =
                        maxVal > 0 ? (trend.quantity / maxVal) * 100 : 0;
                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <div className="relative w-full flex justify-center">
                            <div
                              className="w-full max-w-12 bg-linear-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-blue-600 hover:to-blue-500"
                              style={{
                                height: `${Math.max(height, 4)}%`,
                                minHeight: "4px",
                              }}
                            >
                              {trend.quantity > 0 && (
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-700">
                                  {trend.quantity}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 mt-1">
                            {trend.month.split(" ")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                    <div className="text-center bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-2xl font-bold text-gray-900">
                        {productTrend.trends.reduce(
                          (sum, t) => sum + t.quantity,
                          0
                        )}
                      </p>
                      <p className="text-xs text-gray-600 font-semibold mt-1">
                        Total Units Sold
                      </p>
                    </div>
                    <div className="text-center bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(
                          productTrend.trends.reduce(
                            (sum, t) => sum + t.revenue,
                            0
                          )
                        )}
                      </p>
                      <p className="text-xs text-gray-600 font-semibold mt-1">
                        Total Revenue
                      </p>
                    </div>
                    <div className="text-center bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-2xl font-bold text-gray-900">
                        {productTrend.trends.reduce(
                          (sum, t) => sum + t.orders,
                          0
                        )}
                      </p>
                      <p className="text-xs text-gray-600 font-semibold mt-1">
                        Total Orders
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Top Buyers Tab */}
      {activeTab === "buyers" && (
        <div className="space-y-4">
          {topBuyersByProduct.length === 0 ? (
            <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No buyer data available
              </h3>
              <p className="text-gray-500">
                Customer insights will appear after sales are made!
              </p>
            </div>
          ) : (
            topBuyersByProduct.map((productBuyers) => (
              <div
                key={productBuyers.productId}
                className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-blue-900">
                    {productBuyers.productName}
                  </h3>
                </div>

                <div>
                  {productBuyers.topBuyers.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No buyers yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {productBuyers.topBuyers.map((buyer, idx) => (
                        <div
                          key={buyer.clientEmail}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${idx === 0
                                ? "bg-yellow-500"
                                : idx === 1
                                  ? "bg-gray-400"
                                  : idx === 2
                                    ? "bg-amber-600"
                                    : "bg-gray-300"
                                }`}
                            >
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {buyer.clientName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {buyer.clientEmail}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">
                              {formatCurrency(buyer.totalSpent)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {buyer.totalPurchases} purchases
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Product Card Component
function ProductCard({ product, rank, type, formatCurrency, formatDate }) {
  const isTop = type === "top";

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm ${isTop
        ? "bg-white border-gray-200 hover:border-gray-300"
        : product.totalRevenue === 0
          ? "bg-gray-50 border-gray-200"
          : "bg-white border-gray-200 hover:border-gray-300"
        }`}
    >
      {/* Rank Badge */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${isTop
          ? rank === 1
            ? "bg-yellow-500"
            : rank === 2
              ? "bg-gray-400"
              : rank === 3
                ? "bg-amber-600"
                : "bg-blue-500"
          : "bg-orange-500"
          }`}
      >
        {rank}
      </div>

      {/* Product Image */}
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.productName}
          className="w-12 h-12 rounded-lg object-cover shrink-0 border border-gray-200"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
          <svg
            className="w-6 h-6 text-gray-400"
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

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">
          {product.productName}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
          <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
            {product.groupName}
          </span>
          <span>•</span>
          <span>{product.totalOrders} orders</span>
        </div>
      </div>

      {/* Stats */}
      <div className="text-right shrink-0">
        <p
          className={`font-bold text-sm ${isTop
            ? "text-green-600"
            : product.totalRevenue === 0
              ? "text-gray-400"
              : "text-orange-600"
            }`}
        >
          {formatCurrency(product.totalRevenue)}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {product.totalQuantitySold} units sold
        </p>
      </div>
    </div>
  );
}
