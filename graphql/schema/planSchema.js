import { gql } from 'graphql-tag';

export const planTypeDefs = gql`
  type Feature {
    name: String!
    value: String
    isIncluded: Boolean!
  }

  type Plan {
    id: ID!
    name: String!
    description: String
    price: Float!
    billingCycle: String!
    usersLimit: Int!
    salesPersonLimit: Int!
    quotationLimit: Int!
    features: [Feature!]!
    status: String!
    isPopular: Boolean!
    displayOrder: Int!
    subscriptionCount: Int!
    totalRevenue: Float!
    createdAt: String!
    updatedAt: String!
  }

  input FeatureInput {
    name: String!
    value: String
    isIncluded: Boolean
  }

  type PlanStats {
    totalPlans: Int!
    activePlans: Int!
    totalRevenue: Float!
    averageUsersLimit: Float!
    totalSubscriptions: Int!
  }

  extend type Query {
    getPlans: [Plan!]!
    getPlan(id: ID!): Plan
    getActivePlans: [Plan!]!
    getPlanStats: PlanStats!
  }

  extend type Mutation {
    createPlan(
      name: String!
      description: String
      price: Float!
      billingCycle: String!
      usersLimit: Int!
      salesPersonLimit: Int!
      quotationLimit: Int!
      features: [FeatureInput!]
      status: String
      isPopular: Boolean
      displayOrder: Int
    ): Plan!
    
    updatePlan(
      id: ID!
      name: String
      description: String
      price: Float
      billingCycle: String
      usersLimit: Int
      salesPersonLimit: Int
      quotationLimit: Int
      features: [FeatureInput!]
      status: String
      isPopular: Boolean
      displayOrder: Int
    ): Plan!
    
    deletePlan(id: ID!): DeleteResponse!
  }
`;

