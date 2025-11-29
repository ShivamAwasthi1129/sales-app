import { gql } from 'graphql-tag';

export const salesPersonTypeDefs = gql`
  type SalesPerson {
    id: ID!
    name: String!
    dateOfBirth: String!
    phone: String!
    email: String!
    salesPersonId: String!
    role: String!
    about: String
    companyName: String!
    address: String!
    photo: String
    status: String!
    createdBy: User
    createdByAdminId: ID
    createdByAdmin: User
    companyId: ID
    createdAt: String!
    updatedAt: String!
  }

  input SalesPersonInput {
    name: String!
    dateOfBirth: String!
    phone: String!
    email: String!
    password: String
    salesPersonId: String
    role: String!
    about: String
    companyName: String!
    address: String!
    photo: String
    status: String
  }

  type SalesPersonAuthPayload {
    token: String!
    salesPerson: SalesPerson!
  }

  extend type Query {
    getSalesPersons: [SalesPerson!]!
    getSalesPerson(id: ID!): SalesPerson
    getSalesPersonByEmail(email: String!): SalesPerson
    getCurrentSalesPerson: SalesPerson
  }

  extend type Mutation {
    createSalesPerson(input: SalesPersonInput!): SalesPerson!
    updateSalesPerson(id: ID!, input: SalesPersonInput!): SalesPerson!
    deleteSalesPerson(id: ID!): DeleteResponse!
    salesPersonLogin(email: String!, password: String!): SalesPersonAuthPayload!
  }
`;

