import { gql } from 'graphql-tag';

export const companyTypeDefs = gql`
  type PlanLimits {
    salesPersonLimit: Int!
    quotationLimit: Int!
    usersLimit: Int!
  }

  type CurrentUsage {
    salesPersonCount: Int!
    quotationCount: Int!
    usersCount: Int!
  }

  type Company {
    id: ID!
    name: String!
    email: String!
    phone: String
    address: String
    website: String
    industry: String
    adminId: ID
    adminIds: [ID!]
    admin: User
    planId: ID!
    plan: Plan
    planLimits: PlanLimits!
    currentUsage: CurrentUsage!
    status: String!
    logo: String
    description: String
    userCount: Int
    enabledRoles: [String!]!
    sidebarModules: [SidebarModule!]!
    createdAt: String!
    updatedAt: String!
  }

  type SidebarModule {
    name: String!
    path: String!
    icon: String!
    enabled: Boolean!
  }

  type CompanyControlData {
    company: Company!
    users: [User!]!
    salesPersons: [User!]!
    customers: [CustomerInfo!]!
  }

  type CustomerInfo {
    businessName: String!
    email: String
    phone: String
    address: String
    quotationCount: Int!
    lastQuotationDate: String
  }

  extend type Query {
    getCompanies: [Company!]!
    getCompany(id: ID!): Company
    checkCompanyLimit(companyId: ID!, limitType: String!): Boolean!
    getCompanyControlData: [CompanyControlData!]!
  }

  type SyncResult {
    success: Boolean!
    message: String!
    oldCounts: UsageCounts
    newCounts: UsageCounts
  }

  type UsageCounts {
    salesPersonCount: Int!
    usersCount: Int!
    quotationCount: Int!
  }

  extend type Mutation {
    createCompany(
      name: String!
      email: String!
      phone: String
      address: String
      website: String
      industry: String
      adminId: ID
      adminIds: [ID!]
      planId: ID!
      status: String
      logo: String
      description: String
    ): Company!
    
    updateCompany(
      id: ID!
      name: String
      email: String
      phone: String
      address: String
      website: String
      industry: String
      adminId: ID
      adminIds: [ID!]
      planId: ID
      status: String
      logo: String
      description: String
    ): Company!
    
    deleteCompany(id: ID!): DeleteResponse!
    
    updateCompanyRoles(id: ID!, enabledRoles: [String!]!): Company!
    updateCompanySidebarModules(id: ID!, sidebarModules: [SidebarModuleInput!]!): Company!
    syncCompanyUsageCounts(id: ID!): SyncResult!
  }

  input SidebarModuleInput {
    name: String!
    path: String!
    icon: String!
    enabled: Boolean!
  }
`;

