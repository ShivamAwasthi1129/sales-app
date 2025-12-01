import { gql } from 'graphql-tag';

export const invoiceTypeDefs = gql`
  type InvoiceBillParty {
    businessName: String!
    email: String!
    phone: String
    address: String
    country: String
  }

  type InvoiceLineItem {
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
    selectedOptions: [SelectedOption!]
  }

  type Invoice {
    id: ID!
    invoiceNo: String!
    quotationId: ID!
    quotationNo: String!
    companyId: ID!
    customerId: ID!
    invoiceDate: String!
    dueDate: String
    billTo: InvoiceBillParty!
    billFrom: InvoiceBillParty!
    lineItems: [InvoiceLineItem!]!
    currency: String!
    subtotal: Float!
    taxRate: Float
    totalTax: Float!
    discount: Float!
    totalAmount: Float!
    paymentStatus: String!
    paymentMethod: String
    paymentDate: String
    paymentTransactionId: String
    notes: String
    terms: String
    status: String!
    pdfUrl: String
    createdBy: ID
    createdAt: String!
    updatedAt: String!
  }

  extend type Query {
    getInvoices: [Invoice!]!
    getInvoice(id: ID!): Invoice
    getInvoiceByQuotation(quotationId: ID!): Invoice
  }

  extend type Mutation {
    createPaymentLinkForQuotation(quotationId: ID!): String!
  }
`;

