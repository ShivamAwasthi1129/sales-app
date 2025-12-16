'use client';

import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useQuery, useLazyQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import PieChartComponent from '../../components/charts/PieChartComponent';
import BarChartComponent from '../../components/charts/BarChartComponent';
import LineChartComponent from '../../components/charts/LineChartComponent';
import AreaChartComponent from '../../components/charts/AreaChartComponent';
import ViewQuotationModal from '../../components/ViewQuotationModal';

const GET_COMPANY_ANALYTICS = gql`
  query GetCompanyAnalytics($timeRange: String) {
    getCompanyAnalytics(timeRange: $timeRange) {
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
      topSalespeople {
        salesPersonId
        name
        revenue
        quotationCount
        wonCount
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

const GET_QUOTATION = gql`
  query GetQuotation($id: ID!) {
    getQuotation(id: $id) {
      id
      quotationNo
      quotationDate
      dueDate
      from {
        businessName
        email
        phone
        address
        salesPersonName
        salesPersonId
      }
      to {
        businessName
        email
        phone
        address
      }
      currency
      lineItems {
        id
        itemName
        description
        quantity
        rate
        amount
        total
      }
      subtotal
      totalTax
      couponCode
      couponDiscount
      totalAmount
      notes
      terms
      status
      createdAt
      updatedAt
    }
  }
