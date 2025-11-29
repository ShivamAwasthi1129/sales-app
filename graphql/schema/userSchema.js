import { gql } from 'graphql-tag';

export const userTypeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    phone: String
    address: String
    status: String!
    companyId: String
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
    ): User!
    deleteUser(id: ID!): DeleteResponse!
  }

  type DeleteResponse {
    success: Boolean!
    message: String!
  }
`;


