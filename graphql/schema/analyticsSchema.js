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

  type DashboardAnalytics {
    stats: DashboardStats!
    roleDistribution: [RoleDistribution!]!
    quotationStatusBreakdown: [QuotationStatusBreakdown!]!
    monthlyRevenue: [MonthlyRevenue!]!
    recentUsers: [RecentUser!]!
    recentQuotations: [RecentQuotation!]!
  }

  extend type Query {
    getDashboardAnalytics: DashboardAnalytics!
  }
`;

