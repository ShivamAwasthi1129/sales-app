import { gql } from 'graphql-tag';

export const invoiceTypeDefs = gql`
  type InvoiceLineItem {
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
    selectedOptions: [SelectedOption!]
  }

  type InvoiceParty {
    businessName: String!
    email: String!
    phone: String
    address: String
    country: String
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
    billTo: InvoiceParty!
    billFrom: InvoiceParty!
    lineItems: [InvoiceLineItem!]!
    currency: String!
    subtotal: Float!
    taxRate: Float
    totalTax: Float
    discount: Float
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

  type Query {
    getInvoices: [Invoice!]!
    getInvoice(id: ID!): Invoice
    getInvoiceByQuotation(quotationId: ID!): Invoice
  }
`;
