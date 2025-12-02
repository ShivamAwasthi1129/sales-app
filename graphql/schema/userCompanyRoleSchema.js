import { gql } from 'graphql-tag';

export const userCompanyRoleTypeDefs = gql`
  type UserCompanyRole {
    id: ID!
    userId: ID!
    companyId: ID!
    role: String!
    status: String!
    permissions: [String!]
    salesPersonId: String
    addedBy: ID
    createdAt: String!
    updatedAt: String!
    # Populated fields
    user: User
    company: Company
  }

  type UserCompanyInfo {
    companyId: ID!
    companyName: String!
    role: String!
    status: String!
    salesPersonId: String
    isActive: Boolean!
  }

  type SwitchCompanyResponse {
    success: Boolean!
    message: String!
    token: String
    user: User
    activeCompany: Company
  }

  extend type Query {
    # Get all companies a user has access to
    getUserCompanies(userId: ID): [UserCompanyInfo!]!
    
    # Get all users in a company
    getCompanyUsers(companyId: ID!): [UserCompanyRole!]!
    
    # Get specific user-company role
    getUserCompanyRole(userId: ID!, companyId: ID!): UserCompanyRole
  }

  extend type Mutation {
    # Switch active company for logged-in user
    switchCompany(companyId: ID!): SwitchCompanyResponse!
    
    # Add user to a company with a role
    addUserToCompany(
      userId: ID!
      companyId: ID!
      role: String!
      salesPersonId: String
    ): UserCompanyRole!
    
    # Remove user from a company
    removeUserFromCompany(userId: ID!, companyId: ID!): DeleteResponse!
    
    # Update user's role in a company
    updateUserCompanyRole(
      userId: ID!
      companyId: ID!
      role: String
      status: String
      permissions: [String!]
    ): UserCompanyRole!
  }
`;


