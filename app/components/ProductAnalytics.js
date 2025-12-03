'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';

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
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { data, loading, error } = useQuery(GET_PRODUCT_ANALYTICS, {
    fetchPolicy: 'network-only',
  });

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl shadow-lg p-8 border border-red-200">
        <div className="flex items-center gap-3 text-red-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold text-lg">Unable to load analytics</p>
            <p className="text-sm text-red-500">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const analytics = data?.getProductAnalytics;
  if (!analytics) return null;

  const { topSellingProducts, lowSellingProducts, productDemandTrends, topBuyersByProduct, overallStats } = analytics;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate max values for bar chart scaling
  const getMaxTrendValue = (trends) => {
    if (!trends || trends.length === 0) return 1;
    return Math.max(...trends.map(t => t.quantity), 1);
  };

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Product Analytics</h2>
              <p className="text-emerald-100 text-sm">Track sales performance & customer insights</p>
            </div>
          </div>
          
          {/* Tab Buttons */}
          <div className="flex gap-2 bg-white/10 backdrop-blur-sm rounded-xl p-1">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'trends', label: 'Demand Trends', icon: '📈' },
              { id: 'buyers', label: 'Top Buyers', icon: '👥' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-emerald-700 shadow-lg'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Stats Cards */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Products"
              value={overallStats.totalProducts}
              icon="📦"
              gradient="from-blue-500 to-indigo-600"
            />
            <StatCard
              title="Products Sold"
              value={overallStats.totalProductsSold}
              icon="🛒"
              gradient="from-emerald-500 to-teal-600"
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(overallStats.totalRevenue)}
              icon="💰"
              gradient="from-amber-500 to-orange-600"
            />
            <StatCard
              title="Avg Revenue/Product"
              value={formatCurrency(overallStats.averageProductRevenue)}
              icon="📈"
              gradient="from-purple-500 to-pink-600"
            />
          </div>

          {/* Highlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-5 border border-amber-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <span className="text-2xl">🏆</span>
                </div>
                <div>
                  <p className="text-sm text-amber-600 font-medium">Most Profitable Product</p>
                  <p className="text-lg font-bold text-amber-900">{overallStats.mostProfitableProduct}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-emerald-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <span className="text-2xl">🚀</span>
                </div>
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Fastest Growing</p>
                  <p className="text-lg font-bold text-emerald-900">{overallStats.fastestGrowingProduct}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top & Low Selling Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Selling */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔥</span>
                  <h3 className="text-lg font-bold text-white">Top Selling Products</h3>
                </div>
              </div>
              <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                {topSellingProducts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No sales data available yet</p>
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
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📉</span>
                  <h3 className="text-lg font-bold text-white">Low Performing Products</h3>
                </div>
              </div>
              <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                {lowSellingProducts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">All products are performing well!</p>
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
      {activeTab === 'trends' && (
        <div className="space-y-6">
          {productDemandTrends.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No trend data available</h3>
              <p className="text-gray-500">Start making sales to see demand trends!</p>
            </div>
          ) : (
            productDemandTrends.map((productTrend) => (
              <div key={productTrend.productId} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📈</span>
                      <h3 className="text-lg font-bold text-white">{productTrend.productName}</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      {productTrend.peakMonth && (
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5">
                          <span className="text-xs text-violet-100">Peak: </span>
                          <span className="text-sm font-semibold text-white">{productTrend.peakMonth}</span>
                        </div>
                      )}
                      <div className={`rounded-lg px-3 py-1.5 ${
                        productTrend.growthRate > 0 
                          ? 'bg-green-400/30 text-green-100' 
                          : productTrend.growthRate < 0 
                            ? 'bg-red-400/30 text-red-100'
                            : 'bg-white/20 text-violet-100'
                      }`}>
                        <span className="text-sm font-semibold">
                          {productTrend.growthRate > 0 ? '↑' : productTrend.growthRate < 0 ? '↓' : '→'} 
                          {Math.abs(productTrend.growthRate).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-5">
                  {/* Mini Bar Chart */}
                  <div className="flex items-end justify-between gap-2 h-32 mb-4">
                    {productTrend.trends.map((trend, idx) => {
                      const maxVal = getMaxTrendValue(productTrend.trends);
                      const height = maxVal > 0 ? (trend.quantity / maxVal) * 100 : 0;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <div className="relative w-full flex justify-center">
                            <div
                              className="w-full max-w-12 bg-gradient-to-t from-violet-500 to-purple-400 rounded-t-lg transition-all duration-500 hover:from-violet-600 hover:to-purple-500"
                              style={{ height: `${Math.max(height, 4)}%`, minHeight: '4px' }}
                            >
                              {trend.quantity > 0 && (
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-700">
                                  {trend.quantity}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 mt-1">{trend.month.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-800">
                        {productTrend.trends.reduce((sum, t) => sum + t.quantity, 0)}
                      </p>
                      <p className="text-xs text-gray-500">Total Units Sold</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-800">
                        {formatCurrency(productTrend.trends.reduce((sum, t) => sum + t.revenue, 0))}
                      </p>
                      <p className="text-xs text-gray-500">Total Revenue</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-800">
                        {productTrend.trends.reduce((sum, t) => sum + t.orders, 0)}
                      </p>
                      <p className="text-xs text-gray-500">Total Orders</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Top Buyers Tab */}
      {activeTab === 'buyers' && (
        <div className="space-y-6">
          {topBuyersByProduct.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No buyer data available</h3>
              <p className="text-gray-500">Customer insights will appear after sales are made!</p>
            </div>
          ) : (
            topBuyersByProduct.map((productBuyers) => (
              <div key={productBuyers.productId} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🛍️</span>
                    <h3 className="text-lg font-bold text-white">{productBuyers.productName}</h3>
                  </div>
                </div>
                
                <div className="p-4">
                  {productBuyers.topBuyers.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No buyers yet</p>
                  ) : (
                    <div className="space-y-3">
                      {productBuyers.topBuyers.map((buyer, idx) => (
                        <div 
                          key={buyer.clientEmail} 
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                              idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-600' : 'bg-gray-300'
                            }`}>
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{buyer.clientName}</p>
                              <p className="text-sm text-gray-500">{buyer.clientEmail}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-800">{formatCurrency(buyer.totalSpent)}</p>
                            <p className="text-xs text-gray-500">{buyer.totalPurchases} purchases</p>
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

// Stat Card Component
function StatCard({ title, value, icon, gradient }) {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-xs font-medium uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="text-3xl opacity-80">{icon}</div>
      </div>
    </div>
  );
}

// Product Card Component
function ProductCard({ product, rank, type, formatCurrency, formatDate }) {
  const isTop = type === 'top';
  
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-md ${
      isTop 
        ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 hover:border-emerald-300' 
        : product.totalRevenue === 0 
          ? 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
          : 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 hover:border-orange-300'
    }`}>
      {/* Rank Badge */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
        isTop 
          ? rank === 1 ? 'bg-yellow-500' : rank === 2 ? 'bg-gray-400' : rank === 3 ? 'bg-amber-600' : 'bg-emerald-500'
          : 'bg-orange-400'
      }`}>
        {rank}
      </div>

      {/* Product Image */}
      {product.imageUrl ? (
        <img 
          src={product.imageUrl} 
          alt={product.productName}
          className="w-12 h-12 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
          <span className="text-xl">📦</span>
        </div>
      )}

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 truncate">{product.productName}</p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="bg-gray-100 px-2 py-0.5 rounded">{product.groupName}</span>
          <span>•</span>
          <span>{product.totalOrders} orders</span>
        </div>
      </div>

      {/* Stats */}
      <div className="text-right shrink-0">
        <p className={`font-bold ${isTop ? 'text-emerald-600' : product.totalRevenue === 0 ? 'text-gray-400' : 'text-orange-600'}`}>
          {formatCurrency(product.totalRevenue)}
        </p>
        <p className="text-xs text-gray-500">
          {product.totalQuantitySold} units sold
        </p>
      </div>
    </div>
  );
}

