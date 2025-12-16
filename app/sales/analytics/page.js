'use client';

import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import PieChartComponent from '../../components/charts/PieChartComponent';
import BarChartComponent from '../../components/charts/BarChartComponent';
import LineChartComponent from '../../components/charts/LineChartComponent';
import AreaChartComponent from '../../components/charts/AreaChartComponent';

const GET_SALESPERSON_ANALYTICS = gql`
  query GetSalesPersonAnalytics($timeRange: String) {
    getSalesPersonAnalytics(timeRange: $timeRange) {
      salesPersonId
      salesPersonName
      companyName
      stats {
        totalQuotations
        wonQuotations
        lostQuotations
        pendingQuotations
        draftQuotations
        paidQuotations
        totalRevenue
        averageQuotationValue
        conversionRate
      }
      monthlyRevenue {
        month
        revenue
        quotationCount
        won
        lost
        pending
      }
      recentQuotations {
        id
        quotationNo
        totalAmount
        status
        clientName
        salesPerson
        createdAt
      }
      quotationStatusBreakdown {
        status
        count
        percentage
      }
    }
  }
`;

export default function SalesAnalyticsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [timeRange, setTimeRange] = useState('all');
  
  const { data, loading, error } = useQuery(GET_SALESPERSON_ANALYTICS, {
    variables: { timeRange },
    fetchPolicy: 'cache-and-network',
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatCurrencyCompact = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      paid: 'bg-purple-100 text-purple-800 border-purple-300',
      accepted: 'bg-green-100 text-green-800 border-green-300',
      sent: 'bg-blue-100 text-blue-800 border-blue-300',
      viewed: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      draft: 'bg-gray-100 text-gray-800 border-gray-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
      expired: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      won: 'bg-green-100 text-green-800 border-green-300',
      lost: 'bg-red-100 text-red-800 border-red-300',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
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
        <p className="font-semibold">Error loading analytics</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  const analytics = data?.getSalesPersonAnalytics;
  const stats = analytics?.stats;

  // Prepare chart data
  const statusChartData = analytics?.quotationStatusBreakdown.map(item => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    percentage: item.percentage,
    status: item.status
  })) || [];

  const monthlyChartData = analytics?.monthlyRevenue.map(item => ({
    name: item.month,
    Revenue: item.revenue,
    Won: item.won,
    Lost: item.lost,
    Pending: item.pending,
    Total: item.quotationCount
  })) || [];

  // Filter quotations
  const filteredQuotations = selectedStatus 
    ? analytics?.recentQuotations.filter(q => q.status === selectedStatus)
    : analytics?.recentQuotations;

  // Calculate metrics
  const totalPotential = (stats?.totalQuotations || 0) * (stats?.averageQuotationValue || 0);
  const lostRevenue = (stats?.lostQuotations || 0) * (stats?.averageQuotationValue || 0);
  const pendingRevenue = (stats?.pendingQuotations || 0) * (stats?.averageQuotationValue || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-8 border border-gray-200 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">Sales Analytics</h1>
            </div>
            <p className="text-gray-700 text-lg font-medium">Performance Insights & Metrics</p>
            <p className="text-gray-500 text-sm mt-1">{analytics?.salesPersonName} • {analytics?.companyName}</p>
          </div>
          
          {/* Time Range Filter */}
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Time Period</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-gradient-to-r from-indigo-50 to-pink-50 text-gray-900 rounded-lg px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer border border-gray-200"
            >
              <option value="all">All Time</option>
              <option value="monthly">This Month</option>
              <option value="3months">Last 3 Months</option>
              <option value="quarterly">This Quarter</option>
              <option value="yearly">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-2">
        <div className="flex space-x-2 overflow-x-auto">
          {['overview', 'performance', 'quotations', 'trends'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-90">Total Revenue</p>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(stats?.totalRevenue)}</p>
              <p className="text-sm mt-2 opacity-90">From {stats?.paidQuotations} paid deals</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-90">Pipeline Value</p>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(pendingRevenue)}</p>
              <p className="text-sm mt-2 opacity-90">{stats?.pendingQuotations} pending deals</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-6 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-90">Win Rate</p>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-3xl font-bold">{stats?.conversionRate?.toFixed(1)}%</p>
              <p className="text-sm mt-2 opacity-90">{stats?.wonQuotations} deals won</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-90">Avg Deal Size</p>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(stats?.averageQuotationValue)}</p>
              <p className="text-sm mt-2 opacity-90">Per quotation</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Distribution</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <PieChartComponent data={statusChartData} height={280} />
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Detailed Stats</h4>
                  {statusChartData.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedStatus(item.status)}
                      className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedStatus === item.status
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                          {item.name}
                        </span>
                        <span className="text-xl font-bold text-gray-900">{item.value}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{item.percentage.toFixed(1)}% of deals</span>
                        <span className="text-gray-500">{formatCurrency(item.value * (stats?.averageQuotationValue || 0))}</span>
                      </div>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Revenue Trend with Details */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Revenue Trend & Insights</h3>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total Revenue</p>
                    <p className="text-lg font-bold text-purple-600">{formatCurrency(stats?.totalRevenue || 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Avg Deal Size</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(stats?.averageQuotationValue || 0)}</p>
                  </div>
                </div>
              </div>
              <AreaChartComponent
                data={monthlyChartData}
                dataKey="Revenue"
                xAxisKey="name"
                height={300}
                gradientFrom="#8B5CF6"
                gradientTo="#A78BFA"
                formatYAxis={formatCurrencyCompact}
                formatTooltip={formatCurrency}
              />
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase">Best Month</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">
                    {monthlyChartData.length > 0 ? monthlyChartData.reduce((max, item) => item.Revenue > max.Revenue ? item : max, monthlyChartData[0])?.name : 'N/A'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase">Growth Rate</p>
                  <p className="text-sm font-bold text-green-600 mt-1">
                    {monthlyChartData.length >= 2 ? `+${(((monthlyChartData[monthlyChartData.length-1]?.Revenue || 0) - (monthlyChartData[0]?.Revenue || 1)) / (monthlyChartData[0]?.Revenue || 1) * 100).toFixed(1)}%` : 'N/A'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase">Total Deals</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{stats?.totalQuotations || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Potential</h3>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalPotential)}</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Quotations:</span>
                  <span className="font-semibold">{stats?.totalQuotations}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Deals Won</h3>
              <p className="text-3xl font-bold text-gray-900">{stats?.wonQuotations}</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Success Rate:</span>
                  <span className="font-semibold text-green-600">{stats?.conversionRate?.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-500">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Lost Opportunities</h3>
              <p className="text-3xl font-bold text-gray-900">{stats?.lostQuotations}</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Est. Value:</span>
                  <span className="font-semibold text-red-600">{formatCurrency(lostRevenue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Win/Loss Analysis */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Win/Loss Analysis</h3>
            <LineChartComponent
              data={monthlyChartData}
              lines={[
                { key: 'Won', color: '#10B981', name: 'Won' },
                { key: 'Lost', color: '#EF4444', name: 'Lost' },
                { key: 'Pending', color: '#F59E0B', name: 'Pending' }
              ]}
              xAxisKey="name"
              height={350}
            />
          </div>
        </div>
      )}

      {/* Quotations Tab */}
      {activeTab === 'quotations' && (
        <div className="space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-md border-t-4 border-green-500">
              <p className="text-xs font-medium text-green-600 uppercase mb-1">Won</p>
              <p className="text-3xl font-bold text-green-600">{stats?.wonQuotations}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-md border-t-4 border-yellow-500">
              <p className="text-xs font-medium text-yellow-600 uppercase mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{stats?.pendingQuotations}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-md border-t-4 border-gray-500">
              <p className="text-xs font-medium text-gray-600 uppercase mb-1">Draft</p>
              <p className="text-3xl font-bold text-gray-600">{stats?.draftQuotations}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-md border-t-4 border-red-500">
              <p className="text-xs font-medium text-red-600 uppercase mb-1">Lost</p>
              <p className="text-3xl font-bold text-red-600">{stats?.lostQuotations}</p>
            </div>
          </div>

          {/* Interactive Status Selection */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filter by Status</h3>
              {selectedStatus && (
                <button
                  onClick={() => setSelectedStatus(null)}
                  className="text-xs text-black px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-full font-medium"
                >
                  Clear Filter
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statusChartData.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedStatus(item.status)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedStatus === item.status
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                    {item.name}
                  </span>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{item.value}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Quotations Table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Quotation List
                {selectedStatus && (
                  <span className="ml-2 text-sm font-normal text-indigo-600">
                    ({selectedStatus})
                  </span>
                )}
              </h3>
              <span className="text-sm text-gray-500">
                {filteredQuotations?.length || 0} shown
              </span>
            </div>
            <div className="overflow-x-auto">
              {filteredQuotations && filteredQuotations.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Quotation #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredQuotations.map((quotation) => (
                      <tr key={quotation.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{quotation.quotationNo}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{quotation.clientName}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(quotation.totalAmount)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(quotation.status)}`}>
                            {quotation.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(quotation.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    {selectedStatus ? `No ${selectedStatus} quotations found` : 'No quotations available'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          {/* Monthly Performance */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Performance Overview</h3>
            <BarChartComponent
              data={monthlyChartData}
              dataKey={[
                { key: 'Won', color: '#10B981', name: 'Won' },
                { key: 'Lost', color: '#EF4444', name: 'Lost' },
                { key: 'Pending', color: '#F59E0B', name: 'Pending' }
              ]}
              xAxisKey="name"
              height={350}
            />
          </div>

          {/* Revenue Trend */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Growth</h3>
            <AreaChartComponent
              data={monthlyChartData}
              dataKey="Revenue"
              xAxisKey="name"
              height={350}
              gradientFrom="#10B981"
              gradientTo="#34D399"
              formatYAxis={formatCurrencyCompact}
              formatTooltip={formatCurrency}
            />
          </div>
        </div>
      )}
    </div>
  );
}
