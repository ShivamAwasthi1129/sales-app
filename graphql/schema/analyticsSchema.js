import { gql } from 'graphql-tag';

export const analyticsTypeDefs = gql`
  type DashboardStats {
    totalUsers: Int!
    activeUsers: Int!
    totalCompanies: Int!
    activeCompanies: Int!
    totalQuotations: Int!
    totalRevenue: Float!
    averageQuotationValue: Float!
    conversionRate: Float!
    paidQuotations: Int!
    pendingQuotations: Int!
    draftQuotations: Int!
    acceptedQuotations: Int!
    rejectedQuotations: Int!
  }

  type RoleDistribution {
    role: String!
    count: Int!
    percentage: Float!
  }

  type QuotationStatusBreakdown {
    status: String!
    count: Int!
    totalValue: Float!
    percentage: Float!
  }

  type MonthlyRevenue {
    month: String!
    revenue: Float!
    quotationCount: Int!
  }

  type RecentUser {
    id: ID!
    name: String!
    email: String!
    role: String!
    status: String!
    createdAt: String!
  }

  type RecentQuotation {
    id: ID!
    quotationNo: String!
    totalAmount: Float!
    status: String!
    businessName: String!
    createdAt: String!
  }

  type CompanyRevenue {
    companyId: ID!
    companyName: String!
    totalRevenue: Float!
    paidQuotations: Int!
    pendingQuotations: Int!
    totalQuotations: Int!
    conversionRate: Float!
    averageValue: Float!
    status: String!
  }

  type SubscriptionAnalytics {
    companyId: ID!
    companyName: String!
    activeSubscriptions: Int!
    totalSubscriptionRevenue: Float!
    monthlyRecurring: Float!
    yearlyRecurring: Float!
    subscriptionsByProduct: [ProductSubscriptionCount!]!
    recentSubscriptions: [RecentSubscription!]!
  }

  type ProductSubscriptionCount {
    productId: ID!
    productName: String!
    count: Int!
    revenue: Float!
  }

  type RecentSubscription {
    quotationNo: String!
    companyName: String!
    clientName: String!
    productName: String!
    amount: Float!
    billingType: String!
    status: String!
    startDate: String!
  }

  type DashboardAnalytics {
    stats: DashboardStats!
    roleDistribution: [RoleDistribution!]!
    quotationStatusBreakdown: [QuotationStatusBreakdown!]!
    monthlyRevenue: [MonthlyRevenue!]!
    recentUsers: [RecentUser!]!
    recentQuotations: [RecentQuotation!]!
    companyRevenues: [CompanyRevenue!]!
    subscriptionAnalytics: [SubscriptionAnalytics!]!
  }

  type CompanyStats {
    totalQuotations: Int!
    wonQuotations: Int!
    lostQuotations: Int!
    pendingQuotations: Int!
    draftQuotations: Int!
    paidQuotations: Int!
    totalRevenue: Float!
    averageQuotationValue: Float!
    conversionRate: Float!
  }

  type MonthlyRevenueExtended {
    month: String!
    revenue: Float!
    quotationCount: Int!
    won: Int!
    lost: Int!
    pending: Int!
  }

  type TopSalesperson {
    salesPersonId: String!
    name: String!
    revenue: Float!
    quotationCount: Int!
    wonCount: Int!
  }

  type CompanyRecentQuotation {
    id: ID!
    quotationNo: String!
    totalAmount: Float!
    status: String!
    clientName: String!
    salesPerson: String!
    createdAt: String!
  }

  type CompanyQuotationStatusBreakdown {
    status: String!
    count: Int!
    percentage: Float!
  }

  type CompanyAnalytics {
    companyName: String!
    stats: CompanyStats!
    monthlyRevenue: [MonthlyRevenueExtended!]!
    topSalespeople: [TopSalesperson!]!
    recentQuotations: [CompanyRecentQuotation!]!
    quotationStatusBreakdown: [CompanyQuotationStatusBreakdown!]!
  }

  type SalesPersonStats {
    totalQuotations: Int!
    wonQuotations: Int!
    lostQuotations: Int!
    pendingQuotations: Int!
    draftQuotations: Int!
    paidQuotations: Int!
    totalRevenue: Float!
    averageQuotationValue: Float!
    conversionRate: Float!
  }

  type SalesPersonAnalytics {
    salesPersonId: String!
    salesPersonName: String!
    companyName: String!
    stats: SalesPersonStats!
    monthlyRevenue: [MonthlyRevenueExtended!]!
    recentQuotations: [CompanyRecentQuotation!]!
    quotationStatusBreakdown: [CompanyQuotationStatusBreakdown!]!
  }

  # Product Analytics Types
  type ProductSalesData {
    productId: ID!
    productName: String!
    imageUrl: String
    groupName: String
    totalQuantitySold: Int!
    totalRevenue: Float!
    totalOrders: Int!
    averageOrderValue: Float!
    lastSoldAt: String
  }

  type TopBuyer {
    clientName: String!
    clientEmail: String!
    totalPurchases: Int!
    totalSpent: Float!
    lastPurchaseAt: String!
  }

  type DemandTrend {
    month: String!
    quantity: Int!
    revenue: Float!
    orders: Int!
  }

  type ProductDemandAnalysis {
    productId: ID!
    productName: String!
    trends: [DemandTrend!]!
    peakMonth: String
    peakQuantity: Int
    growthRate: Float
  }

  type ProductAnalytics {
    topSellingProducts: [ProductSalesData!]!
    lowSellingProducts: [ProductSalesData!]!
    productDemandTrends: [ProductDemandAnalysis!]!
    topBuyersByProduct: [ProductTopBuyers!]!
    overallStats: ProductOverallStats!
  }

  type ProductTopBuyers {
    productId: ID!
    productName: String!
    topBuyers: [TopBuyer!]!
  }

  type ProductOverallStats {
    totalProducts: Int!
    totalProductsSold: Int!
    totalRevenue: Float!
    averageProductRevenue: Float!
    mostProfitableProduct: String
    fastestGrowingProduct: String
  }

  extend type Query {
    getDashboardAnalytics: DashboardAnalytics!
    getCompanyAnalytics: CompanyAnalytics!
    getSalesPersonAnalytics: SalesPersonAnalytics!
    getProductAnalytics: ProductAnalytics!
  }
`;

