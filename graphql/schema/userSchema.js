import { gql } from 'graphql-tag';

export const userTypeDefs = gql`
  type PasswordChangeRequest {
    status: String!
    requestedAt: String
    respondedAt: String
    respondedBy: User
    canChangePassword: Boolean!
    passwordChangedAt: String
  }

  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    phone: String
    address: String
    status: String!
    companyId: String
    company: Company
    salesPersonId: String
    dateOfBirth: String
    photo: String
    about: String
    createdByAdminId: ID
    createdByAdmin: User
    passwordChangeRequest: PasswordChangeRequest
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    getUsers: [User!]!
    getUser(id: ID!): User
    getCurrentUser: User
    getCustomers: [User!]!
    getSalesPersons: [User!]!
    getSalesPerson(id: ID!): User
    getSalesPersonByEmail(email: String!): User
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    register(
      name: String!
      email: String!
      password: String!
      role: String!
      phone: String
      address: String
    ): AuthPayload!
    createUser(
      name: String!
      email: String!
      password: String!
      role: String!
      phone: String
      address: String
      companyId: ID
      salesPersonId: String
      dateOfBirth: String
      photo: String
      about: String
    ): User!
    updateUser(
      id: ID!
      name: String
      email: String
      password: String
      role: String
      phone: String
      address: String
      status: String
      companyId: ID
      salesPersonId: String
      dateOfBirth: String
      photo: String
      about: String
    ): User!
    deleteUser(id: ID!): DeleteResponse!
    fixSalesPersonCompanyLinks: FixResult!
    requestPasswordChange: RequestResponse!
    respondToPasswordChangeRequest(userId: ID!, action: String!): RequestResponse!
    updatePasswordWithApproval(oldPassword: String!, newPassword: String!): RequestResponse!
    changeSalesPassword(newPassword: String!): RequestResponse!
    changeCustomerPassword(oldPassword: String!, newPassword: String!): RequestResponse!
  }

  type DeleteResponse {
    success: Boolean!
    message: String!
  }

  type RequestResponse {
    success: Boolean!
    message: String!
    user: User
  }

  type FixResult {
    success: Boolean!
    message: String!
    fixed: Int!
    details: [String!]!
  }
`;