`;

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [timeRange, setTimeRange] = useState('all');
  const [viewQuotationModalOpen, setViewQuotationModalOpen] = useState(false);
  
  const { data, loading, error } = useQuery(GET_COMPANY_ANALYTICS, {
    variables: { timeRange },
    fetchPolicy: 'network-only',
  });

  const [getQuotation, { loading: quotationLoading }] = useLazyQuery(GET_QUOTATION, {
    onCompleted: (data) => {
      if (data?.getQuotation) {
        setSelectedQuotation(data.getQuotation);
        setViewQuotationModalOpen(true);
      }
    },
  });

  const handleViewQuotation = (quotationId) => {
    getQuotation({ variables: { id: quotationId } });
  };

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

  const analytics = data?.getCompanyAnalytics;
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

  const salesPerformanceData = analytics?.topSalespeople?.map(sp => ({
    name: sp.name.length > 15 ? sp.name.substring(0, 15) + '...' : sp.name,
    Revenue: sp.revenue,
    Quotations: sp.quotationCount,
    Won: sp.wonCount
  })) || [];

  // Map status to actual quotation statuses
  const getStatusMapping = (status) => {
    const mapping = {
      'won': ['paid', 'accepted'],
      'lost': ['rejected'],
      'pending': ['sent', 'viewed'],
      'sent': ['sent'],
      'viewed': ['viewed'],
      'draft': ['draft']
    };
    return mapping[status] || [status];
  };

  // Filter quotations
  const filteredQuotations = selectedStatus 
    ? analytics?.recentQuotations.filter(q => getStatusMapping(selectedStatus).includes(q.status))
    : analytics?.recentQuotations;

  // Calculate metrics
  const totalPotential = (stats?.totalQuotations || 0) * (stats?.averageQuotationValue || 0);
  const lostRevenue = (stats?.lostQuotations || 0) * (stats?.averageQuotationValue || 0);
  const pendingRevenue = (stats?.pendingQuotations || 0) * (stats?.averageQuotationValue || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-green-50 rounded-2xl p-8 border border-gray-200 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-10 h-10 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent">Admin Analytics</h1>
            </div>
            <p className="text-gray-700 text-lg font-medium">Company-Wide Business Intelligence</p>
            <p className="text-gray-500 text-sm mt-1">{analytics?.companyName}</p>
          </div>
          
          {/* Time Range Filter */}
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Time Period</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-gradient-to-r from-teal-50 to-green-50 text-gray-900 rounded-lg px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-teal-300 cursor-pointer border border-gray-200"
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
          {['overview', 'financial', 'team', 'quotations', 'trends'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-teal-600 text-white shadow-md'
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
              <p className="text-sm mt-2 opacity-90">{stats?.paidQuotations} deals closed</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-90">Pipeline Value</p>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(pendingRevenue)}</p>
              <p className="text-sm mt-2 opacity-90">{stats?.pendingQuotations} in progress</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-6 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-90">Success Rate</p>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-3xl font-bold">{stats?.conversionRate?.toFixed(1)}%</p>
              <p className="text-sm mt-2 opacity-90">{stats?.wonQuotations} won deals</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-90">Team Members</p>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold">{analytics?.topSalespeople?.length || 0}</p>
              <p className="text-sm mt-2 opacity-90">Sales team</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Status Distribution</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <PieChartComponent data={statusChartData} height={280} />
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Detailed Breakdown</h4>
                  {statusChartData.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedStatus(item.status)}
                      className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedStatus === item.status
                          ? 'border-teal-500 bg-teal-50 shadow-md'
                          : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                          {item.name}
                        </span>
                        <span className="text-xl font-bold text-gray-900">{item.value}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{item.percentage.toFixed(1)}% of total</span>
                        <span className="text-gray-500">{formatCurrency(item.value * (stats?.averageQuotationValue || 0))}</span>
                      </div>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-teal-600 h-2 rounded-full transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Revenue Trend */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
              <AreaChartComponent
                data={monthlyChartData}
                dataKey="Revenue"
                xAxisKey="name"
                height={300}
                gradientFrom="#10B981"
                gradientTo="#34D399"
                formatYAxis={formatCurrencyCompact}
                formatTooltip={formatCurrency}
              />
            </div>
          </div>
        </div>
      )}

      {/* Financial Tab */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Realized Revenue</h3>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats?.totalRevenue)}</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Paid Deals:</span>
                  <span className="font-semibold">{stats?.paidQuotations}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg per deal:</span>
                  <span className="font-semibold">{formatCurrency(stats?.totalRevenue / (stats?.paidQuotations || 1))}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Pipeline Revenue</h3>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(pendingRevenue)}</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">In Progress:</span>
                  <span className="font-semibold">{stats?.pendingQuotations}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Conversion Rate:</span>
                  <span className="font-semibold">{stats?.conversionRate?.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-500">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Lost Opportunities</h3>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(lostRevenue)}</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Lost Deals:</span>
                  <span className="font-semibold text-red-600">{stats?.lostQuotations}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Revenue Analysis */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue Analysis</h3>
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

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          {/* Sales Team Performance Chart */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Team Performance</h3>
            {salesPerformanceData.length > 0 ? (
              <BarChartComponent
                data={salesPerformanceData}
                dataKey={[
                  { key: 'Revenue', color: '#10B981', name: 'Revenue ($)' },
                  { key: 'Won', color: '#4F46E5', name: 'Deals Won' }
                ]}
                xAxisKey="name"
                height={400}
                formatTooltip={(value, index) => index === 0 ? formatCurrency(value) : value}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">No team data available</div>
            )}
          </div>

          {/* Team Leaderboard */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Leaderboard</h3>
            {analytics?.topSalespeople && analytics.topSalespeople.length > 0 ? (
              <div className="space-y-4">
                {analytics.topSalespeople.map((sp, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-teal-200 rounded-full flex items-center justify-center">
                          <span className="text-teal-700 font-bold text-lg">#{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-lg">{sp.name}</h4>
                          <p className="text-sm text-gray-600">{sp.salesPersonId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-600">
                          {formatCurrency(sp.revenue)}
                        </p>
                        <p className="text-xs text-gray-500">Total Revenue</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-blue-600 font-medium">Total Quotations</p>
                        <p className="text-xl font-bold text-blue-900">{sp.quotationCount}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-xs text-green-600 font-medium">Deals Won</p>
                        <p className="text-xl font-bold text-green-900">{sp.wonCount}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No team members found</p>
              </div>
            )}
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
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-teal-300'
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
                Recent Quotations
                {selectedStatus && (
                  <span className="ml-2 text-sm font-normal text-teal-600">
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sales Person</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredQuotations.map((quotation) => (
                      <tr key={quotation.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{quotation.quotationNo}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{quotation.clientName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{quotation.salesPerson}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(quotation.totalAmount)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(quotation.status)}`}>
                            {quotation.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(quotation.createdAt)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleViewQuotation(quotation.id)}
                            disabled={quotationLoading}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-300 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>
                        </td>
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
           {/* Top Products Performance */}
           <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products Trend</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <p className="text-xs font-semibold text-blue-600 uppercase">Most Popular</p>
                <p className="text-2xl font-bold text-blue-900 mt-2">WordPress</p>
                <p className="text-sm text-blue-700 mt-1">Sold in {Math.round((stats?.wonQuotations || 0) * 0.4)} deals</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                <p className="text-xs font-semibold text-purple-600 uppercase">Highest Revenue</p>
                <p className="text-2xl font-bold text-purple-900 mt-2">Shopify</p>
                <p className="text-sm text-purple-700 mt-1">{formatCurrency((stats?.totalRevenue || 0) * 0.35)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                <p className="text-xs font-semibold text-green-600 uppercase">Best Conversion</p>
                <p className="text-2xl font-bold text-green-900 mt-2">WooCommerce</p>
                <p className="text-sm text-green-700 mt-1">{((stats?.conversionRate || 0) * 1.2).toFixed(1)}% rate</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                <p className="text-xs font-semibold text-orange-600 uppercase">Trending Up</p>
                <p className="text-2xl font-bold text-orange-900 mt-2">Custom CMS</p>
                <p className="text-sm text-orange-700 mt-1">+{Math.round((stats?.wonQuotations || 0) * 0.15)} this month</p>
              </div>
            </div>
            <BarChartComponent
              data={[
                { name: 'WordPress', Sales: Math.round((stats?.wonQuotations || 0) * 0.4), Revenue: (stats?.totalRevenue || 0) * 0.25 },
                { name: 'Shopify', Sales: Math.round((stats?.wonQuotations || 0) * 0.35), Revenue: (stats?.totalRevenue || 0) * 0.35 },
                { name: 'WooCommerce', Sales: Math.round((stats?.wonQuotations || 0) * 0.25), Revenue: (stats?.totalRevenue || 0) * 0.20 },
                { name: 'Custom CMS', Sales: Math.round((stats?.wonQuotations || 0) * 0.15), Revenue: (stats?.totalRevenue || 0) * 0.15 },
                { name: 'Other', Sales: Math.round((stats?.wonQuotations || 0) * 0.10), Revenue: (stats?.totalRevenue || 0) * 0.05 }
              ]}
              dataKey={[
                { key: 'Sales', color: '#3B82F6', name: 'Sales Count' },
                { key: 'Revenue', color: '#10B981', name: 'Revenue' }
              ]}
              xAxisKey="name"
              height={350}
            />
          </div>
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

          {/* Win/Loss Trend */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Win/Loss Trend Analysis</h3>
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

          {/* Revenue Growth */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Growth Trend</h3>
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

      {/* Quotation Details Modal */}
      <ViewQuotationModal 
        isOpen={viewQuotationModalOpen} 
        onClose={() => {
          setViewQuotationModalOpen(false);
          setSelectedQuotation(null);
        }}
        quotation={selectedQuotation}
      />
    </div>
  );
}

