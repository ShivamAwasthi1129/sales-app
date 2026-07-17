import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import local logic and models
import connectDB from './lib/mongodb.js';
import Product from './models/Product.js';
import User from './models/User.js';
import Company from './models/Company.js';
import Quotation from './models/Quotation.js';
import Invoice from './models/Invoice.js';
import Subscription from './models/Subscription.js';
import Plan from './models/Plan.js';
import Coupon from './models/Coupon.js';
import Group from './models/Group.js';
import Attribute from './models/Attribute.js';
import AttributeOption from './models/AttributeOption.js';
import Price from './models/Price.js';
import NotesAndTerms from './models/NotesAndTerms.js';
import TaxRate from './models/TaxRate.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// ─── Role Permission Matrix ───────────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  'Super Admin': [
    'login',
    // Read
    'get_products', 'get_users', 'get_companies', 'get_quotations', 'get_invoices',
    'get_subscriptions', 'get_plans', 'get_coupons', 'get_dashboard_stats',
    'get_groups', 'get_attributes', 'get_attribute_options', 'get_prices',
    'get_tax_rates', 'get_notes_and_terms',
    // Product CRUD
    'create_product', 'update_product', 'delete_product',
    // User CRUD
    'create_user', 'update_user', 'delete_user',
    // Company CRUD
    'create_company', 'update_company', 'delete_company',
    // Quotation CRUD
    'create_quotation', 'update_quotation', 'delete_quotation',
    // Invoice CRUD
    'create_invoice', 'update_invoice', 'delete_invoice',
    // Subscription CRUD
    'create_subscription', 'update_subscription', 'delete_subscription',
    // Plan CRUD
    'create_plan', 'update_plan', 'delete_plan',
    // Coupon CRUD
    'create_coupon', 'update_coupon', 'delete_coupon',
    // Group CRUD
    'create_group', 'update_group', 'delete_group',
    // Attribute CRUD
    'create_attribute', 'update_attribute', 'delete_attribute',
    // AttributeOption CRUD
    'create_attribute_option', 'update_attribute_option', 'delete_attribute_option',
    // Price CRUD
    'create_price', 'update_price', 'delete_price',
    // TaxRate CRUD
    'create_tax_rate', 'update_tax_rate', 'delete_tax_rate',
    // NotesAndTerms
    'update_notes_and_terms',
  ],
  'Admin': [
    'login',
    'get_products', 'get_users', 'get_companies', 'get_quotations', 'get_invoices',
    'get_subscriptions', 'get_plans', 'get_coupons', 'get_dashboard_stats',
    'get_groups', 'get_attributes', 'get_attribute_options', 'get_prices',
    'get_tax_rates', 'get_notes_and_terms',
    'create_product', 'update_product', 'delete_product',
    'create_user', 'update_user', 'delete_user',
    'create_quotation', 'update_quotation', 'delete_quotation',
    'create_invoice', 'update_invoice', 'delete_invoice',
    'create_coupon', 'update_coupon', 'delete_coupon',
    'create_group', 'update_group', 'delete_group',
    'create_attribute', 'update_attribute', 'delete_attribute',
    'create_attribute_option', 'update_attribute_option', 'delete_attribute_option',
    'create_price', 'update_price', 'delete_price',
    'create_tax_rate', 'update_tax_rate', 'delete_tax_rate',
    'update_notes_and_terms',
  ],
  'Sales Person': [
    'login',
    'get_products', 'get_users', 'get_quotations', 'get_invoices',
    'get_dashboard_stats', 'get_groups', 'get_attributes', 'get_attribute_options', 'get_prices',
    'create_quotation', 'update_quotation', 'delete_quotation',
    'create_invoice', 'update_invoice', 'delete_invoice',
  ],
  'Customer': [
    'login', 'get_products', 'get_quotations', 'get_invoices', 'get_subscriptions',
    'get_dashboard_stats',
  ],
};

function hasPermission(role, toolName) {
  if (toolName === 'login') return true;
  return (ROLE_PERMISSIONS[role] || []).includes(toolName);
}

// ─── UI Modules Configuration ────────────────────────────────────────────────
// Maps backend permissions to UI Action Chips displayed in the chat interface
const UI_MODULES = [
  { id: 'dashboard', permission: 'get_dashboard_stats', label: 'Dashboard', prompt: 'Show my dashboard summary', icon: 'BarChart2' },
  { id: 'products', permission: 'get_products', label: 'Products', prompt: 'Show all products', icon: 'Package' },
  { id: 'users', permission: 'get_users', label: 'Users', prompt: 'List all users', icon: 'Users' },
  { id: 'companies', permission: 'get_companies', label: 'Companies', prompt: 'Show all companies', icon: 'Building2' },
  { id: 'quotations', permission: 'get_quotations', label: 'Quotations', prompt: 'Fetch all quotations', icon: 'FileText' },
  { id: 'invoices', permission: 'get_invoices', label: 'Invoices', prompt: 'Show all invoices', icon: 'Receipt' },
  { id: 'subscriptions', permission: 'get_subscriptions', label: 'Subscriptions', prompt: 'List all subscriptions', icon: 'RefreshCcw' },
  { id: 'plans', permission: 'get_plans', label: 'Plans', prompt: 'Show pricing plans', icon: 'Tag' },
  { id: 'coupons', permission: 'get_coupons', label: 'Coupons', prompt: 'Show all coupons', icon: 'Ticket' },
  { id: 'groups', permission: 'get_groups', label: 'Groups', prompt: 'List product groups', icon: 'Database' },
  { id: 'attributes', permission: 'get_attributes', label: 'Attributes', prompt: 'Show all attributes', icon: 'Database' },
  { id: 'options', permission: 'get_attribute_options', label: 'Options', prompt: 'Show attribute options', icon: 'Database' },
  { id: 'prices', permission: 'get_prices', label: 'Prices', prompt: 'Show pricing list', icon: 'Tag' },
  { id: 'tax_rates', permission: 'get_tax_rates', label: 'Tax Rates', prompt: 'Show tax rates', icon: 'FileText' },
  { id: 'notes', permission: 'get_notes_and_terms', label: 'Notes & Terms', prompt: 'Show notes and terms', icon: 'FileText' }
];

// Helper to tokenize a search string into key terms to support multi-word fuzzy matches
function getFuzzyRegexes(str) {
  if (!str) return [];
  // Clean parentheses and common punctuation
  const clean = str.replace(/[()\[\]{}!?,.;:\-+\/]/g, ' ').trim();
  // Filter out short terms
  let words = clean.split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) {
    words = clean.split(/\s+/).filter(w => w.length > 0);
  }
  if (words.length === 0) return [new RegExp(str, 'i')];
  // Sort by length desc so we check most unique/longest terms first
  words.sort((a, b) => b.length - a.length);
  return words.map(w => new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
}

// ─── Helper: Resolve human-readable name to ObjectId ──────────────────────────
async function resolveToId(Model, query, errorMsg) {
  if (typeof query === 'string' && mongoose.Types.ObjectId.isValid(query)) return query;
  
  let doc = null;
  
  // Helper to strip regex boundaries for fuzzy checks
  const cleanRegexSource = (rx) => rx instanceof RegExp ? rx.source.replace(/^\^/, '').replace(/\$$/, '') : String(rx);

  if (typeof query === 'string') {
    const cleanStr = query.trim();
    const escaped = cleanStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // 1. Exact match first
    doc = await Model.findOne({ name: new RegExp('^' + escaped + '$', 'i') }).lean();
    if (!doc && Model === Price) {
      doc = await Model.findOne({ nickname: new RegExp('^' + escaped + '$', 'i') }).lean();
    }
    
    // 2. Substring match (fuzzy)
    if (!doc) {
      doc = await Model.findOne({ name: new RegExp(escaped, 'i') }).lean();
    }
    if (!doc && Model === Price) {
      doc = await Model.findOne({ nickname: new RegExp(escaped, 'i') }).lean();
    }

    // 3. Tokenized word-by-word matching fallback
    if (!doc) {
      const rxes = getFuzzyRegexes(cleanStr);
      for (const rx of rxes) {
        doc = await Model.findOne({ name: rx }).lean();
        if (doc) break;
        if (Model === Price) {
          doc = await Model.findOne({ nickname: rx }).lean();
          if (doc) break;
        }
      }
    }
  } else if (query && typeof query === 'object') {
    // 1. Exact query match
    doc = await Model.findOne(query).lean();
    
    // 2. If not found, build a fuzzy fallback query
    if (!doc) {
      const fuzzyQuery = {};
      let searchVal = '';
      for (const [k, v] of Object.entries(query)) {
        if (v instanceof RegExp) {
          searchVal = cleanRegexSource(v);
          fuzzyQuery[k] = new RegExp(searchVal, 'i'); // Substring match
        } else {
          fuzzyQuery[k] = v;
        }
      }
      
      doc = await Model.findOne(fuzzyQuery).lean();
      
      // 3. For Price model, if lookup by nickname failed, fallback to name or vice versa
      if (!doc && Model === Price) {
        if (query.nickname) {
          const nicknameVal = cleanRegexSource(query.nickname);
          doc = await Model.findOne({ nickname: new RegExp(nicknameVal, 'i') }).lean();
        }
      }

      // 4. Tokenized word-by-word fallback matching on the query string
      if (!doc && searchVal) {
        const rxes = getFuzzyRegexes(searchVal);
        for (const rx of rxes) {
          const tokenQuery = {};
          for (const [k, v] of Object.entries(query)) {
            if (v instanceof RegExp) {
              tokenQuery[k] = rx;
            } else {
              tokenQuery[k] = v;
            }
          }
          doc = await Model.findOne(tokenQuery).lean();
          if (doc) break;
          
          if (!doc && Model === Price && (query.nickname || query.name)) {
            doc = await Model.findOne({ nickname: rx }).lean();
            if (doc) break;
          }
        }
      }
    }
  }

  if (doc) return doc._id;
  throw new Error(errorMsg);
}

