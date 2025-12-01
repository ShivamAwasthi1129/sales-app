import { gql } from 'graphql-tag';

export const quotationTypeDefs = gql`
  type SelectedOption {
    attributeName: String
    optionLabel: String
    optionValue: String
    price: Float
  }

  type SubscriptionDetails {
    billingType: String
    interval: String
    intervalCount: Int
  }

  type QuotationLineItem {
    id: ID!
    productId: ID
    itemName: String!
    description: String
    imageUrl: String
    quantity: Int!
    rate: Float!
    amount: Float!
    total: Float!
    isSubscription: Boolean
    subscriptionDetails: SubscriptionDetails
    subscriptionPrice: Float
    selectedOptions: [SelectedOption!]
  }

  type QuotationParty {
    country: String
    businessName: String!
    phone: String
    address: String
    email: String
    salesPersonName: String
    salesPersonId: String
  }

  type PaymentInfo {
    sessionId: String
    paymentStatus: String
    paymentLink: String
    paymentMethod: String
    amount: Float
    currency: String
    customerEmail: String
    paymentMode: String
    subscriptionId: String
    paidAt: String
  }

  type Quotation {
    id: ID!
    quotationNo: String!
    quotationDate: String!
    dueDate: String
    from: QuotationParty!
    to: QuotationParty!
    currency: String!
    lineItems: [QuotationLineItem!]!
    subtotal: Float!
    totalTax: Float!
    couponCode: String
    couponDiscount: Float
    totalAmount: Float!
    notes: String
    terms: String
    businessLogo: String
    status: String!
    payment: PaymentInfo
    invoiceNo: String
    invoiceId: ID
    createdBy: ID
    clientId: ID
    companyId: ID
    createdAt: String!
    updatedAt: String!
  }

  input SelectedOptionInput {
    attributeName: String
    optionLabel: String
    optionValue: String
    price: Float
  }

  input SubscriptionDetailsInput {
    billingType: String
    interval: String
    intervalCount: Int
  }

  input QuotationLineItemInput {
    id: ID
    productId: ID
    itemName: String!
    description: String
    imageUrl: String
    quantity: Int!
    rate: Float!
    amount: Float!
    total: Float!
    isSubscription: Boolean
    subscriptionDetails: SubscriptionDetailsInput
    subscriptionPrice: Float
    selectedOptions: [SelectedOptionInput!]
  }

  input QuotationPartyInput {
    country: String
    businessName: String!
    phone: String
    address: String
    email: String
    salesPersonName: String
    salesPersonId: String
  }

  input QuotationInput {
    quotationNo: String
    quotationDate: String
    dueDate: String
    from: QuotationPartyInput!
    to: QuotationPartyInput!
    currency: String!
    lineItems: [QuotationLineItemInput!]!
    subtotal: Float!
    totalTax: Float!
    couponCode: String
    couponDiscount: Float
    totalAmount: Float!
    notes: String
    terms: String
    businessLogo: String
    status: String
    clientId: ID
  }

  type ChangeDetail {
    field: String!
    oldValue: String
    newValue: String
    changeType: String!
  }

  type LineItemChange {
    itemId: String
    changeType: String!
    oldItem: QuotationLineItem
    newItem: QuotationLineItem
  }

  type QuotationChangeUser {
    id: ID!
    email: String
    name: String
  }

  type QuotationChange {
    id: ID!
    quotationId: ID!
    version: Int!
    changedBy: QuotationChangeUser
    changeType: String!
    changes: [ChangeDetail!]!
    lineItemChanges: [LineItemChange!]!
    summary: String
    createdAt: String!
  }

  type QuotationStatusHistory {
    id: ID!
    quotationId: ID!
    status: String!
    updateType: String
    changedBy: QuotationChangeUser
    changedByEmail: String
    changedByName: String
    changedByRole: String
    reason: String
    notes: String
    quotationSnapshot: String
    createdAt: String!
    updatedAt: String!
  }

  type QuotationWithStatusHistory {
    quotation: Quotation!
    statusHistory: [QuotationStatusHistory!]!
  }

  extend type Query {
    getQuotations: [Quotation!]!
    getQuotation(id: ID!): Quotation
    getQuotationByNo(quotationNo: String!): Quotation
    getQuotationChanges(quotationId: ID!): [QuotationChange!]!
    getQuotationStatusHistory(quotationId: ID!): [QuotationStatusHistory!]!
    getQuotationsWithStatusHistory: [QuotationWithStatusHistory!]!
  }

  input PaymentInfoInput {
    sessionId: String
    paymentStatus: String
    amount: Float
    currency: String
    customerEmail: String
    paymentMode: String
    subscriptionId: String
    paidAt: String
  }

  type MigrationResult {
    success: Boolean!
    message: String!
    updated: Int
    failed: Int
    synced: Int
    errors: [String!]
  }

  extend type Mutation {
    createQuotation(input: QuotationInput!, sendEmail: Boolean): Quotation!
    updateQuotation(id: ID!, input: QuotationInput!, sendEmail: Boolean): Quotation!
    deleteQuotation(id: ID!): DeleteResponse!
    updateQuotationStatus(id: ID!, status: String!): Quotation!
    updateQuotationPayment(id: ID!, payment: PaymentInfoInput!, status: String): Quotation!
    migrateQuotationCompanyIds: MigrationResult!
  }
`;

