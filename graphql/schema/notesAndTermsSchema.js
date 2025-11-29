import { gql } from 'graphql-tag';

export const notesAndTermsTypeDefs = gql`
  type NotesAndTerms {
    id: ID!
    companyId: ID!
    company: Company
    notesToClient: String!
    termsAndConditions: String!
    createdBy: ID
    updatedBy: ID
    createdAt: String!
    updatedAt: String!
  }

  input NotesAndTermsInput {
    notesToClient: String
    termsAndConditions: String
  }

  extend type Query {
    getNotesAndTerms(companyId: ID!): NotesAndTerms
    getAllNotesAndTerms: [NotesAndTerms!]!
  }

  extend type Mutation {
    createNotesAndTerms(companyId: ID!, input: NotesAndTermsInput!): NotesAndTerms!
    updateNotesAndTerms(companyId: ID!, input: NotesAndTermsInput!): NotesAndTerms!
    deleteNotesAndTerms(companyId: ID!): DeleteResponse!
  }
`;