// ─── Helper: Resolve an array of names/IDs to ObjectIds ───────────────────────
async function resolveArrayToIds(Model, items, fieldName) {
  if (!items || !Array.isArray(items)) return items;
  const resolved = [];
  
  for (const item of items) {
    const cleanItem = String(item).trim();
    if (mongoose.Types.ObjectId.isValid(cleanItem)) {
      resolved.push(new mongoose.Types.ObjectId(cleanItem));
    } else {
      const escaped = cleanItem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // 1. Try finding in the target model (exact match)
      let doc = await Model.findOne({ name: new RegExp('^' + escaped + '$', 'i') }).lean();
      
      // 2. Try finding in the target model (fuzzy match)
      if (!doc) {
        doc = await Model.findOne({ name: new RegExp(escaped, 'i') }).lean();
      }

      // 3. Tokenized word-by-word fallback matching
      if (!doc) {
        const rxes = getFuzzyRegexes(cleanItem);
        for (const rx of rxes) {
          doc = await Model.findOne({ name: rx }).lean();
          if (doc) break;
        }
      }
      
      if (doc) {
        resolved.push(doc._id);
      } else if (Model === Attribute) {
        // 4. If target is Attribute and not found, try searching in AttributeOption labels
        let opt = await AttributeOption.findOne({ label: new RegExp('^' + escaped + '$', 'i') }).lean();
        if (!opt) {
          opt = await AttributeOption.findOne({ label: new RegExp(escaped, 'i') }).lean();
        }
        if (!opt) {
          const rxes = getFuzzyRegexes(cleanItem);
          for (const rx of rxes) {
            opt = await AttributeOption.findOne({ label: rx }).lean();
            if (opt) break;
          }
        }
        
        if (opt) {
          // Find the parent Attribute that references this option
          const parentAttr = await Attribute.findOne({ options: opt._id }).lean();
          if (parentAttr) {
            resolved.push(parentAttr._id);
          } else {
            throw new Error(`Could not find parent Attribute for option "${cleanItem}".`);
          }
        } else {
          throw new Error(`Could not resolve attribute or option name "${cleanItem}". Use get_attributes to see options.`);
        }
      } else {
        throw new Error(`Could not resolve ${fieldName} "${cleanItem}".`);
      }
    }
  }
  
  // Deduplicate ObjectIds
  const uniqueStrIds = [...new Set(resolved.map(id => id.toString()))];
  return uniqueStrIds.map(id => new mongoose.Types.ObjectId(id));
}

