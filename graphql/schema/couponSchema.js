import { gql } from 'graphql-tag';

export const couponTypeDefs = gql`
  type Coupon {
    id: ID!
    code: String!
    type: String!
    name: String!
    description: String
    discountType: String!
    discountValue: Float!
    minPurchase: Float
    maxDiscount: Float
    validFrom: String!
    validTo: String!
    usageLimit: Int
    usedCount: Int!
    status: String!
    applicableTo: String!
    applicableProductIds: [ID!]!
    applicableGroupIds: [ID!]!
    companyId: ID!
    createdBy: ID
    createdAt: String!
    updatedAt: String!
  }

  input CouponInput {
    code: String!
    type: String!
    name: String!
    description: String
    discountType: String!
    discountValue: Float!
    minPurchase: Float
    maxDiscount: Float
    validFrom: String!
    validTo: String!
    usageLimit: Int
    status: String
    applicableTo: String
    applicableProductIds: [ID!]
    applicableGroupIds: [ID!]
    companyId: ID
  }

  type CouponValidation {
    valid: Boolean!
    error: String
    discount: Float
    discountType: String
    discountValue: Float
    coupon: Coupon
  }

  extend type Query {
    getCoupons(type: String): [Coupon!]!
    getCoupon(id: ID!): Coupon
    getCouponByCode(code: String!): Coupon
    getAvailableCoupons(subtotal: Float!, productIds: [ID!], groupIds: [ID!]): [Coupon!]!
    validateCoupon(code: String!, subtotal: Float!, productIds: [ID!], groupIds: [ID!]): CouponValidation!
  }

  extend type Mutation {
    createCoupon(input: CouponInput!): Coupon!
    updateCoupon(id: ID!, input: CouponInput!): Coupon!
    deleteCoupon(id: ID!): DeleteResponse!
    incrementCouponUsage(id: ID!): Coupon!
  }
`;

