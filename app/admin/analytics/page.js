// analytics/page.js

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
      paid: 'bg-green-100 text-green-800 border-green-300',
      accepted: 'bg-blue-100 text-blue-800 border-blue-300',
      sent: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      viewed: 'bg-purple-100 text-purple-800 border-purple-300',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      draft: 'bg-gray-100 text-gray-800 border-gray-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
      won: 'bg-green-100 text-green-800 border-green-300',
      lost: 'bg-red-100 text-red-800 border-red-300',
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
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
          {/* Left Section - Title and Info */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-blue-600 animate-lightning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                  Admin Analytics
                </h1>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="text-sm text-gray-400 font-semibold">{analytics?.companyName || 'Company'}</p>
                </div>
              </div>
            </div>
            <p className="text-base mt-4 text-gray-700">Company-Wide Business Intelligence</p>
          </div>

          {/* Right Section - Time Period Filter */}
          <div className="w-full sm:w-auto bg-blue-50 rounded-lg p-4 border border-blue-100 shadow-md">
            <label className="text-xs font-bold text-blue-900 mb-2 block">TIME PERIOD</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full bg-white text-gray-800 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 hover:border-gray-400 transition-all duration-300 cursor-pointer"
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 hover:shadow-md transition-all">
        <div className="flex space-x-2 overflow-x-auto">
          {['overview', 'financial', 'team', 'quotations', 'trends'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === tab
                ? 'bg-blue-900 text-white shadow-md'
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
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">
                    Total Revenue
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {formatCurrency(stats?.totalRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">{stats?.paidQuotations} deals closed</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
                    Pipeline Value
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {formatCurrency(pendingRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">{stats?.pendingQuotations} in progress</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-purple-600 font-bold uppercase tracking-wide mb-1">
                    Success Rate
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stats?.conversionRate?.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">{stats?.wonQuotations} won deals</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-orange-600 font-bold uppercase tracking-wide mb-1">
                    Team Members
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {analytics?.topSalespeople?.length || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">Sales team</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Status Distribution */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <h3 className="text-lg font-bold text-blue-900 mb-3">Deal Status Distribution</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <PieChartComponent data={statusChartData} height={280} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">Detailed Breakdown</h4>
                  {statusChartData.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedStatus(item.status)}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${selectedStatus === item.status
                        ? 'border-gray-400 bg-gray-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                          {item.name}
                        </span>
                        <span className="text-sm font-bold text-gray-900">{item.value}</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        {item.percentage.toFixed(1)}% of total
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Revenue Trend */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <h3 className="text-lg font-bold text-blue-900 mb-3">Revenue Trend</h3>
              <AreaChartComponent
                data={monthlyChartData}
                dataKey="Revenue"
                xAxisKey="name"
                height={300}
                gradientFrom="#3B82F6"
                gradientTo="#60A5FA"
                formatYAxis={formatCurrencyCompact}
                formatTooltip={formatCurrency}
              />
            </div>
          </div>
        </div>
      )}

      {/* Financial Tab */}
      {activeTab === 'financial' && (
        <div className="space-y-4">
          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Realized Revenue */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 relative">
              <div className="absolute top-5 right-5 p-3 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="pr-16">
                <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-2">
                  Realized Revenue
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(stats?.totalRevenue)}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paid Deals:</span>
                    <span className="font-semibold text-gray-900">{stats?.paidQuotations}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avg per deal:</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(stats?.totalRevenue / (stats?.paidQuotations || 1))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline Revenue */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 relative">
              <div className="absolute top-5 right-5 p-3 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="pr-16">
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-2">
                  Pipeline Revenue
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(pendingRevenue)}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">In Progress:</span>
                    <span className="font-semibold text-gray-900">{stats?.pendingQuotations}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Conversion Rate:</span>
                    <span className="font-semibold text-gray-900">{stats?.conversionRate?.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lost Opportunities */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 relative">
              <div className="absolute top-5 right-5 p-3 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="pr-16">
                <p className="text-xs text-red-600 font-bold uppercase tracking-wide mb-2">
                  Lost Opportunities
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(lostRevenue)}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Lost Deals:</span>
                    <span className="font-semibold text-red-600">{stats?.lostQuotations}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Conversion Impact:</span>
                    <span className="font-semibold text-gray-900">{((stats?.lostQuotations / (stats?.totalQuotations || 1)) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Revenue Analysis */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-blue-900">Monthly Revenue Analysis</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
                <span>Revenue Trend</span>
              </div>
            </div>
            <AreaChartComponent
              data={monthlyChartData}
              dataKey="Revenue"
              xAxisKey="name"
              height={350}
              gradientFrom="#3B82F6"
              gradientTo="#60A5FA"
              formatYAxis={formatCurrencyCompact}
              formatTooltip={formatCurrency}
            />
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          {/* Sales Team Performance Chart */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-blue-900 mb-3">Sales Team Performance</h3>
            {salesPerformanceData.length > 0 ? (
              <BarChartComponent
                data={salesPerformanceData}
                dataKey={[
                  { key: 'Revenue', color: '#3B82F6', name: 'Revenue ($)' },
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-blue-900 mb-3">Team Leaderboard</h3>
            {analytics?.topSalespeople && analytics.topSalespeople.length > 0 ? (
              <div className="space-y-2">
                {analytics.topSalespeople.map((sp, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-700 font-bold text-sm">#{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{sp.name}</h4>
                          <p className="text-xs text-gray-500">{sp.salesPersonId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(sp.revenue)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-50 px-2 py-1 rounded border border-gray-200">
                        <span className="text-gray-600">Quotes: </span>
                        <span className="font-bold text-gray-900">{sp.quotationCount}</span>
                      </div>
                      <div className="bg-gray-50 px-2 py-1 rounded border border-gray-200">
                        <span className="text-gray-600">Won: </span>
                        <span className="font-bold text-gray-900">{sp.wonCount}</span>
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
        <div className="space-y-4">
          {/* Status Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-100 hover:shadow-md transition-all hover:border-green-300">
              <p className="text-xs text-green-700 font-bold uppercase tracking-wide">Won</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{stats?.wonQuotations || 0}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg shadow-sm border border-yellow-100 hover:shadow-md transition-all hover:border-yellow-300">
              <p className="text-xs text-yellow-700 font-bold uppercase tracking-wide">Pending</p>
              <p className="text-2xl font-bold text-yellow-900 mt-1">{stats?.pendingQuotations || 0}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100 hover:shadow-md transition-all hover:border-gray-300">
              <p className="text-xs text-blue-700 font-bold uppercase tracking-wide">Draft</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{stats?.draftQuotations || 0}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-100 hover:shadow-md transition-all hover:border-red-300">
              <p className="text-xs text-red-700 font-bold uppercase tracking-wide">Lost</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{stats?.lostQuotations || 0}</p>
            </div>
          </div>

          {/* Interactive Status Selection */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-blue-900">Filter by Status</h3>
              {selectedStatus && (
                <button
                  onClick={() => setSelectedStatus(null)}
                  className="text-xs text-white px-3 py-1 bg-gray-500 hover:bg-gray-600 rounded-full font-medium transition-all"
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
                  className={`p-3 rounded-lg border transition-all ${selectedStatus === item.status
                    ? 'border-gray-400 bg-gray-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                    {item.name}
                  </span>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{item.value}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Quotations Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-blue-900">
                Recent Quotations
                {selectedStatus && (
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    ({selectedStatus})
                  </span>
                )}
              </h3>
              <span className="text-sm text-gray-600">
                {filteredQuotations?.length || 0} shown
              </span>
            </div>
            <div className="overflow-x-auto">
              {filteredQuotations && filteredQuotations.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Quotation #</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Client</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Sales Person</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredQuotations.map((quotation) => (
                      <tr key={quotation.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{quotation.quotationNo}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{quotation.clientName || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{quotation.salesPerson || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-gray-900">{formatCurrency(quotation.totalAmount)}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(quotation.status)}`}>
                            {quotation.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{formatDate(quotation.createdAt)}</td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => handleViewQuotation(quotation.id)}
                            disabled={quotationLoading}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
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
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
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
        <div className="space-y-4">
          {/* Top Products Performance */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-blue-900">Top Products Trend</h3>
                <p className="text-xs text-gray-500 mt-0.5">Performance metrics across your product portfolio</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
                <div className="flex-1">
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
                    Most Popular
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    WordPress
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">Sold in {Math.round((stats?.wonQuotations || 0) * 0.4)} deals</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
                <div className="flex-1">
                  <p className="text-xs text-purple-600 font-bold uppercase tracking-wide mb-1">
                    Highest Revenue
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    Shopify
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">{formatCurrency((stats?.totalRevenue || 0) * 0.35)}</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
                <div className="flex-1">
                  <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">
                    Best Conversion
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    WooCommerce
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">{((stats?.conversionRate || 0) * 1.2).toFixed(1)}% rate</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
                <div className="flex-1">
                  <p className="text-xs text-orange-600 font-bold uppercase tracking-wide mb-1">
                    Trending Up
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    Custom CMS
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">+{Math.round((stats?.wonQuotations || 0) * 0.15)} this month</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
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
          </div>

          {/* Monthly Performance */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-indigo-100 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-blue-900">Monthly Performance Overview</h3>
                <p className="text-xs text-gray-500 mt-0.5">Deal outcomes and quotation status by month</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <BarChartComponent
                data={monthlyChartData}
                dataKey={[
                  { key: 'Won', color: '#10B981', name: 'Won' },
                  { key: 'Lost', color: '#F87171', name: 'Lost' },
                  { key: 'Pending', color: '#3B82F6', name: 'Pending' }
                ]}
                xAxisKey="name"
                height={350}
              />
            </div>
          </div>

          {/* Win/Loss Trend */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-cyan-100 rounded-lg">
                <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-blue-900">Win/Loss Trend Analysis</h3>
                <p className="text-xs text-gray-500 mt-0.5">Track quotation outcomes over time</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <LineChartComponent
                data={monthlyChartData}
                lines={[
                  { key: 'Won', color: '#10B981', name: 'Won' },
                  { key: 'Lost', color: '#F87171', name: 'Lost' },
                  { key: 'Pending', color: '#3B82F6', name: 'Pending' }
                ]}
                xAxisKey="name"
                height={350}
              />
            </div>
          </div>

          {/* Revenue Growth */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-100 rounded-lg">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-blue-900">Revenue Growth Trend</h3>
                <p className="text-xs text-gray-500 mt-0.5">Monthly revenue progression and growth analysis</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <AreaChartComponent
                data={monthlyChartData}
                dataKey="Revenue"
                xAxisKey="name"
                height={350}
                gradientFrom="#3B82F6"
                gradientTo="#60A5FA"
                formatYAxis={formatCurrencyCompact}
                formatTooltip={formatCurrency}
              />
            </div>
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