// ─── Helper: Clean data (remove userContext, undefined values) ─────────────────
function cleanData(args) {
  const data = { ...args };
  delete data.userContext;
  // Remove undefined/null string values that would cause cast errors
  for (const key of Object.keys(data)) {
    if (data[key] === undefined || data[key] === '') delete data[key];
  }
  return data;
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────
function createMCPServer() {
  const mcpServer = new Server(
    { name: 'sales-app-mcp', version: '3.0.0' },
    { capabilities: { tools: {} } }
  );

  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // ════════════════════════════════════════════════════════════════════════
        // LOGIN
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'login',
          description: 'Authenticate a user with email and password. Returns user profile with role and companyId.',
          inputSchema: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              password: { type: 'string' }
            },
            required: ['email', 'password']
          },
        },

        // ════════════════════════════════════════════════════════════════════════
        // READ (GET) TOOLS
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'get_products',
          description: 'Fetch products. Filtered by company for Admin/Sales Person/Customer. Super Admin sees all.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: ['userContext'] },
        },
        {
          name: 'get_users',
          description: 'Fetch users. Admin sees company users only. Super Admin sees all.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: ['userContext'] },
        },
        {
          name: 'get_companies',
          description: 'Fetch companies. Super Admin sees all. Admin sees their own company.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: ['userContext'] },
        },
        {
          name: 'get_quotations',
          description: 'Fetch quotations. Admin=company, Sales Person=own, Customer=own.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: ['userContext'] },
        },
        {
          name: 'get_invoices',
          description: 'Fetch invoices. Admin/Sales=company, Customer=own.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: ['userContext'] },
        },
        {
          name: 'get_subscriptions',
          description: 'Fetch subscriptions.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: ['userContext'] },
        },
        {
          name: 'get_plans',
          description: 'Fetch pricing plans.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: ['userContext'] },
        },
        {
          name: 'get_coupons',
          description: 'Fetch coupons. Admin sees company coupons.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: ['userContext'] },
        },
        {
          name: 'get_dashboard_stats',
          description: 'Get summary statistics for the dashboard.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: ['userContext'] },
        },
        {
          name: 'get_groups',
          description: 'Fetch product groups for the current company. Returns name, slug, description, status.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: ['userContext'] },
        },
        {
          name: 'get_attributes',
          description: 'Fetch product attributes with their options populated. Returns name, uiType, isMandatory, options (with label, value, price).',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: ['userContext'] },
        },
        {
          name: 'get_attribute_options',
          description: 'Fetch attribute options. Returns label, value, description, price, defaultSelected, status.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: ['userContext'] },
        },
        {
          name: 'get_prices',
          description: 'Fetch prices. Returns nickname, amount, currency, billingType, interval.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: ['userContext'] },
        },
        {
          name: 'get_tax_rates',
          description: 'Fetch tax rates. Returns displayName, jurisdiction, percentage, inclusive.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: ['userContext'] },
        },
        {
          name: 'get_notes_and_terms',
          description: 'Fetch notes and terms for quotations/invoices.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: ['userContext'] },
        },

        // ════════════════════════════════════════════════════════════════════════
        // PRODUCT CRUD
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'create_product',
          description: `Create a new Product.
AI INSTRUCTION: Before calling this tool, FIRST silently call get_groups, get_attributes, and get_prices to get available options. Then present ALL fields below to the user in a single message. For groupId, show group names. For attributes, show attribute names (checkboxes). For basePrice, show price nicknames with amounts. The server auto-resolves names to IDs.
FIELDS: name (required), description, image (URL), groupId (required - group name), attributes (array of attribute names), basePrice (price nickname), discount (0-100), billingMode (subscription/one-time), tags (array of strings).`,
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              name: { type: 'string', description: 'Product name (required)' },
              description: { type: 'string', description: 'Product description' },
              image: { type: 'string', description: 'URL to product image' },
              groupId: { type: 'string', description: 'Group name or ObjectId (required). Use get_groups to see options.' },
              attributes: { type: 'array', items: { type: 'string' }, description: 'Array of attribute names or ObjectIds. Use get_attributes to see options.' },
              basePrice: { type: 'string', description: 'Price nickname or ObjectId. Use get_prices to see options.' },
              discount: { type: 'number', description: 'Discount percentage 0-100' },
              billingMode: { type: 'string', enum: ['subscription', 'one-time'], description: 'Billing mode' },
              tags: { type: 'array', items: { type: 'string' }, description: 'Tags array' }
            },
            required: ['userContext', 'name', 'groupId']
          }
        },
        {
          name: 'update_product',
          description: 'Update an existing Product. Pass only the fields you want to change inside updates. Names are auto-resolved to IDs.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              id: { type: 'string', description: 'Product ID to update' },
              updates: { type: 'object', description: 'Fields to update: name, description, image, groupId (name), attributes (names array), basePrice (nickname), discount, billingMode, tags' }
            },
            required: ['userContext', 'id', 'updates']
          }
        },
        {
          name: 'delete_product',
          description: 'Delete a Product by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['userContext', 'id'] }
        },

        // ════════════════════════════════════════════════════════════════════════
        // USER CRUD
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'create_user',
          description: `Create a new User.
AI INSTRUCTION: Present ALL fields to the user in one go.
FIELDS: name (required), email (required), password (required, min 6 chars), role (required: Admin, Customer, Sales Person), phone, address, status (Active/Inactive, default Active), dateOfBirth (for Sales Person), about (for Sales Person), photo (URL for Sales Person).`,
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              name: { type: 'string', description: 'Full name (required)' },
              email: { type: 'string', description: 'Email address (required)' },
              password: { type: 'string', description: 'Password, min 6 chars (required)' },
              role: { type: 'string', enum: ['Super Admin', 'Admin', 'Customer', 'Sales Person'], description: 'User role (required)' },
              phone: { type: 'string', description: 'Phone number' },
              address: { type: 'string', description: 'Address' },
              status: { type: 'string', enum: ['Active', 'Inactive'], description: 'Status (default Active)' },
              dateOfBirth: { type: 'string', description: 'Date of birth (ISO date, for Sales Person)' },
              about: { type: 'string', description: 'About info (for Sales Person)' },
              photo: { type: 'string', description: 'Photo URL (for Sales Person)' }
            },
            required: ['userContext', 'name', 'email', 'password', 'role']
          }
        },
        {
          name: 'update_user',
          description: 'Update a User. Pass only fields to change in updates. Cannot change password via update.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['userContext', 'id', 'updates'] }
        },
        {
          name: 'delete_user',
          description: 'Delete a User by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['userContext', 'id'] }
        },

        // ════════════════════════════════════════════════════════════════════════
        // COMPANY CRUD
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'create_company',
          description: `Create a new Company.
AI INSTRUCTION: First call get_plans to show available plans. Present ALL fields.
FIELDS: name (required), email (required), phone, address, website, industry, planId (required - plan name, use get_plans), status (Active/Inactive/Suspended), description, logo (URL).`,
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              name: { type: 'string', description: 'Company name (required)' },
              email: { type: 'string', description: 'Company email (required)' },
              phone: { type: 'string', description: 'Phone number' },
              address: { type: 'string', description: 'Address' },
              website: { type: 'string', description: 'Website URL' },
              industry: { type: 'string', description: 'Industry type' },
              planId: { type: 'string', description: 'Plan name or ObjectId (required). Use get_plans to see options.' },
              status: { type: 'string', enum: ['Active', 'Inactive', 'Suspended'], description: 'Status (default Active)' },
              description: { type: 'string', description: 'Company description' },
              logo: { type: 'string', description: 'Logo URL' }
            },
            required: ['userContext', 'name', 'email', 'planId']
          }
        },
        {
          name: 'update_company',
          description: 'Update a Company.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['userContext', 'id', 'updates'] }
        },
        {
          name: 'delete_company',
          description: 'Delete a Company by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['userContext', 'id'] }
        },

        // ════════════════════════════════════════════════════════════════════════
        // QUOTATION CRUD
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'create_quotation',
          description: `Create a new Quotation. quotationNo is auto-generated.
AI INSTRUCTION: First call get_products and get_users to show available products/customers. Present ALL fields.
FIELDS: dueDate (ISO date), from { country, businessName, phone, address, email, salesPersonName, salesPersonId }, to { country, businessName, phone, address, email }, currency (required, default USD), lineItems (array of { productId (product name), itemName (required), description, quantity (required), rate (required), amount (required), total (required), isSubscription }), subtotal (required), totalAmount (required), notes, terms, status (draft/sent, default draft), couponCode.`,
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              dueDate: { type: 'string', description: 'Due date (ISO string)' },
              from: { type: 'object', description: '{ country, businessName, phone, address, email, salesPersonName, salesPersonId }' },
              to: { type: 'object', description: '{ country, businessName, phone, address, email }' },
              currency: { type: 'string', description: 'Currency code (default USD)' },
              lineItems: { type: 'array', items: { type: 'object' }, description: 'Array of line items with productId (name), itemName, quantity, rate, amount, total' },
              subtotal: { type: 'number', description: 'Subtotal (required)' },
              totalAmount: { type: 'number', description: 'Total amount (required)' },
              notes: { type: 'string', description: 'Notes to client' },
              terms: { type: 'string', description: 'Terms and conditions' },
              status: { type: 'string', enum: ['draft', 'sent'], description: 'Status (default draft)' },
              couponCode: { type: 'string', description: 'Coupon code to apply' }
            },
            required: ['userContext', 'currency', 'subtotal', 'totalAmount']
          }
        },
        {
          name: 'update_quotation',
          description: 'Update a Quotation.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['userContext', 'id', 'updates'] }
        },
        {
          name: 'delete_quotation',
          description: 'Delete a Quotation by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['userContext', 'id'] }
        },

        // ════════════════════════════════════════════════════════════════════════
        // INVOICE CRUD
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'create_invoice',
          description: `Create a new Invoice. invoiceNo is auto-generated if not provided.
AI INSTRUCTION: First call get_quotations and get_users. Present ALL fields.
FIELDS: invoiceNo (auto-generated if empty), quotationId (required - quotation number or ID), quotationNo (required), customerId (required - customer name or ID), dueDate, billTo { businessName (required), email (required), phone, address, country }, billFrom { businessName (required), email, phone, address, country }, lineItems (array of { productId (name), itemName (required), description, quantity, rate, amount, total, isSubscription }), currency (default USD), subtotal (required), totalAmount (required), taxRate, totalTax, discount, notes, terms, status (draft/sent/paid/cancelled/overdue).`,
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              invoiceNo: { type: 'string', description: 'Invoice number (auto-generated if not provided)' },
              quotationId: { type: 'string', description: 'Quotation number or ObjectId (required)' },
              quotationNo: { type: 'string', description: 'Quotation number string (required)' },
              customerId: { type: 'string', description: 'Customer name or ObjectId (required)' },
              dueDate: { type: 'string', description: 'Due date (ISO string)' },
              billTo: { type: 'object', description: '{ businessName (required), email (required), phone, address, country }' },
              billFrom: { type: 'object', description: '{ businessName (required), email, phone, address, country }' },
              lineItems: { type: 'array', items: { type: 'object' }, description: 'Line items array' },
              currency: { type: 'string', description: 'Currency (default USD)' },
              subtotal: { type: 'number', description: 'Subtotal (required)' },
              totalAmount: { type: 'number', description: 'Total amount (required)' },
              taxRate: { type: 'number', description: 'Tax rate percentage' },
              totalTax: { type: 'number', description: 'Total tax amount' },
              discount: { type: 'number', description: 'Discount amount' },
              notes: { type: 'string' },
              terms: { type: 'string' },
              status: { type: 'string', enum: ['draft', 'sent', 'paid', 'cancelled', 'overdue'] }
            },
            required: ['userContext', 'quotationId', 'quotationNo', 'customerId', 'billTo', 'billFrom', 'subtotal', 'totalAmount']
          }
        },
        {
          name: 'update_invoice',
          description: 'Update an Invoice.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['userContext', 'id', 'updates'] }
        },
        {
          name: 'delete_invoice',
          description: 'Delete an Invoice by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['userContext', 'id'] }
        },

        // ════════════════════════════════════════════════════════════════════════
        // SUBSCRIPTION CRUD
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'create_subscription',
          description: `Create a Subscription.
FIELDS: userId (required - user name or ID), productId (product name or ID), stripeSubscriptionId (required), stripeCustomerId (required), status (required: trialing/active/past_due/unpaid/canceled/incomplete/incomplete_expired), currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd.`,
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              userId: { type: 'string', description: 'User name or ObjectId (required)' },
              productId: { type: 'string', description: 'Product name or ObjectId' },
              stripeSubscriptionId: { type: 'string', description: 'Stripe subscription ID (required)' },
              stripeCustomerId: { type: 'string', description: 'Stripe customer ID (required)' },
              status: { type: 'string', enum: ['trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired'], description: 'Status (required)' },
              currentPeriodStart: { type: 'string', description: 'Period start (ISO date)' },
              currentPeriodEnd: { type: 'string', description: 'Period end (ISO date)' },
              cancelAtPeriodEnd: { type: 'boolean', description: 'Cancel at period end' }
            },
            required: ['userContext', 'userId', 'stripeSubscriptionId', 'stripeCustomerId', 'status']
          }
        },
        {
          name: 'update_subscription',
          description: 'Update a Subscription.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['userContext', 'id', 'updates'] }
        },
        {
          name: 'delete_subscription',
          description: 'Delete a Subscription by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['userContext', 'id'] }
        },

        // ════════════════════════════════════════════════════════════════════════
        // PLAN CRUD
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'create_plan',
          description: `Create a Pricing Plan (Super Admin only).
AI INSTRUCTION: Present ALL fields.
FIELDS: name (required), description, price (required, number), billingCycle (monthly/yearly/one-time, default monthly), usersLimit (required, number), salesPersonLimit (required, number), quotationLimit (required, number), features (array of { name, value, isIncluded }), status (Active/Inactive/Archived), isPopular (boolean), displayOrder (number).`,
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              name: { type: 'string', description: 'Plan name (required)' },
              description: { type: 'string', description: 'Plan description' },
              price: { type: 'number', description: 'Price amount (required)' },
              billingCycle: { type: 'string', enum: ['monthly', 'yearly', 'one-time'], description: 'Billing cycle (default monthly)' },
              usersLimit: { type: 'number', description: 'Max users allowed (required)' },
              salesPersonLimit: { type: 'number', description: 'Max sales persons (required)' },
              quotationLimit: { type: 'number', description: 'Max quotations (required)' },
              features: { type: 'array', items: { type: 'object' }, description: 'Features: [{ name, value, isIncluded }]' },
              status: { type: 'string', enum: ['Active', 'Inactive', 'Archived'], description: 'Status (default Active)' },
              isPopular: { type: 'boolean', description: 'Mark as popular plan' },
              displayOrder: { type: 'number', description: 'Display order (number)' }
            },
            required: ['userContext', 'name', 'price', 'usersLimit', 'salesPersonLimit', 'quotationLimit']
          }
        },
        {
          name: 'update_plan',
          description: 'Update a Plan.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['userContext', 'id', 'updates'] }
        },
        {
          name: 'delete_plan',
          description: 'Delete a Plan by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['userContext', 'id'] }
        },

        // ════════════════════════════════════════════════════════════════════════
        // COUPON CRUD
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'create_coupon',
          description: `Create a Coupon.
AI INSTRUCTION: Present ALL fields. If applicableTo is 'products', call get_products first. If 'groups', call get_groups first.
FIELDS: code (required, will be uppercased), type (required: discount_coupon/promo_code/group_discount/shipping_coupon/additional_discount), name (required), description, discountType (required: percentage/fixed), discountValue (required, number), minPurchase (number, default 0), maxDiscount (number), validFrom (ISO date, required), validTo (ISO date, required), usageLimit (number or null for unlimited), status (active/inactive/expired), applicableTo (all/products/groups), applicableProductIds (array of product names), applicableGroupIds (array of group names).`,
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              code: { type: 'string', description: 'Coupon code (required, auto-uppercased)' },
              type: { type: 'string', enum: ['discount_coupon', 'promo_code', 'group_discount', 'shipping_coupon', 'additional_discount'], description: 'Coupon type (required)' },
              name: { type: 'string', description: 'Coupon name (required)' },
              description: { type: 'string', description: 'Description' },
              discountType: { type: 'string', enum: ['percentage', 'fixed'], description: 'Discount type (required)' },
              discountValue: { type: 'number', description: 'Discount value (required)' },
              minPurchase: { type: 'number', description: 'Min purchase amount (default 0)' },
              maxDiscount: { type: 'number', description: 'Max discount cap' },
              validFrom: { type: 'string', description: 'Valid from date (ISO, required)' },
              validTo: { type: 'string', description: 'Valid to date (ISO, required)' },
              usageLimit: { type: 'number', description: 'Usage limit (null = unlimited)' },
              status: { type: 'string', enum: ['active', 'inactive', 'expired'], description: 'Status (default active)' },
              applicableTo: { type: 'string', enum: ['all', 'products', 'groups'], description: 'Applicable to (default all)' },
              applicableProductIds: { type: 'array', items: { type: 'string' }, description: 'Product names/IDs (when applicableTo=products)' },
              applicableGroupIds: { type: 'array', items: { type: 'string' }, description: 'Group names/IDs (when applicableTo=groups)' }
            },
            required: ['userContext', 'code', 'type', 'name', 'discountType', 'discountValue', 'validFrom', 'validTo']
          }
        },
        {
          name: 'update_coupon',
          description: 'Update a Coupon.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['userContext', 'id', 'updates'] }
        },
        {
          name: 'delete_coupon',
          description: 'Delete a Coupon by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['userContext', 'id'] }
        },

        // ════════════════════════════════════════════════════════════════════════
        // GROUP CRUD
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'create_group',
          description: `Create a Product Group. Slug is auto-generated from name.
FIELDS: name (required), slug (auto-generated from name if not provided), description, status (active/archived, default active).`,
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              name: { type: 'string', description: 'Group name (required)' },
              slug: { type: 'string', description: 'URL slug (auto-generated from name if not provided)' },
              description: { type: 'string', description: 'Group description' },
              status: { type: 'string', enum: ['active', 'archived'], description: 'Status (default active)' }
            },
            required: ['userContext', 'name']
          }
        },
        {
          name: 'update_group',
          description: 'Update a Group.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['userContext', 'id', 'updates'] }
        },
        {
          name: 'delete_group',
          description: 'Delete a Group by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['userContext', 'id'] }
        },

        // ════════════════════════════════════════════════════════════════════════
        // ATTRIBUTE CRUD
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'create_attribute',
          description: `Create a Product Attribute.
FIELDS: name (required, e.g. "Hosting Plan"), description, uiType (required: dropdown/checkbox/radio/slider/number_input), isMandatory (boolean, default false), order (number), status (active/archived).`,
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              name: { type: 'string', description: 'Attribute name (required)' },
              description: { type: 'string', description: 'Description' },
              uiType: { type: 'string', enum: ['dropdown', 'checkbox', 'radio', 'slider', 'number_input'], description: 'UI type (required)' },
              isMandatory: { type: 'boolean', description: 'Is mandatory (default false)' },
              order: { type: 'number', description: 'Display order' },
              status: { type: 'string', enum: ['active', 'archived'], description: 'Status (default active)' }
            },
            required: ['userContext', 'name', 'uiType']
          }
        },
        {
          name: 'update_attribute',
          description: 'Update an Attribute.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['userContext', 'id', 'updates'] }
        },
        {
          name: 'delete_attribute',
          description: 'Delete an Attribute by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['userContext', 'id'] }
        },

        // ════════════════════════════════════════════════════════════════════════
        // ATTRIBUTE OPTION CRUD
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'create_attribute_option',
          description: `Create an Attribute Option (a selectable choice within an attribute).
AI INSTRUCTION: First call get_prices to get available prices.
FIELDS: label (required, e.g. "E-commerce"), value (required, e.g. "ecom"), description, price (required - price nickname or ObjectId), defaultSelected (boolean), order (number), status (active/archived). After creating, link it to the parent attribute using update_attribute.`,
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              label: { type: 'string', description: 'Display label (required)' },
              value: { type: 'string', description: 'Internal value (required)' },
              description: { type: 'string', description: 'Description' },
              price: { type: 'string', description: 'Price nickname or ObjectId (required). Use get_prices to see options.' },
              defaultSelected: { type: 'boolean', description: 'Default selected (default false)' },
              order: { type: 'number', description: 'Display order' },
              status: { type: 'string', enum: ['active', 'archived'], description: 'Status (default active)' }
            },
            required: ['userContext', 'label', 'value', 'price']
          }
        },
        {
          name: 'update_attribute_option',
          description: 'Update an Attribute Option.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['userContext', 'id', 'updates'] }
        },
        {
          name: 'delete_attribute_option',
          description: 'Delete an Attribute Option by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['userContext', 'id'] }
        },

        // ════════════════════════════════════════════════════════════════════════
        // PRICE CRUD
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'create_price',
          description: `Create a Price record.
FIELDS: nickname (internal name, e.g. "Pro Plan Monthly"), amount (required, in smallest currency unit e.g. cents, so $29.99 = 2999), currency (required, default "usd"), billingType (required: one_time/recurring), interval (day/week/month/year - required if recurring), intervalCount (number, default 1), productId (product name or ID, optional), status (active/archived).`,
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              nickname: { type: 'string', description: 'Internal name (e.g. "Pro Monthly")' },
              amount: { type: 'number', description: 'Amount in smallest currency unit (required). $29.99 = 2999' },
              currency: { type: 'string', description: 'Currency code (default "usd")' },
              billingType: { type: 'string', enum: ['one_time', 'recurring'], description: 'Billing type (required)' },
              interval: { type: 'string', enum: ['day', 'week', 'month', 'year'], description: 'Interval (required if recurring)' },
              intervalCount: { type: 'number', description: 'Interval count (default 1)' },
              productId: { type: 'string', description: 'Product name or ObjectId (optional)' },
              status: { type: 'string', enum: ['active', 'archived'], description: 'Status (default active)' }
            },
            required: ['userContext', 'amount', 'billingType']
          }
        },
        {
          name: 'update_price',
          description: 'Update a Price.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['userContext', 'id', 'updates'] }
        },
        {
          name: 'delete_price',
          description: 'Delete a Price by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['userContext', 'id'] }
        },

        // ════════════════════════════════════════════════════════════════════════
        // TAX RATE CRUD
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'create_tax_rate',
          description: `Create a Tax Rate.
FIELDS: displayName (required, e.g. "VAT", "Sales Tax"), description, jurisdiction (required, e.g. "US", "DE"), percentage (required, 0-100), inclusive (boolean, default false), status (active/archived).`,
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              displayName: { type: 'string', description: 'Display name (required)' },
              description: { type: 'string' },
              jurisdiction: { type: 'string', description: 'Jurisdiction code (required)' },
              percentage: { type: 'number', description: 'Tax percentage 0-100 (required)' },
              inclusive: { type: 'boolean', description: 'Tax inclusive in price (default false)' },
              status: { type: 'string', enum: ['active', 'archived'] }
            },
            required: ['userContext', 'displayName', 'jurisdiction', 'percentage']
          }
        },
        {
          name: 'update_tax_rate',
          description: 'Update a Tax Rate.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['userContext', 'id', 'updates'] }
        },
        {
          name: 'delete_tax_rate',
          description: 'Delete a Tax Rate by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['userContext', 'id'] }
        },

        // ════════════════════════════════════════════════════════════════════════
        // NOTES AND TERMS
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'update_notes_and_terms',
          description: `Update or create Notes and Terms for quotations/invoices (one per company).
FIELDS: notesToClient (text), termsAndConditions (text).`,
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              notesToClient: { type: 'string', description: 'Notes to client' },
              termsAndConditions: { type: 'string', description: 'Terms and conditions' }
            },
            required: ['userContext']
          }
        },
      ],
    };
  });

  // ─── Tool Execution ─────────────────────────────────────────────────────────
  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    await connectDB();

    const ok = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data) }] });
    const err = (msg) => ({ content: [{ type: 'text', text: JSON.stringify({ error: msg }) }] });

    // ── LOGIN ────────────────────────────────────────────────────────────────
    if (name === 'login') {
      const { email, password } = args || {};
      const user = await User.findOne({ email: email?.toLowerCase() }).select('+password').lean();
      if (!user) return err('Invalid email or password');
      if (user.status !== 'Active') return err('Account is inactive. Please contact administrator.');

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return err('Invalid email or password');

      delete user.password;
      
      const allowedModules = UI_MODULES.filter(mod => hasPermission(user.role, mod.permission));

      return ok({
        success: true,
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId?.toString() || null,
          salesPersonId: user.salesPersonId || null,
          phone: user.phone || '',
          status: user.status,
        },
        allowedModules
      });
    }

    // ── All other tools require userContext ──────────────────────────────────
    const ctx = args?.userContext;
    if (!ctx || !ctx.role) return err('User context required. Please log in first.');
    if (!hasPermission(ctx.role, name)) return err(`Access denied. Your role (${ctx.role}) cannot perform: ${name}`);

    const userId = ctx._id || ctx.userId;
    const companyId = ctx.companyId;
    const role = ctx.role;

    // ── Mongoose error handler ──────────────────────────────────────────────
    const handleMongooseError = (e) => {
      if (e.name === 'ValidationError') {
        const messages = Object.values(e.errors).map(val => val.message);
        return err(`Validation Error: ${messages.join(', ')}`);
      }
      return err(e.message || 'Database error occurred');
    };

    // ── Generic CRUD helpers ────────────────────────────────────────────────
    const handleCreate = async (Model, data) => {
      try {
        const newRecord = await Model.create(data);
        return ok({ success: true, record: { ...newRecord.toObject(), _id: newRecord._id.toString() } });
      } catch (e) {
        return handleMongooseError(e);
      }
    };

    const handleUpdate = async (Model, id, updates) => {
      try {
        if (Model === User && updates.password) delete updates.password;
        const updatedRecord = await Model.findByIdAndUpdate(
          id, { $set: updates }, { new: true, runValidators: true }
        ).lean();
        if (!updatedRecord) return err('Record not found');
        return ok({ success: true, record: { ...updatedRecord, _id: updatedRecord._id.toString() } });
      } catch (e) {
        return handleMongooseError(e);
      }
    };

    const handleDelete = async (Model, id) => {
      try {
        const deleted = await Model.findByIdAndDelete(id);
        if (!deleted) return err('Record not found');
        return ok({ success: true, message: 'Record deleted successfully' });
      } catch (e) {
        return handleMongooseError(e);
      }
    };

    // ── Helper: resolve product-related ObjectIds ───────────────────────────
    const resolveProductRefs = async (data) => {
      if (data.groupId && !mongoose.Types.ObjectId.isValid(data.groupId)) {
        data.groupId = await resolveToId(Group, { name: new RegExp('^' + String(data.groupId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'), companyId: companyId ? new mongoose.Types.ObjectId(companyId) : undefined }, `Could not resolve group "${data.groupId}". Use get_groups to see available groups.`);
      }
      if (data.basePrice && !mongoose.Types.ObjectId.isValid(data.basePrice)) {
        data.basePrice = await resolveToId(Price, { nickname: new RegExp('^' + String(data.basePrice).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }, `Could not resolve price "${data.basePrice}". Use get_prices to see available prices.`);
      }
      if (data.attributes && Array.isArray(data.attributes)) {
        data.attributes = await resolveArrayToIds(Attribute, data.attributes, 'attribute');
      }
      return data;
    };

    // ── Helper: resolve line item productIds ─────────────────────────────────
    const resolveLineItems = async (items) => {
      if (!items || !Array.isArray(items)) return items;
      for (const item of items) {
        if (item.productId && !mongoose.Types.ObjectId.isValid(item.productId)) {
          try {
            item.productId = await resolveToId(Product, { name: new RegExp('^' + String(item.productId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'), companyId: companyId ? new mongoose.Types.ObjectId(companyId) : undefined }, `Could not resolve product "${item.productId}".`);
          } catch (e) {
            // If product can't be resolved, remove productId but keep the item
            delete item.productId;
          }
        }
      }
      return items;
    };

    // ── Helper: resolve company-related ObjectIds ───────────────────────────
    const resolveCompanyRefs = async (data) => {
      if (data.planId && !mongoose.Types.ObjectId.isValid(data.planId)) {
        data.planId = await resolveToId(Plan, { name: new RegExp('^' + String(data.planId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }, `Could not resolve plan "${data.planId}". Use get_plans to see available plans.`);
      }
      if (data.adminId && !mongoose.Types.ObjectId.isValid(data.adminId)) {
        data.adminId = await resolveToId(User, { name: new RegExp('^' + String(data.adminId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }, `Could not resolve admin "${data.adminId}".`);
      }
      if (data.adminIds && Array.isArray(data.adminIds)) {
        data.adminIds = await resolveArrayToIds(User, data.adminIds, 'admin');
      }
      return data;
    };

    // ── Helper: resolve quotation-related ObjectIds ─────────────────────────
    const resolveQuotationRefs = async (data) => {
      if (data.clientId && !mongoose.Types.ObjectId.isValid(data.clientId)) {
        data.clientId = await resolveToId(User, { name: new RegExp('^' + String(data.clientId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }, `Could not resolve client "${data.clientId}".`);
      }
      if (data.lineItems && Array.isArray(data.lineItems)) {
        data.lineItems = await resolveLineItems(data.lineItems);
      }
      if (data.from && data.from.salesPersonName && !data.from.salesPersonId) {
        try {
          data.from.salesPersonId = await resolveToId(User, { name: new RegExp('^' + String(data.from.salesPersonName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }, `Could not resolve salesperson.`);
        } catch (e) { /* ignore */ }
      }
      return data;
    };

    // ── Helper: resolve invoice-related ObjectIds ───────────────────────────
    const resolveInvoiceRefs = async (data) => {
      if (data.customerId && !mongoose.Types.ObjectId.isValid(data.customerId)) {
        data.customerId = await resolveToId(User, { name: new RegExp('^' + String(data.customerId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }, `Could not resolve customer "${data.customerId}".`);
      }
      if (data.quotationId && !mongoose.Types.ObjectId.isValid(data.quotationId)) {
        data.quotationId = await resolveToId(Quotation, { quotationNo: data.quotationId }, `Could not resolve quotation "${data.quotationId}".`);
      }
      if (data.lineItems && Array.isArray(data.lineItems)) {
        data.lineItems = await resolveLineItems(data.lineItems);
      }
      return data;
    };

    // ── Helper: resolve subscription-related ObjectIds ───────────────────────
    const resolveSubscriptionRefs = async (data) => {
      if (data.userId && !mongoose.Types.ObjectId.isValid(data.userId)) {
        data.userId = await resolveToId(User, { name: new RegExp('^' + String(data.userId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }, `Could not resolve user "${data.userId}".`);
      }
      if (data.productId && !mongoose.Types.ObjectId.isValid(data.productId)) {
        data.productId = await resolveToId(Product, { name: new RegExp('^' + String(data.productId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }, `Could not resolve product "${data.productId}".`);
      }
      return data;
    };

    // ── Helper: resolve price-related ObjectIds ──────────────────────────────
    const resolvePriceRefs = async (data) => {
      if (data.productId && !mongoose.Types.ObjectId.isValid(data.productId)) {
        data.productId = await resolveToId(Product, { name: new RegExp('^' + String(data.productId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }, `Could not resolve product "${data.productId}".`);
      }
      return data;
    };

    // ═════════════════════════════════════════════════════════════════════════
    // GET HANDLERS
    // ═════════════════════════════════════════════════════════════════════════

    // ── GET PRODUCTS ─────────────────────────────────────────────────────────
    if (name === 'get_products') {
      let query = {};
      if (role === 'Super Admin') {
        query = {};
      } else if (companyId) {
        query = { companyId: new mongoose.Types.ObjectId(companyId) };
      } else if (role === 'Sales Person' && userId) {
        const sp = await User.findById(userId).select('companyId').lean();
        if (sp?.companyId) query = { companyId: sp.companyId };
        else return ok([]);
      } else {
        return ok([]);
      }

      const products = await Product.find(query)
        .populate('groupId', 'name')
        .populate('basePrice', 'nickname amount currency billingType')
        .populate('attributes', 'name uiType')
        .sort({ createdAt: -1 }).limit(50).lean();

      return ok(products.map(p => ({
        _id: p._id.toString(),
        name: p.name,
        description: p.description,
        image: p.image || p.imageUrl,
        groupName: p.groupId?.name || null,
        groupId: p.groupId?._id?.toString() || null,
        attributes: (p.attributes || []).map(a => ({ _id: a._id?.toString(), name: a.name, uiType: a.uiType })),
        basePriceNickname: p.basePrice?.nickname || null,
        basePriceAmount: p.basePrice?.amount || null,
        basePriceCurrency: p.basePrice?.currency || null,
        discount: p.discount,
        billingMode: p.billingMode,
        tags: p.tags,
        companyId: p.companyId?.toString() || null,
        createdAt: p.createdAt?.toISOString(),
      })));
    }

    // ── GET USERS ────────────────────────────────────────────────────────────
    if (name === 'get_users') {
      let filter = {};
      if (role === 'Super Admin') filter = {};
      else if (role === 'Admin' && companyId) filter = { companyId: new mongoose.Types.ObjectId(companyId) };
      else if (role === 'Sales Person' && companyId) filter = { companyId: new mongoose.Types.ObjectId(companyId), role: { $in: ['Customer', 'Sales Person'] } };
      else return err(`Users list not accessible for role: ${role}`);

      const users = await User.find(filter).select('-password').sort({ createdAt: -1 }).limit(50).lean();
      return ok(users.map(u => ({
        ...u, _id: u._id.toString(),
        companyId: u.companyId?.toString() || null,
        createdAt: u.createdAt?.toISOString(),
        updatedAt: u.updatedAt?.toISOString(),
      })));
    }

    // ── GET COMPANIES ────────────────────────────────────────────────────────
    if (name === 'get_companies') {
      if (role === 'Super Admin') {
        const companies = await Company.find().populate('planId', 'name price').sort({ createdAt: -1 }).limit(50).lean();
        return ok(companies.map(c => ({
          ...c, _id: c._id.toString(),
          adminId: c.adminId?.toString() || null,
          planId: c.planId?._id?.toString() || null,
          planName: c.planId?.name || null,
          createdAt: c.createdAt?.toISOString(),
          updatedAt: c.updatedAt?.toISOString(),
        })));
      } else if (companyId) {
        const company = await Company.findById(companyId).populate('planId', 'name price').lean();
        if (!company) return ok([]);
        return ok([{
          ...company, _id: company._id.toString(),
          adminId: company.adminId?.toString() || null,
          planId: company.planId?._id?.toString() || null,
          planName: company.planId?.name || null,
          createdAt: company.createdAt?.toISOString(),
          updatedAt: company.updatedAt?.toISOString(),
        }]);
      } else {
        return err('Company information not available for your role.');
      }
    }

    // ── GET QUOTATIONS ───────────────────────────────────────────────────────
    if (name === 'get_quotations') {
      let filter = {};
      if (role === 'Super Admin') {
        filter = {};
      } else if (role === 'Admin' && companyId) {
        const companyUsers = await User.find({ companyId: new mongoose.Types.ObjectId(companyId) }).select('_id').lean();
        const userIds = companyUsers.map(u => u._id);
        filter = { $or: [{ companyId: new mongoose.Types.ObjectId(companyId) }, { $and: [{ $or: [{ companyId: { $exists: false } }, { companyId: null }] }, { createdBy: { $in: userIds } }] }] };
      } else if (role === 'Sales Person') {
        const sp = await User.findById(userId).lean();
        if (!sp) return ok([]);
        if (sp.companyId) {
          filter = { $and: [{ $or: [{ companyId: sp.companyId }, { companyId: { $exists: false } }, { companyId: null }] }, { $or: [{ createdBy: new mongoose.Types.ObjectId(userId) }, ...(sp.salesPersonId ? [{ 'from.salesPersonId': sp.salesPersonId }] : [])] }] };
        } else {
          filter = { createdBy: new mongoose.Types.ObjectId(userId) };
        }
      } else if (role === 'Customer') {
        const customer = await User.findById(userId).lean();
        if (!customer) return ok([]);
        filter = { $or: [{ 'to.email': { $regex: new RegExp(`^${customer.email?.toLowerCase()}$`, 'i') } }, { clientId: new mongoose.Types.ObjectId(userId) }] };
      } else {
        return err('Not authorized to view quotations.');
      }

      const quotations = await Quotation.find(filter).sort({ createdAt: -1 }).limit(50).lean();
      return ok(quotations.map(q => ({
        ...q, _id: q._id.toString(),
        companyId: q.companyId?.toString() || null,
        createdBy: q.createdBy?.toString() || null,
        createdAt: q.createdAt?.toISOString(),
        updatedAt: q.updatedAt?.toISOString(),
      })));
    }

    // ── GET INVOICES ─────────────────────────────────────────────────────────
    if (name === 'get_invoices') {
      let invoices = [];
      if (role === 'Super Admin') {
        invoices = await Invoice.find().sort({ createdAt: -1 }).limit(50).lean();
      } else if (role === 'Admin' || role === 'Sales Person') {
        const user = await User.findById(userId).lean();
        if (!user?.companyId) return err('Company not found for user.');
        invoices = await Invoice.find({ companyId: user.companyId }).sort({ createdAt: -1 }).limit(50).lean();
      } else if (role === 'Customer') {
        const customer = await User.findById(userId).lean();
        const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        invoices = await Invoice.find({
          $or: [{ customerId: new mongoose.Types.ObjectId(userId) }, ...(customer?.email ? [{ 'billTo.email': { $regex: new RegExp(`^${escapeRegex(customer.email.toLowerCase())}$`, 'i') } }] : [])]
        }).sort({ createdAt: -1 }).limit(50).lean();
      } else {
        return err('Not authorized to view invoices.');
      }

      return ok(invoices.map(inv => ({
        ...inv, _id: inv._id.toString(),
        companyId: inv.companyId?.toString() || null,
        customerId: inv.customerId?.toString() || null,
        quotationId: inv.quotationId?.toString() || null,
        invoiceDate: inv.invoiceDate?.toISOString(),
        dueDate: inv.dueDate?.toISOString(),
        createdAt: inv.createdAt?.toISOString(),
        updatedAt: inv.updatedAt?.toISOString(),
      })));
    }

    // ── GET SUBSCRIPTIONS ────────────────────────────────────────────────────
    if (name === 'get_subscriptions') {
      let filter = {};
      if (role === 'Super Admin') filter = {};
      else if (role === 'Admin' && companyId) {
        const companyUsers = await User.find({ companyId: new mongoose.Types.ObjectId(companyId) }).select('_id').lean();
        filter = { userId: { $in: companyUsers.map(u => u._id) } };
      } else if (role === 'Customer') filter = { userId: new mongoose.Types.ObjectId(userId) };
      else return err(`Subscriptions not accessible for role: ${role}`);

      const subs = await Subscription.find(filter).sort({ createdAt: -1 }).limit(50).lean();
      return ok(subs.map(s => ({
        ...s, _id: s._id.toString(),
        userId: s.userId?.toString() || null,
        productId: s.productId?.toString() || null,
        createdAt: s.createdAt?.toISOString(),
        updatedAt: s.updatedAt?.toISOString(),
      })));
    }

    // ── GET PLANS ────────────────────────────────────────────────────────────
    if (name === 'get_plans') {
      const plans = await Plan.find().sort({ displayOrder: 1, createdAt: -1 }).lean();
      return ok(plans.map(p => ({
        ...p, _id: p._id.toString(),
        createdAt: p.createdAt?.toISOString(),
        updatedAt: p.updatedAt?.toISOString(),
      })));
    }

    // ── GET COUPONS ──────────────────────────────────────────────────────────
    if (name === 'get_coupons') {
      let filter = {};
      if (role !== 'Super Admin' && companyId) filter = { companyId: new mongoose.Types.ObjectId(companyId) };
      else if (role !== 'Super Admin') return err('Company information missing.');

      const coupons = await Coupon.find(filter).sort({ createdAt: -1 }).limit(50).lean();
      return ok(coupons.map(c => ({
        ...c, _id: c._id.toString(),
        companyId: c.companyId?.toString() || null,
        createdAt: c.createdAt?.toISOString(),
        updatedAt: c.updatedAt?.toISOString(),
      })));
    }

    // ── GET DASHBOARD STATS ──────────────────────────────────────────────────
    if (name === 'get_dashboard_stats') {
      const stats = {};
      if (role === 'Super Admin') {
        stats.totalUsers = await User.countDocuments();
        stats.totalCompanies = await Company.countDocuments();
        stats.totalProducts = await Product.countDocuments();
        stats.totalQuotations = await Quotation.countDocuments();
        stats.totalInvoices = await Invoice.countDocuments();
        stats.totalPlans = await Plan.countDocuments();
      } else if ((role === 'Admin' || role === 'Sales Person') && companyId) {
        const coid = new mongoose.Types.ObjectId(companyId);
        stats.totalProducts = await Product.countDocuments({ companyId: coid });
        stats.totalQuotations = await Quotation.countDocuments({ companyId: coid });
        stats.totalInvoices = await Invoice.countDocuments({ companyId: coid });
        stats.teamSize = await User.countDocuments({ companyId: coid });
        if (role === 'Sales Person') {
          stats.myQuotations = await Quotation.countDocuments({ createdBy: new mongoose.Types.ObjectId(userId) });
        }
      } else if (role === 'Customer') {
        const customer = await User.findById(userId).lean();
        const email = customer?.email?.toLowerCase();
        stats.myQuotations = await Quotation.countDocuments({ 'to.email': { $regex: new RegExp(`^${email}$`, 'i') } });
        stats.myInvoices = await Invoice.countDocuments({
          $or: [{ customerId: new mongoose.Types.ObjectId(userId) }, ...(email ? [{ 'billTo.email': { $regex: new RegExp(`^${email}$`, 'i') } }] : [])]
        });
      }
      return ok({ stats, role });
    }

    // ── GET GROUPS ───────────────────────────────────────────────────────────
    if (name === 'get_groups') {
      const filter = role === 'Super Admin' ? {} : (companyId ? { companyId: new mongoose.Types.ObjectId(companyId) } : {});
      const records = await Group.find(filter).sort({ order: 1, name: 1 }).limit(50).lean();
      return ok(records.map(r => ({ _id: r._id.toString(), name: r.name, slug: r.slug, description: r.description, status: r.status })));
    }

    // ── GET ATTRIBUTES ───────────────────────────────────────────────────────
    if (name === 'get_attributes') {
      const records = await Attribute.find({ status: 'active' }).populate('options').sort({ order: 1 }).limit(50).lean();
      return ok(records.map(r => ({
        _id: r._id.toString(),
        name: r.name,
        description: r.description,
        uiType: r.uiType,
        isMandatory: r.isMandatory,
        order: r.order,
        status: r.status,
        options: (r.options || []).map(o => ({
          _id: o._id.toString(),
          label: o.label,
          value: o.value,
          description: o.description,
          defaultSelected: o.defaultSelected,
          status: o.status,
        })),
      })));
    }

    // ── GET ATTRIBUTE OPTIONS ────────────────────────────────────────────────
    if (name === 'get_attribute_options') {
      const records = await AttributeOption.find().populate('price', 'nickname amount currency billingType').limit(100).lean();
      return ok(records.map(r => ({
        _id: r._id.toString(),
        label: r.label,
        value: r.value,
        description: r.description,
        priceNickname: r.price?.nickname || null,
        priceAmount: r.price?.amount || null,
        defaultSelected: r.defaultSelected,
        status: r.status,
      })));
    }

    // ── GET PRICES ───────────────────────────────────────────────────────────
    if (name === 'get_prices') {
      const records = await Price.find().sort({ createdAt: -1 }).limit(50).lean();
      return ok(records.map(r => ({
        _id: r._id.toString(),
        nickname: r.nickname,
        amount: r.amount,
        currency: r.currency,
        billingType: r.billingType,
        interval: r.interval,
        intervalCount: r.intervalCount,
        status: r.status,
        createdAt: r.createdAt?.toISOString(),
      })));
    }

    // ── GET TAX RATES ────────────────────────────────────────────────────────
    if (name === 'get_tax_rates') {
      const records = await TaxRate.find({ status: 'active' }).limit(50).lean();
      return ok(records.map(r => ({ _id: r._id.toString(), displayName: r.displayName, jurisdiction: r.jurisdiction, percentage: r.percentage, inclusive: r.inclusive, status: r.status })));
    }

    // ── GET NOTES AND TERMS ──────────────────────────────────────────────────
    if (name === 'get_notes_and_terms') {
      const cid = companyId ? new mongoose.Types.ObjectId(companyId) : null;
      if (!cid) return err('Company ID required.');
      const record = await NotesAndTerms.findOne({ companyId: cid }).lean();
      if (!record) return ok({ notesToClient: '', termsAndConditions: '', companyId: companyId });
      return ok({ ...record, _id: record._id.toString(), companyId: record.companyId?.toString() });
    }


    // ═════════════════════════════════════════════════════════════════════════
    // CREATE / UPDATE / DELETE HANDLERS
    // ═════════════════════════════════════════════════════════════════════════

    // ── PRODUCT ──────────────────────────────────────────────────────────────
    if (name === 'create_product') {
      try {
        const data = cleanData(args);
        if (companyId) data.companyId = companyId;
        if (userId) data.createdBy = userId;
        await resolveProductRefs(data);
        return await handleCreate(Product, data);
      } catch (e) { return err(e.message); }
    }
    if (name === 'update_product') {
      try {
        const updates = { ...(args.updates || {}) };
        await resolveProductRefs(updates);
        return await handleUpdate(Product, args.id, updates);
      } catch (e) { return err(e.message); }
    }
    if (name === 'delete_product') return await handleDelete(Product, args.id);

    // ── USER ─────────────────────────────────────────────────────────────────
    if (name === 'create_user') {
      try {
        const data = cleanData(args);
        if (companyId && !data.companyId) data.companyId = companyId;
        return await handleCreate(User, data);
      } catch (e) { return err(e.message); }
    }
    if (name === 'update_user') return await handleUpdate(User, args.id, args.updates);
    if (name === 'delete_user') return await handleDelete(User, args.id);

    // ── COMPANY ──────────────────────────────────────────────────────────────
    if (name === 'create_company') {
      try {
        const data = cleanData(args);
        await resolveCompanyRefs(data);
        return await handleCreate(Company, data);
      } catch (e) { return err(e.message); }
    }
    if (name === 'update_company') {
      try {
        const updates = { ...(args.updates || {}) };
        await resolveCompanyRefs(updates);
        return await handleUpdate(Company, args.id, updates);
      } catch (e) { return err(e.message); }
    }
    if (name === 'delete_company') return await handleDelete(Company, args.id);

    // ── QUOTATION ────────────────────────────────────────────────────────────
    if (name === 'create_quotation') {
      try {
        const data = cleanData(args);
        if (companyId) data.companyId = companyId;
        data.createdBy = userId;
        await resolveQuotationRefs(data);
        return await handleCreate(Quotation, data);
      } catch (e) { return err(e.message); }
    }
    if (name === 'update_quotation') {
      try {
        const updates = { ...(args.updates || {}) };
        await resolveQuotationRefs(updates);
        return await handleUpdate(Quotation, args.id, updates);
      } catch (e) { return err(e.message); }
    }
    if (name === 'delete_quotation') return await handleDelete(Quotation, args.id);

    // ── INVOICE ──────────────────────────────────────────────────────────────
    if (name === 'create_invoice') {
      try {
        const data = cleanData(args);
        if (companyId) data.companyId = companyId;
        data.createdBy = userId;
        await resolveInvoiceRefs(data);
        return await handleCreate(Invoice, data);
      } catch (e) { return err(e.message); }
    }
    if (name === 'update_invoice') {
      try {
        const updates = { ...(args.updates || {}) };
        await resolveInvoiceRefs(updates);
        return await handleUpdate(Invoice, args.id, updates);
      } catch (e) { return err(e.message); }
    }
    if (name === 'delete_invoice') return await handleDelete(Invoice, args.id);

    // ── SUBSCRIPTION ─────────────────────────────────────────────────────────
    if (name === 'create_subscription') {
      try {
        const data = cleanData(args);
        await resolveSubscriptionRefs(data);
        return await handleCreate(Subscription, data);
      } catch (e) { return err(e.message); }
    }
    if (name === 'update_subscription') {
      try {
        const updates = { ...(args.updates || {}) };
        await resolveSubscriptionRefs(updates);
        return await handleUpdate(Subscription, args.id, updates);
      } catch (e) { return err(e.message); }
    }
    if (name === 'delete_subscription') return await handleDelete(Subscription, args.id);

    // ── PLAN ─────────────────────────────────────────────────────────────────
    if (name === 'create_plan') {
      const data = cleanData(args);
      return await handleCreate(Plan, data);
    }
    if (name === 'update_plan') return await handleUpdate(Plan, args.id, args.updates);
    if (name === 'delete_plan') return await handleDelete(Plan, args.id);

    // ── COUPON ───────────────────────────────────────────────────────────────
    if (name === 'create_coupon') {
      try {
        const data = cleanData(args);
        if (companyId) data.companyId = companyId;
        if (userId) data.createdBy = userId;
        // Resolve applicable product/group names to IDs
        if (data.applicableProductIds && Array.isArray(data.applicableProductIds)) {
          data.applicableProductIds = await resolveArrayToIds(Product, data.applicableProductIds, 'product');
        }
        if (data.applicableGroupIds && Array.isArray(data.applicableGroupIds)) {
          data.applicableGroupIds = await resolveArrayToIds(Group, data.applicableGroupIds, 'group');
        }
        return await handleCreate(Coupon, data);
      } catch (e) { return err(e.message); }
    }
    if (name === 'update_coupon') {
      try {
        const updates = { ...(args.updates || {}) };
        if (updates.applicableProductIds) updates.applicableProductIds = await resolveArrayToIds(Product, updates.applicableProductIds, 'product');
        if (updates.applicableGroupIds) updates.applicableGroupIds = await resolveArrayToIds(Group, updates.applicableGroupIds, 'group');
        return await handleUpdate(Coupon, args.id, updates);
      } catch (e) { return err(e.message); }
    }
    if (name === 'delete_coupon') return await handleDelete(Coupon, args.id);

    // ── GROUP ────────────────────────────────────────────────────────────────
    if (name === 'create_group') {
      const data = cleanData(args);
      if (companyId) data.companyId = companyId;
      if (userId) data.createdBy = userId;
      // Auto-generate slug from name if not provided
      if (!data.slug && data.name) {
        data.slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
      return await handleCreate(Group, data);
    }
    if (name === 'update_group') {
      const updates = { ...(args.updates || {}) };
      // Auto-generate slug if name changed and slug not explicitly provided
      if (updates.name && !updates.slug) {
        updates.slug = updates.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
      return await handleUpdate(Group, args.id, updates);
    }
    if (name === 'delete_group') return await handleDelete(Group, args.id);

    // ── ATTRIBUTE ────────────────────────────────────────────────────────────
    if (name === 'create_attribute') {
      const data = cleanData(args);
      return await handleCreate(Attribute, data);
    }
    if (name === 'update_attribute') return await handleUpdate(Attribute, args.id, args.updates);
    if (name === 'delete_attribute') return await handleDelete(Attribute, args.id);

    // ── ATTRIBUTE OPTION ─────────────────────────────────────────────────────
    if (name === 'create_attribute_option') {
      try {
        const data = cleanData(args);
        // Resolve price nickname to ObjectId
        if (data.price && !mongoose.Types.ObjectId.isValid(data.price)) {
          data.price = await resolveToId(Price, { nickname: new RegExp('^' + String(data.price).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }, `Could not resolve price "${data.price}". Use get_prices to see available prices.`);
        }
        return await handleCreate(AttributeOption, data);
      } catch (e) { return err(e.message); }
    }
    if (name === 'update_attribute_option') {
      try {
        const updates = { ...(args.updates || {}) };
        if (updates.price && !mongoose.Types.ObjectId.isValid(updates.price)) {
          updates.price = await resolveToId(Price, { nickname: new RegExp('^' + String(updates.price).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }, `Could not resolve price "${updates.price}".`);
        }
        return await handleUpdate(AttributeOption, args.id, updates);
      } catch (e) { return err(e.message); }
    }
    if (name === 'delete_attribute_option') return await handleDelete(AttributeOption, args.id);

    // ── PRICE ────────────────────────────────────────────────────────────────
    if (name === 'create_price') {
      try {
        const data = cleanData(args);
        await resolvePriceRefs(data);
        if (!data.currency) data.currency = 'usd';
        return await handleCreate(Price, data);
      } catch (e) { return err(e.message); }
    }
    if (name === 'update_price') {
      try {
        const updates = { ...(args.updates || {}) };
        await resolvePriceRefs(updates);
        return await handleUpdate(Price, args.id, updates);
      } catch (e) { return err(e.message); }
    }
    if (name === 'delete_price') return await handleDelete(Price, args.id);

    // ── TAX RATE ─────────────────────────────────────────────────────────────
    if (name === 'create_tax_rate') {
      const data = cleanData(args);
      return await handleCreate(TaxRate, data);
    }
    if (name === 'update_tax_rate') return await handleUpdate(TaxRate, args.id, args.updates);
    if (name === 'delete_tax_rate') return await handleDelete(TaxRate, args.id);

    // ── NOTES AND TERMS ──────────────────────────────────────────────────────
    if (name === 'update_notes_and_terms') {
      try {
        const cid = companyId ? new mongoose.Types.ObjectId(companyId) : null;
        if (!cid) return err('Company ID required.');
        const data = cleanData(args);
        data.companyId = cid;
        if (userId) data.updatedBy = userId;

        const existing = await NotesAndTerms.findOne({ companyId: cid });
        if (existing) {
          const updates = {};
          if (data.notesToClient !== undefined) updates.notesToClient = data.notesToClient;
          if (data.termsAndConditions !== undefined) updates.termsAndConditions = data.termsAndConditions;
          return await handleUpdate(NotesAndTerms, existing._id, updates);
        } else {
          if (userId) data.createdBy = userId;
          return await handleCreate(NotesAndTerms, data);
        }
      } catch (e) { return err(e.message); }
    }

    return err(`Unknown tool: ${name}`);
  });

  return mcpServer;
}

// ─── Startup Logic ────────────────────────────────────────────────────────────
if (process.argv.includes('stdio')) {
  const transport = new StdioServerTransport();
  const mcpServer = createMCPServer();
  mcpServer.connect(transport).catch((err) => {
    console.error('STDIO connection error:', err);
    process.exit(1);
  });
} else {
  const app = express();
  app.use(cors());

  let mcpServers = new Map();

  app.get('/mcp/sse', async (req, res) => {
    console.log('New SSE connection established.');
    const transport = new SSEServerTransport('/mcp/messages', res);
    const mcpServer = createMCPServer();
    await mcpServer.connect(transport);
    const sessionId = transport.sessionId;
    mcpServers.set(sessionId, transport);
    res.on('close', () => {
      console.log('SSE connection closed:', sessionId);
      mcpServers.delete(sessionId);
    });
  });

  app.post('/mcp/messages', async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = mcpServers.get(sessionId);
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else if (!sessionId && mcpServers.size > 0) {
      const fallbackTransport = Array.from(mcpServers.values())[0];
      await fallbackTransport.handlePostMessage(req, res);
    } else {
      res.status(500).send('SSE transport not initialized or invalid session.');
    }
  });

  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`Sales App MCP Server v3.0 running on port ${PORT} (SSE Mode)`);
    console.log(`SSE connection URL: http://localhost:${PORT}/mcp/sse`);
    console.log('Role-based data filtering: ENABLED');
    console.log('Models supported: Product, User, Company, Quotation, Invoice, Subscription, Plan, Coupon, Group, Attribute, AttributeOption, Price, TaxRate, NotesAndTerms');
  });
}
