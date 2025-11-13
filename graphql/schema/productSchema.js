import { gql } from 'graphql-tag';

export const productTypeDefs = gql`
  type Group {
    id: ID!
    name: String!
    slug: String!
    description: String
    status: String!
    order: Int
    createdBy: ID
    createdAt: String!
    updatedAt: String!
  }

  type Price {
    id: ID!
    productId: ID
    amount: Float!
    currency: String!
    billingType: String!
    interval: String
    intervalCount: Int
    stripePriceId: String
    nickname: String
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type AttributeOption {
    id: ID!
    label: String!
    value: String!
    description: String
    price: Price!
    defaultSelected: Boolean!
    order: Int
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type Attribute {
    id: ID!
    name: String!
    description: String
    uiType: String!
    isMandatory: Boolean!
    options: [AttributeOption!]!
    order: Int
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type Product {
    id: ID!
    name: String!
    description: String
    image: String
    imageUrl: String
    groupId: ID!
    group: Group
    attributes: [Attribute!]!
    basePrice: Price
    discount: Float
    billingMode: String
    stripeProductId: String
    status: String!
    tags: [String!]!
    createdBy: ID
    createdAt: String!
    updatedAt: String!
  }

  # Input types for creating/updating
  input PriceInput {
    amount: Float!
    currency: String
    billingType: String!
    interval: String
    intervalCount: Int
    nickname: String
  }

  input AttributeOptionInput {
    label: String!
    value: String!
    description: String
    price: PriceInput!
    defaultSelected: Boolean
    order: Int
  }

  input AttributeInput {
    name: String!
    description: String
    uiType: String!
    isMandatory: Boolean
    options: [AttributeOptionInput!]!
    order: Int
  }

  input ProductInput {
    name: String!
    description: String
    imageUrl: String
    groupId: ID!
    basePrice: PriceInput
    discount: Float
    billingMode: String
    attributes: [AttributeInput!]!
    tags: [String!]
  }

  type Query {
    getProducts: [Product!]!
    getProduct(id: ID!): Product
    getGroups: [Group!]!
    getGroup(id: ID!): Group
    getAttributes: [Attribute!]!
    getAttribute(id: ID!): Attribute
    getPrices: [Price!]!
    getPrice(id: ID!): Price
  }

  type Mutation {
    createGroup(name: String!, slug: String, description: String): Group!
    updateGroup(id: ID!, name: String, slug: String, description: String, status: String, order: Int): Group!
    deleteGroup(id: ID!): DeleteResponse!

    createAttribute(input: AttributeInput!): Attribute!
    updateAttribute(id: ID!, input: AttributeInput!): Attribute!
    deleteAttribute(id: ID!): DeleteResponse!

    createPrice(input: PriceInput!, productId: ID): Price!
    updatePrice(id: ID!, input: PriceInput!): Price!
    deletePrice(id: ID!): DeleteResponse!

    createProduct(input: ProductInput!): Product!
    updateProduct(id: ID!, input: ProductInput!): Product!
    deleteProduct(id: ID!): DeleteResponse!
  }
`;

