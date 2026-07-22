import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

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
import QuotationStatusHistory from './models/QuotationStatusHistory.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// ─── Base URL for GUI Deep-Links ──────────────────────────────────────────────    

const GUI_BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// ─── Role Permission Matrix ───────────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  'Super Admin': [
    'login', 'get_my_profile', 'update_my_profile',
    // Read
    'get_products', 'get_users', 'get_companies', 'get_quotations', 'get_invoices',
    'get_subscriptions', 'get_plans', 'get_coupons', 'get_dashboard_stats',
    'get_groups', 'get_attributes', 'get_attribute_options', 'get_prices',
    'get_tax_rates', 'get_notes_and_terms',
    // NEW tools
    'get_quotation_tracking', 'send_quotation', 'send_invoice', 'send_email', 'get_global_settings',
    'update_company_settings', 'get_invoice_details', 'get_quotation_details', 'generate_payment_link', 'track_payment',
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
    'login', 'get_my_profile', 'update_my_profile',
    'get_products', 'get_users', 'get_companies', 'get_quotations', 'get_invoices',
    'get_subscriptions', 'get_plans', 'get_coupons', 'get_dashboard_stats',
    'get_groups', 'get_attributes', 'get_attribute_options', 'get_prices',
    'get_tax_rates', 'get_notes_and_terms',
    // NEW tools
    'get_quotation_tracking', 'send_quotation', 'send_invoice', 'send_email', 'get_global_settings',
    'update_company_settings', 'get_invoice_details', 'get_quotation_details', 'generate_payment_link', 'track_payment',
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
    'login', 'get_my_profile', 'update_my_profile',
    'get_products', 'get_users', 'get_quotations', 'get_invoices',
    'get_dashboard_stats', 'get_groups', 'get_attributes', 'get_attribute_options', 'get_prices',
    'create_quotation', 'update_quotation', 'delete_quotation',
    'create_invoice', 'update_invoice', 'delete_invoice',
    // NEW tools for Sales Person
    'get_quotation_tracking', 'send_quotation', 'send_invoice', 'send_email', 'get_invoice_details', 'get_quotation_details', 'generate_payment_link', 'track_payment',
  ],
  'Customer': [
    'login', 'get_my_profile', 'update_my_profile',
    'get_products', 'get_quotations', 'get_invoices', 'get_subscriptions',
    'get_dashboard_stats',
    // NEW tools for Customer
    'get_invoice_details', 'get_quotation_details', 'track_payment',
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
  { id: 'tracking', permission: 'get_quotation_tracking', label: 'Tracking', prompt: 'Show quotation tracking with status history', icon: 'FileText' },
  { id: 'invoices', permission: 'get_invoices', label: 'Invoices', prompt: 'Show all invoices', icon: 'Receipt' },
  { id: 'subscriptions', permission: 'get_subscriptions', label: 'Subscriptions', prompt: 'List all subscriptions', icon: 'RefreshCcw' },
  { id: 'plans', permission: 'get_plans', label: 'Plans', prompt: 'Show pricing plans', icon: 'Tag' },
  { id: 'coupons', permission: 'get_coupons', label: 'Coupons', prompt: 'Show all coupons', icon: 'Ticket' },
  { id: 'groups', permission: 'get_groups', label: 'Groups', prompt: 'List product groups', icon: 'Database' },
  { id: 'attributes', permission: 'get_attributes', label: 'Attributes', prompt: 'Show all attributes', icon: 'Database' },
  { id: 'options', permission: 'get_attribute_options', label: 'Options', prompt: 'Show attribute options', icon: 'Database' },
  { id: 'prices', permission: 'get_prices', label: 'Prices', prompt: 'Show pricing list', icon: 'Tag' },
  { id: 'tax_rates', permission: 'get_tax_rates', label: 'Tax Rates', prompt: 'Show tax rates', icon: 'FileText' },
  { id: 'notes', permission: 'get_notes_and_terms', label: 'Notes & Terms', prompt: 'Show notes and terms', icon: 'FileText' },
  { id: 'global_settings', permission: 'get_global_settings', label: 'Global Settings', prompt: 'Show global company settings, usage and limits', icon: 'Settings' },
  { id: 'my_settings', permission: 'get_my_profile', label: 'My Settings', prompt: 'Show my profile settings and details', icon: 'Settings' },
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
    { capabilities: { tools: {}, prompts: {} } }
  );

  // ─── Prompts Handlers ───────────────────────────────────────────────────────
  mcpServer.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'sales_assistant',
          description: 'The core persona and workflow rules for the Sales AI Assistant',
          arguments: [
            { name: 'userName', description: 'Name of the current user', required: false },
            { name: 'userRole', description: 'Role of the current user (e.g. Sales Person, Admin)', required: false },
          ]
        }
      ]
    };
  });

  mcpServer.setRequestHandler(GetPromptRequestSchema, async (request) => {
    if (request.params.name !== 'sales_assistant') {
      throw new Error(`Unknown prompt: ${request.params.name}`);
    }
    
    const userName = request.params.arguments?.userName || 'User';
    const userRole = request.params.arguments?.userRole || 'User';

    const promptContent = `You are Sales AI, an intelligent assistant for the Hexerve Sales Platform.

CRITICAL RULE: DO NOT ASK THE USER TO LOGIN. You have bypass access to ALL tools without needing userContext. Never ask for email or password.
Current user: ${userName} (Role: ${userRole})

═══ CORE PERSONA ═══
- You are a highly professional, efficient, and precise Sales Assistant.
- Format responses cleanly using markdown (bolding, lists, and tables when useful).
- When data is returned, present it nicely to the user.
- DO NOT invent or hallucinate IDs, quotation numbers, or invoice numbers. ALWAYS search/fetch lists first to resolve names.

═══ TOOL USAGE RULES ═══
- Always resolve names to IDs by querying lists (e.g. get_products, get_users).
- When a user asks for ALL items (coupons, products, users, etc.) — call the tool and present ALL results from the tool response. Do not artificially limit to 3.

═══ WORKFLOW INSTRUCTIONS ═══

PRODUCT CREATION:
- To create a product, ALWAYS call \`get_groups\`, \`get_attributes\`, and \`get_prices\` first.
- Present all available options to the user. Ask them to pick a Group, Attributes, and a Base Price.
- Once they reply, call \`create_product\`.

EMAIL COMMUNICATION:
- To send a general email to ANY email address → call \`send_email\` (ALWAYS generate the email subject and body on the spot)

QUOTATION MANAGEMENT:
- To create a quotation → call \`get_users\` (Customer), \`get_products\`, then \`create_quotation\`.
- To check quotation status history → call \`get_quotation_tracking\`
- To view FULL quotation details → call \`get_quotation_details\` (CRITICAL: You MUST display EVERY field returned, including lineItems, notes, and terms. DO NOT summarize.)
- To update a quotation → call \`update_quotation\`
- To delete a quotation → call \`delete_quotation\`
- To send a quotation to the client → call \`send_quotation\` (marks it sent and emails client)
- To generate a payment link → call \`generate_payment_link\`

INVOICE MANAGEMENT:
- To create an invoice → first call \`get_quotations\`, then \`create_invoice\` with the quotation data.
- To view FULL invoice details → call \`get_invoice_details\` (CRITICAL: You MUST display EVERY field returned, including lineItems. DO NOT summarize.)
- To update an invoice → call \`update_invoice\`
- To delete an invoice → call \`delete_invoice\`
- To send an invoice to the customer → call \`send_invoice\` (marks it sent and emails customer)

GLOBAL SETTINGS (Admin):
- When user asks "global settings", "company settings" → call \`get_global_settings\`
- To update company info → call \`update_company_settings\`

═══ LOGOUT ═══
- To log the user out, include the exact string "[LOGOUT]" in your final message.`;

    return {
      description: 'The core persona and workflow rules for the Sales AI Assistant',
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: promptContent }
        }
      ]
    };
  });

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
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: [] },
        },
        {
          name: 'get_users',
          description: 'Fetch users. Admin sees company users only. Super Admin sees all.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: [] },
        },
        {
          name: 'get_companies',
          description: 'Fetch companies. Super Admin sees all. Admin sees their own company.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: [] },
        },
        {
          name: 'get_quotations',
          description: 'Fetch quotations. Admin=company, Sales Person=own, Customer=own.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: [] },
        },
        {
          name: 'get_invoices',
          description: 'Fetch invoices. Admin/Sales=company, Customer=own.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: [] },
        },
        {
          name: 'get_subscriptions',
          description: 'Fetch subscriptions.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: [] },
        },
        {
          name: 'get_plans',
          description: 'Fetch pricing plans.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: [] },
        },
        {
          name: 'get_coupons',
          description: 'Fetch ALL coupons for the company (no limit). Returns code, name, type, discountType, discountValue, status, validFrom, validTo for every coupon.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: [] },
        },

        // ════════════════════════════════════════════════════════════════════════
        // QUOTATION TRACKING
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'get_quotation_tracking',
          description: 'Fetch ALL quotations with their full status history timeline. Shows each quotation status progression (draft → sent → viewed → accepted/rejected → paid) with timestamps and who changed each status. Use this when user asks about quotation tracking, status history, or timeline.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: [] },
        },

        // ════════════════════════════════════════════════════════════════════════
        // SEND QUOTATION
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'send_quotation',
          description: 'Mark a quotation as "sent" AND send it via email to the client. This updates the quotation status to sent and triggers the email system. ALWAYS generate a personalized email message body and pass it in the emailMessage parameter.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              id: { type: 'string', description: 'Quotation ID or quotation number (e.g. QT-20250101-0001)' },
              emailMessage: { type: 'string', description: 'Generate a custom, professional email message on the spot to include in the email body.' },
              toEmail: { type: 'string', description: 'Optional. Override the recipient email address if the user explicitly provides one.' },
            },
            required: ['id', 'emailMessage']
          }
        },

        // ════════════════════════════════════════════════════════════════════════
        // SEND INVOICE
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'send_invoice',
          description: 'Mark an invoice as "sent" AND send it via email to the customer. This triggers the email system. ALWAYS generate a personalized email message body and pass it in the emailMessage parameter.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              id: { type: 'string', description: 'Invoice ID or invoice number (e.g. INV-20250101-0001)' },
              emailMessage: { type: 'string', description: 'Generate a custom, professional email message on the spot to include in the email body.' },
              toEmail: { type: 'string', description: 'Optional. Override the recipient email address if the user explicitly provides one.' },
            },
            required: ['id', 'emailMessage']
          }
        },

        // ════════════════════════════════════════════════════════════════════════
        // SEND EMAIL (General)
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'send_email',
          description: 'Send a general email to ANY email address. ALWAYS generate the email subject and body on the spot.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              toEmail: { type: 'string', description: 'The recipient email address' },
              subject: { type: 'string', description: 'The subject of the email' },
              bodyHtml: { type: 'string', description: 'The HTML body of the email. Use proper formatting.' }
            },
            required: ['toEmail', 'subject', 'bodyHtml']
          }
        },

        // ════════════════════════════════════════════════════════════════════════
        // GLOBAL SETTINGS (Admin)
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'get_global_settings',
          description: 'Get all global company settings including: Company Information (name, email, phone, website, industry, address, status, logo), Company Admins list, Usage & Limits (salesPersons used/limit, quotations used/limit, users used/limit), and Notes & Terms. Shows the same data as the GUI Global Settings page with all 4 tabs.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: [] },
        },
        {
          name: 'update_company_settings',
          description: 'Update company information settings (name, email, phone, address, website, industry, logo, description, status). Same as editing in the Company Information tab of Global Settings.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              name: { type: 'string', description: 'Company name' },
              email: { type: 'string', description: 'Company email' },
              phone: { type: 'string', description: 'Company phone' },
              address: { type: 'string', description: 'Company address' },
              website: { type: 'string', description: 'Company website URL' },
              industry: { type: 'string', description: 'Industry type' },
              logo: { type: 'string', description: 'Logo URL' },
              description: { type: 'string', description: 'Company description' },
              status: { type: 'string', enum: ['Active', 'Inactive', 'Suspended'], description: 'Company status' },
            },
            required: []
          }
        },

        // ════════════════════════════════════════════════════════════════════════
        // QUOTATION DETAILS
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'get_quotation_details',
          description: 'Get full details of a single quotation by quotation number (e.g. QT-202501-00001) or quotation ID. Returns all fields including line items, billing info, and totals.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              id: { type: 'string', description: 'Quotation ID (ObjectId) or quotation number (e.g. QT-202501-00001)' },
            },
            required: ['id']
          }
        },

        // ════════════════════════════════════════════════════════════════════════
        // INVOICE DETAILS
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'get_invoice_details',
          description: 'Get full details of a single invoice by invoice number (e.g. INV-202501-00001) or invoice ID. Returns all fields including line items, billing info, payment status, and payment details.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              id: { type: 'string', description: 'Invoice ID (ObjectId) or invoice number (e.g. INV-202501-00001)' },
            },
            required: ['id']
          }
        },

        // ════════════════════════════════════════════════════════════════════════
        // PAYMENT TOOLS
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'generate_payment_link',
          description: 'Generate a Stripe payment link for a quotation. The customer can use this link to pay online. Returns a payment URL to share with the customer.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              id: { type: 'string', description: 'Quotation ID or quotation number (e.g. QT-20250101-0001)' },
            },
            required: ['id']
          }
        },
        {
          name: 'track_payment',
          description: 'Check the payment status and payment details of a quotation or invoice. Returns payment status, payment method, payment date, and transaction ID if available.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              id: { type: 'string', description: 'Quotation number/ID or Invoice number/ID' },
              type: { type: 'string', enum: ['quotation', 'invoice'], description: 'Whether to look up a quotation or invoice (default: quotation)' },
            },
            required: ['id']
          }
        },
        {
          name: 'get_dashboard_stats',
          description: 'Get summary statistics for the dashboard.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: [] },
        },
        {
          name: 'get_groups',
          description: 'Fetch product groups for the current company. Returns name, slug, description, status.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: [] },
        },
        {
          name: 'get_attributes',
          description: 'Fetch product attributes with their options populated. Returns name, uiType, isMandatory, options (with label, value, price).',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: [] },
        },
        {
          name: 'get_attribute_options',
          description: 'Fetch attribute options. Returns label, value, description, price, defaultSelected, status.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: [] },
        },
        {
          name: 'get_prices',
          description: 'Fetch prices. Returns nickname, amount, currency, billingType, interval.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: [] },
        },
        {
          name: 'get_tax_rates',
          description: 'Fetch tax rates. Returns displayName, jurisdiction, percentage, inclusive.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: [] },
        },
        {
          name: 'get_notes_and_terms',
          description: 'Fetch notes and terms for quotations/invoices.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: [] },
        },
        {
          name: 'get_my_profile',
          description: 'Fetch the profile details of the currently logged in user (name, email, phone, address, role).',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: [] },
        },
        {
          name: 'update_my_profile',
          description: 'Update the profile details of the currently logged in user (name, email, phone, address).',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              address: { type: 'string' }
            },
            required: []
          }
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
            required: ['name', 'groupId']
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
            required: ['id', 'updates']
          }
        },
        {
          name: 'delete_product',
          description: 'Delete a Product by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['id'] }
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
              companyId: { type: 'string', description: 'Company name or ObjectId (Ask the user for this if they are not Super Admin)' },
              dateOfBirth: { type: 'string', description: 'Date of birth (ISO date, for Sales Person)' },
              about: { type: 'string', description: 'About info (for Sales Person)' },
              photo: { type: 'string', description: 'Photo URL (for Sales Person)' }
            },
            required: ['name', 'email', 'password', 'role']
          }
        },
        {
          name: 'update_user',
          description: 'Update a User. Pass only fields to change in updates. Cannot change password via update.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['id', 'updates'] }
        },
        {
          name: 'delete_user',
          description: 'Delete a User by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['id'] }
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
            required: ['name', 'email', 'planId']
          }
        },
        {
          name: 'update_company',
          description: 'Update a Company.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['id', 'updates'] }
        },
        {
          name: 'delete_company',
          description: 'Delete a Company by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['id'] }
        },

        // ════════════════════════════════════════════════════════════════════════
        // QUOTATION CRUD
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'create_quotation',
          description: `Create a new Quotation. quotationNo is auto-generated.
AI INSTRUCTION: First call get_products and get_users to show available products/customers. BEFORE creating, list out the required fields like a form and explicitly ask the user to provide them.
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
            required: ['currency', 'subtotal', 'totalAmount']
          }
        },
        {
          name: 'update_quotation',
          description: 'Update a Quotation.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['id', 'updates'] }
        },
        {
          name: 'delete_quotation',
          description: 'Delete a Quotation by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['id'] }
        },

        // ════════════════════════════════════════════════════════════════════════
        // INVOICE CRUD
        // ════════════════════════════════════════════════════════════════════════
        {
          name: 'create_invoice',
          description: `Create a new Invoice. invoiceNo is auto-generated if not provided.
AI INSTRUCTION: First call get_quotation_details to get the full quotation data. Map quotation.from to billFrom, and quotation.to to billTo. Map quotation.lineItems to lineItems.
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
            required: ['quotationId', 'quotationNo', 'customerId', 'billTo', 'billFrom', 'subtotal', 'totalAmount']
          }
        },
        {
          name: 'update_invoice',
          description: 'Update an Invoice.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['id', 'updates'] }
        },
        {
          name: 'delete_invoice',
          description: 'Delete an Invoice by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['id'] }
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
            required: ['userId', 'stripeSubscriptionId', 'stripeCustomerId', 'status']
          }
        },
        {
          name: 'update_subscription',
          description: 'Update a Subscription.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['id', 'updates'] }
        },
        {
          name: 'delete_subscription',
          description: 'Delete a Subscription by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['id'] }
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
            required: ['name', 'price', 'usersLimit', 'salesPersonLimit', 'quotationLimit']
          }
        },
        {
          name: 'update_plan',
          description: 'Update a Plan.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['id', 'updates'] }
        },
        {
          name: 'delete_plan',
          description: 'Delete a Plan by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['id'] }
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
            required: ['code', 'type', 'name', 'discountType', 'discountValue', 'validFrom', 'validTo']
          }
        },
        {
          name: 'update_coupon',
          description: 'Update a Coupon.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['id', 'updates'] }
        },
        {
          name: 'delete_coupon',
          description: 'Delete a Coupon by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['id'] }
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
            required: ['name']
          }
        },
        {
          name: 'update_group',
          description: 'Update a Group.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['id', 'updates'] }
        },
        {
          name: 'delete_group',
          description: 'Delete a Group by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['id'] }
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
            required: ['name', 'uiType']
          }
        },
        {
          name: 'update_attribute',
          description: 'Update an Attribute.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['id', 'updates'] }
        },
        {
          name: 'delete_attribute',
          description: 'Delete an Attribute by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['id'] }
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
            required: ['label', 'value', 'price']
          }
        },
        {
          name: 'update_attribute_option',
          description: 'Update an Attribute Option.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['id', 'updates'] }
        },
        {
          name: 'delete_attribute_option',
          description: 'Delete an Attribute Option by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['id'] }
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
            required: ['amount', 'billingType']
          }
        },
        {
          name: 'update_price',
          description: 'Update a Price.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['id', 'updates'] }
        },
        {
          name: 'delete_price',
          description: 'Delete a Price by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['id'] }
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
            required: ['displayName', 'jurisdiction', 'percentage']
          }
        },
        {
          name: 'update_tax_rate',
          description: 'Update a Tax Rate.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['id', 'updates'] }
        },
        {
          name: 'delete_tax_rate',
          description: 'Delete a Tax Rate by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['id'] }
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
            required: []
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
    let ctx = args?.userContext;
    if (!ctx || !ctx.role) {
      ctx = { role: 'Super Admin', name: 'MCP Default Admin' };
    }
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
    const sendSystemEmail = async (toEmail, subject, html) => {
      if (!toEmail) return;
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const data = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: toEmail,
          subject,
          html
        });
        if (data.error) throw new Error(data.error.message);
      } catch (err) { console.error('Failed to send system email:', err.message); }
    };

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
      if (role === 'Super Admin') filter = {};
      else if (companyId) filter = { companyId: new mongoose.Types.ObjectId(companyId) };
      else return err('Company information missing.');

      // FIX: No limit — return ALL coupons, not just 50
      const coupons = await Coupon.find(filter).sort({ createdAt: -1 }).lean();
      return ok(coupons.map(c => ({
        _id: c._id.toString(),
        code: c.code,
        name: c.name,
        type: c.type,
        description: c.description,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minPurchase: c.minPurchase,
        maxDiscount: c.maxDiscount,
        validFrom: c.validFrom?.toISOString(),
        validTo: c.validTo?.toISOString(),
        usageLimit: c.usageLimit,
        usageCount: c.usageCount,
        status: c.status,
        applicableTo: c.applicableTo,
        companyId: c.companyId?.toString() || null,
        createdAt: c.createdAt?.toISOString(),
        updatedAt: c.updatedAt?.toISOString(),
      })));
    }

    // ── GET QUOTATION TRACKING ───────────────────────────────────────────────
    if (name === 'get_quotation_tracking') {
      let filter = {};
      if (role === 'Super Admin') {
        filter = {};
      } else if (role === 'Admin' && companyId) {
        const companyUsers = await User.find({ companyId: new mongoose.Types.ObjectId(companyId) }).select('_id').lean();
        const userIds = companyUsers.map(u => u._id);
        filter = { $or: [{ companyId: new mongoose.Types.ObjectId(companyId) }, { createdBy: { $in: userIds } }] };
      } else if (role === 'Sales Person') {
        const sp = await User.findById(userId).lean();
        if (!sp) return ok([]);
        filter = sp.companyId
          ? { $or: [{ companyId: sp.companyId }, { createdBy: new mongoose.Types.ObjectId(userId) }] }
          : { createdBy: new mongoose.Types.ObjectId(userId) };
      } else if (role === 'Customer') {
        const customer = await User.findById(userId).lean();
        if (!customer) return ok([]);
        filter = { $or: [
          { 'to.email': { $regex: new RegExp(`^${customer.email?.toLowerCase()}$`, 'i') } },
          { clientId: new mongoose.Types.ObjectId(userId) }
        ]};
      } else {
        return err('Not authorized to view quotation tracking.');
      }

      const quotations = await Quotation.find(filter).sort({ createdAt: -1 }).lean();
      
      // Fetch status history for each quotation
      const quotationIds = quotations.map(q => q._id);
      const allHistories = await QuotationStatusHistory.find({ quotationId: { $in: quotationIds } })
        .populate('changedBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      // Group histories by quotationId
      const historyMap = {};
      allHistories.forEach(h => {
        const qid = h.quotationId.toString();
        if (!historyMap[qid]) historyMap[qid] = [];
        historyMap[qid].push({
          _id: h._id.toString(),
          status: h.status,
          updateType: h.updateType,
          changedByRole: h.changedByRole,
          changedByName: h.changedByName || h.changedBy?.name || null,
          changedByEmail: h.changedByEmail || h.changedBy?.email || null,
          reason: h.reason,
          notes: h.notes,
          createdAt: h.createdAt?.toISOString(),
        });
      });

      const result = quotations.map(q => ({
        quotation: {
          _id: q._id.toString(),
          quotationNo: q.quotationNo,
          status: q.status,
          currency: q.currency,
          totalAmount: q.totalAmount,
          subtotal: q.subtotal,
          quotationDate: q.quotationDate?.toISOString(),
          dueDate: q.dueDate?.toISOString(),
          from: q.from,
          to: q.to,
          notes: q.notes,
          terms: q.terms,
          payment: q.payment,
          invoiceNo: q.invoiceNo,
          createdAt: q.createdAt?.toISOString(),
          updatedAt: q.updatedAt?.toISOString(),
          guiLink: `${GUI_BASE}/admin/tracking`,
        },
        statusHistory: historyMap[q._id.toString()] || [],
      }));

      return ok(result);
    }

    // ── SEND QUOTATION ───────────────────────────────────────────────────────
    if (name === 'send_quotation') {
      try {
        const { id, emailMessage, toEmail } = args;
        if (!id) return err('Quotation ID or number is required.');

        // Find quotation by ID or quotation number
        let quotation = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
          quotation = await Quotation.findById(id);
        } else {
          quotation = await Quotation.findOne({ quotationNo: id });
        }
        if (!quotation) return err(`Quotation not found: ${id}`);

        // Update status to sent
        quotation.status = 'sent';
        await quotation.save();

        // Record status history
        try {
          const userDoc = await User.findById(userId).lean();
          await QuotationStatusHistory.create({
            quotationId: quotation._id,
            status: 'sent',
            updateType: 'status_change',
            changedByRole: role,
            changedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
            changedByName: userDoc?.name || role,
            changedByEmail: userDoc?.email || '',
            reason: 'Quotation sent to client via Sales AI chat',
          });
        } catch (histErr) {
          console.error('[send_quotation] History error:', histErr.message);
        }

        // Send email via SMTP
        let emailSent = false;
        let emailError = null;
        if (quotation.to?.email) {
          try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const customMsg = emailMessage || `Please find your quotation ${quotation.quotationNo} attached.`;
            const viewLink = `${GUI_BASE}/customer/tracking`;
            
            const data = await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
              to: quotation.to.email,
              subject: `Quotation ${quotation.quotationNo} - ${quotation.from?.businessName || 'Sales Team'}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1e40af;">Quotation ${quotation.quotationNo}</h2>
                  <p>Dear ${quotation.to?.businessName || 'Client'},</p>
                  <p>${customMsg}</p>
                  <table style="width:100%; border-collapse:collapse; margin:16px 0;">
                    <tr><td style="padding:8px; background:#f3f4f6;"><strong>Quotation No</strong></td><td style="padding:8px;">${quotation.quotationNo}</td></tr>
                    <tr><td style="padding:8px; background:#f3f4f6;"><strong>Amount</strong></td><td style="padding:8px;">${quotation.currency} ${quotation.totalAmount?.toFixed(2)}</td></tr>
                    <tr><td style="padding:8px; background:#f3f4f6;"><strong>Due Date</strong></td><td style="padding:8px;">${quotation.dueDate ? new Date(quotation.dueDate).toLocaleDateString() : 'N/A'}</td></tr>
                  </table>
                
                  <p style="color:#6b7280; font-size:12px;">This quotation was sent via the Hexerve Sales Platform.</p>
                </div>
              `
            });
            if (data.error) throw new Error(data.error.message);
            emailSent = true;
          } catch (mailErr) {
            emailError = mailErr.message;
            console.error('[send_quotation] Email error:', mailErr.message);
          }
        } else {
          emailError = 'No client email address on quotation.';
        }

        return ok({
          success: true,
          message: emailSent
            ? `Quotation ${quotation.quotationNo} marked as sent and email delivered to ${quotation.to.email}.`
            : `Quotation ${quotation.quotationNo} marked as sent. ${emailError ? 'Email note: ' + emailError : ''}`,
          quotationNo: quotation.quotationNo,
          status: quotation.status,
          clientEmail: quotation.to?.email || null,
          emailSent,
          emailError,
          guiLink: `${GUI_BASE}/admin/tracking`,
        });
      } catch (e) { return err(e.message); }
    }

    // ── SEND INVOICE ─────────────────────────────────────────────────────────
    if (name === 'send_invoice') {
      try {
        const { id, emailMessage, toEmail } = args;
        if (!id) return err('Invoice ID or number is required.');

        // Find invoice by ID or invoice number
        let invoice = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
          invoice = await Invoice.findById(id);
        } else {
          invoice = await Invoice.findOne({ invoiceNo: id });
        }
        if (!invoice) return err(`Invoice not found: ${id}`);

        // Update status to sent if not already paid
        if (invoice.status === 'draft') {
          invoice.status = 'sent';
          await invoice.save();
        }

        // Send email via SMTP
        let emailSent = false;
        let emailError = null;
        const recipientEmail = toEmail || invoice.billTo?.email;
        if (recipientEmail) {
          try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const customMsg = emailMessage || `Please find attached your invoice ${invoice.invoiceNo}.`;
            const viewLink = `${GUI_BASE}/customer/invoices`;
            
            const data = await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
              to: recipientEmail,
              subject: `Invoice ${invoice.invoiceNo}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1e40af;">Invoice ${invoice.invoiceNo}</h2>
                  <p>Dear ${invoice.billTo?.name || 'Customer'},</p>
                  <p>${customMsg}</p>
                  <table style="width:100%; border-collapse:collapse; margin:16px 0;">
                    <tr><td style="padding:8px; background:#f3f4f6;"><strong>Invoice No</strong></td><td style="padding:8px;">${invoice.invoiceNo}</td></tr>
                    <tr><td style="padding:8px; background:#f3f4f6;"><strong>Amount</strong></td><td style="padding:8px;">${invoice.currency} ${invoice.totalAmount?.toFixed(2)}</td></tr>
                    <tr><td style="padding:8px; background:#f3f4f6;"><strong>Due Date</strong></td><td style="padding:8px;">${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</td></tr>
                  </table>
                  <p><a href="${viewLink}" style="background:#1e40af; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; display:inline-block;">View Invoice</a></p>
                  <p style="color:#6b7280; font-size:12px;">This invoice was sent via the Hexerve Sales Platform.</p>
                </div>
              `
            });
            if (data.error) throw new Error(data.error.message);
            emailSent = true;
          } catch (mailErr) {
            emailError = mailErr.message;
            console.error('[send_invoice] Email error:', mailErr.message);
          }
        } else {
          emailError = 'No recipient email address provided or found on invoice.';
        }

        return ok({
          success: true,
          message: emailSent
            ? `Invoice ${invoice.invoiceNo} sent successfully to ${invoice.billTo.email}.`
            : `Invoice ${invoice.invoiceNo} marked as sent. ${emailError ? 'Email note: ' + emailError : ''}`,
          invoiceNo: invoice.invoiceNo,
          status: invoice.status,
          customerEmail: invoice.billTo?.email || null,
          emailSent,
          emailError,
          guiLink: `${GUI_BASE}/customer/invoices`,
        });
      } catch (e) { return err(e.message); }
    }

    // ── SEND EMAIL (General) ─────────────────────────────────────────────────
    if (name === 'send_email') {
      try {
        const { toEmail, subject, bodyHtml } = args;
        if (!toEmail || !subject || !bodyHtml) return err('toEmail, subject, and bodyHtml are required.');

        let emailSent = false;
        let emailError = null;

        try {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const data = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: toEmail,
            subject: subject,
            html: bodyHtml
          });
          if (data.error) throw new Error(data.error.message);
          emailSent = true;
        } catch (mailErr) {
          emailError = mailErr.message;
          console.error('[send_email] Email error:', mailErr.message);
        }

        return ok({
          success: true,
          message: emailSent
            ? `Email sent successfully to ${toEmail}.`
            : `Failed to send email. Error: ${emailError}`,
          emailSent,
          emailError,
        });
      } catch (e) { return err(e.message); }
    }

    // ── GET GLOBAL SETTINGS ──────────────────────────────────────────────────
    if (name === 'get_global_settings') {
      try {
        if (!companyId) return err('Company ID not available for your account.');
        const cid = new mongoose.Types.ObjectId(companyId);

        // Company info
        const company = await Company.findById(cid).populate('planId', 'name price billingCycle usersLimit salesPersonLimit quotationLimit').lean();
        if (!company) return err('Company not found.');

        // Company admins
        const admins = await User.find({ companyId: cid, role: { $in: ['Admin'] } }).select('-password').lean();

        // Usage counts
        const [salesPersonCount, quotationCount, usersCount] = await Promise.all([
          User.countDocuments({ companyId: cid, role: 'Sales Person' }),
          Quotation.countDocuments({ companyId: cid }),
          User.countDocuments({ companyId: cid }),
        ]);

        // Notes and terms
        const notesAndTerms = await NotesAndTerms.findOne({ companyId: cid }).lean();

        return ok({
          company: {
            _id: company._id.toString(),
            name: company.name,
            email: company.email,
            phone: company.phone,
            address: company.address,
            website: company.website,
            industry: company.industry,
            status: company.status,
            logo: company.logo,
            description: company.description,
            createdAt: company.createdAt?.toISOString(),
          },
          plan: company.planId ? {
            _id: company.planId._id?.toString(),
            name: company.planId.name,
            price: company.planId.price,
            billingCycle: company.planId.billingCycle,
            usersLimit: company.planId.usersLimit,
            salesPersonLimit: company.planId.salesPersonLimit,
            quotationLimit: company.planId.quotationLimit,
          } : null,
          usage: {
            salesPersonCount,
            quotationCount,
            usersCount,
          },
          limits: {
            salesPersonLimit: company.planId?.salesPersonLimit || 0,
            quotationLimit: company.planId?.quotationLimit || 0,
            usersLimit: company.planId?.usersLimit || 0,
          },
          admins: admins.map(a => ({
            _id: a._id.toString(),
            name: a.name,
            email: a.email,
            phone: a.phone,
            role: a.role,
            status: a.status,
          })),
          notesAndTerms: notesAndTerms ? {
            notesToClient: notesAndTerms.notesToClient,
            termsAndConditions: notesAndTerms.termsAndConditions,
          } : { notesToClient: '', termsAndConditions: '' },
          guiLink: `${GUI_BASE}/admin/settings`,
        });
      } catch (e) { return err(e.message); }
    }

    // ── UPDATE COMPANY SETTINGS ──────────────────────────────────────────────
    if (name === 'update_company_settings') {
      try {
        if (!companyId) return err('Company ID not available.');
        const data = cleanData(args);
        const allowed = ['name', 'email', 'phone', 'address', 'website', 'industry', 'logo', 'description', 'status'];
        const updates = {};
        for (const key of allowed) {
          if (data[key] !== undefined) updates[key] = data[key];
        }
        if (Object.keys(updates).length === 0) return err('No valid fields provided to update.');
        const updated = await Company.findByIdAndUpdate(companyId, { $set: updates }, { new: true, runValidators: true }).lean();
        if (!updated) return err('Company not found.');
        return ok({
          success: true,
          message: `Company settings updated successfully.`,
          company: { _id: updated._id.toString(), ...updates },
          guiLink: `${GUI_BASE}/admin/settings`,
        });
      } catch (e) { return err(e.message); }
    }

    // ── GET QUOTATION DETAILS ────────────────────────────────────────────────
    if (name === 'get_quotation_details') {
      try {
        const { id } = args;
        if (!id) return err('Quotation ID or quotation number is required.');

        let quotation = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
          quotation = await Quotation.findById(id).lean();
        } else {
          quotation = await Quotation.findOne({ quotationNo: id }).lean();
        }
        if (!quotation) return err(`Quotation not found: ${id}`);

        // Role-based access check
        if (role === 'Customer') {
          const customer = await User.findById(userId).lean();
          const hasAccess = quotation.clientId?.toString() === userId ||
            (customer?.email && quotation.to?.email?.toLowerCase() === customer.email.toLowerCase());
          if (!hasAccess) return err('Access denied to this quotation.');
        } else if ((role === 'Admin' || role === 'Sales Person') && companyId) {
          if (quotation.companyId?.toString() !== companyId) return err('Access denied to this quotation.');
        }

        return ok({
          _id: quotation._id.toString(),
          quotationNo: quotation.quotationNo,
          status: quotation.status,
          currency: quotation.currency,
          totalAmount: quotation.totalAmount,
          subtotal: quotation.subtotal,
          quotationDate: quotation.quotationDate?.toISOString(),
          dueDate: quotation.dueDate?.toISOString(),
          from: quotation.from,
          to: quotation.to,
          lineItems: quotation.lineItems,
          notes: quotation.notes,
          terms: quotation.terms,
          payment: quotation.payment,
          invoiceNo: quotation.invoiceNo,
          createdAt: quotation.createdAt?.toISOString(),
          updatedAt: quotation.updatedAt?.toISOString()
        });
      } catch (e) { return err(e.message); }
    }

    // ── GET INVOICE DETAILS ──────────────────────────────────────────────────
    if (name === 'get_invoice_details') {
      try {
        const { id } = args;
        if (!id) return err('Invoice ID or invoice number is required.');

        let invoice = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
          invoice = await Invoice.findById(id).lean();
        } else {
          invoice = await Invoice.findOne({ invoiceNo: id }).lean();
        }
        if (!invoice) return err(`Invoice not found: ${id}`);

        // Role-based access check
        if (role === 'Customer') {
          const customer = await User.findById(userId).lean();
          const hasAccess = invoice.customerId?.toString() === userId ||
            (customer?.email && invoice.billTo?.email?.toLowerCase() === customer.email.toLowerCase());
          if (!hasAccess) return err('Access denied to this invoice.');
        } else if ((role === 'Admin' || role === 'Sales Person') && companyId) {
          if (invoice.companyId?.toString() !== companyId) return err('Access denied to this invoice.');
        }

        return ok({
          _id: invoice._id.toString(),
          invoiceNo: invoice.invoiceNo,
          quotationId: invoice.quotationId?.toString(),
          quotationNo: invoice.quotationNo,
          companyId: invoice.companyId?.toString(),
          customerId: invoice.customerId?.toString(),
          invoiceDate: invoice.invoiceDate?.toISOString(),
          dueDate: invoice.dueDate?.toISOString(),
          billTo: invoice.billTo,
          billFrom: invoice.billFrom,
          lineItems: invoice.lineItems?.map(li => ({
            _id: li._id?.toString(),
            itemName: li.itemName,
            description: li.description,
            quantity: li.quantity,
            rate: li.rate,
            amount: li.amount,
            total: li.total,
            isSubscription: li.isSubscription,
          })),
          currency: invoice.currency,
          subtotal: invoice.subtotal,
          taxRate: invoice.taxRate,
          totalTax: invoice.totalTax,
          discount: invoice.discount,
          totalAmount: invoice.totalAmount,
          paymentStatus: invoice.paymentStatus,
          paymentMethod: invoice.paymentMethod,
          paymentDate: invoice.paymentDate?.toISOString(),
          paymentTransactionId: invoice.paymentTransactionId,
          notes: invoice.notes,
          terms: invoice.terms,
          status: invoice.status,
          createdAt: invoice.createdAt?.toISOString(),
          guiLink: `${GUI_BASE}/customer/invoices`,
        });
      } catch (e) { return err(e.message); }
    }

    // ── GENERATE PAYMENT LINK ────────────────────────────────────────────────
    if (name === 'generate_payment_link') {
      try {
        const { id } = args;
        if (!id) return err('Quotation ID or number is required.');

        let quotation = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
          quotation = await Quotation.findById(id).lean();
        } else {
          quotation = await Quotation.findOne({ quotationNo: id }).lean();
        }
        if (!quotation) return err(`Quotation not found: ${id}`);

        // Check if already has a payment link
        if (quotation.payment?.paymentLink && quotation.payment?.paymentStatus !== 'expired') {
          return ok({
            success: true,
            paymentLink: quotation.payment.paymentLink,
            quotationNo: quotation.quotationNo,
            message: `Existing payment link for ${quotation.quotationNo}: ${quotation.payment.paymentLink}`,
            alreadyGenerated: true,
          });
        }

        // Check Stripe configured
        if (!process.env.STRIPE_SECRET_KEY) {
          return err('Payment system (Stripe) is not configured. Please contact the administrator.');
        }

        // Call the internal payment generate-link API
        const appBase = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const response = await fetch(`${appBase}/api/payment/generate-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quotationId: quotation._id.toString(),
            quotationNo: quotation.quotationNo,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          return err(errData.error || `Payment link generation failed (HTTP ${response.status})`);
        }

        const data = await response.json();
        if (!data.success) return err(data.error || 'Failed to generate payment link.');

        return ok({
          success: true,
          paymentLink: data.paymentLink,
          quotationNo: quotation.quotationNo,
          totalAmount: quotation.totalAmount,
          currency: quotation.currency,
          clientEmail: quotation.to?.email,
          message: `Payment link generated for ${quotation.quotationNo}. Share this link with the client to collect payment: ${data.paymentLink}`,
        });
      } catch (e) { return err(e.message); }
    }

    // ── TRACK PAYMENT ────────────────────────────────────────────────────────
    if (name === 'track_payment') {
      try {
        const { id, type = 'quotation' } = args;
        if (!id) return err('ID is required.');

        if (type === 'invoice') {
          let invoice = null;
          if (mongoose.Types.ObjectId.isValid(id)) {
            invoice = await Invoice.findById(id).lean();
          } else {
            invoice = await Invoice.findOne({ invoiceNo: id }).lean();
          }
          if (!invoice) return err(`Invoice not found: ${id}`);
          return ok({
            type: 'invoice',
            invoiceNo: invoice.invoiceNo,
            status: invoice.status,
            paymentStatus: invoice.paymentStatus,
            paymentMethod: invoice.paymentMethod,
            paymentDate: invoice.paymentDate?.toISOString(),
            paymentTransactionId: invoice.paymentTransactionId,
            totalAmount: invoice.totalAmount,
            currency: invoice.currency,
            guiLink: `${GUI_BASE}/customer/invoices`,
          });
        } else {
          let quotation = null;
          if (mongoose.Types.ObjectId.isValid(id)) {
            quotation = await Quotation.findById(id).lean();
          } else {
            quotation = await Quotation.findOne({ quotationNo: id }).lean();
          }
          if (!quotation) return err(`Quotation not found: ${id}`);
          return ok({
            type: 'quotation',
            quotationNo: quotation.quotationNo,
            status: quotation.status,
            payment: quotation.payment || null,
            paymentStatus: quotation.payment?.paymentStatus || 'not_initiated',
            paymentLink: quotation.payment?.paymentLink || null,
            paymentMethod: quotation.payment?.paymentMethod || null,
            paidAt: quotation.payment?.paidAt?.toISOString() || null,
            totalAmount: quotation.totalAmount,
            currency: quotation.currency,
            clientEmail: quotation.to?.email,
            invoiceNo: quotation.invoiceNo || null,
            guiLink: `${GUI_BASE}/admin/tracking`,
          });
        }
      } catch (e) { return err(e.message); }
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

    // ── GET MY PROFILE ───────────────────────────────────────────────────────
    if (name === 'get_my_profile') {
      const u = await User.findById(userId).populate('companyId', 'name').lean();
      if (!u) return err('Profile not found.');
      return ok({
        _id: u._id.toString(),
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        address: u.address || '',
        role: u.role,
        companyName: u.companyId?.name || 'Individual'
      });
    }

    // ── UPDATE MY PROFILE ────────────────────────────────────────────────────
    if (name === 'update_my_profile') {
      try {
        const { name: newName, email, phone, address } = cleanData(args);
        const updates = {};
        if (newName !== undefined) updates.name = newName;
        if (email !== undefined) updates.email = email;
        if (phone !== undefined) updates.phone = phone;
        if (address !== undefined) updates.address = address;

        const updated = await User.findByIdAndUpdate(
          userId,
          { $set: updates },
          { new: true, runValidators: true }
        ).lean();

        if (!updated) return err('Profile not found');
        return ok({ success: true, record: { ...updated, _id: updated._id.toString() } });
      } catch (e) {
        return handleMongooseError(e);
      }
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

        if (data.sku) {
          const existingSku = await Product.findOne({ sku: data.sku, ...(companyId ? { companyId } : {}) });
          if (existingSku) {
            return err(`A product with SKU "${data.sku}" already exists.`);
          }
        }

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
        if (data.companyId && !mongoose.Types.ObjectId.isValid(data.companyId)) {
           const c = await Company.findOne({ name: new RegExp('^' + String(data.companyId).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + '$', 'i') });
           if (c) data.companyId = c._id;
           else return err(`Could not resolve company: ${data.companyId}`);
        }
        const res = await handleCreate(User, data);
        if (res.content && res.content[0] && !res.content[0].text.includes('error')) {
          const parsed = JSON.parse(res.content[0].text);
          if (parsed.success) {
            sendSystemEmail(parsed.record.email, 'Welcome to Sales App', `<h3>Welcome ${parsed.record.name}!</h3><p>Your account has been created successfully.</p><p>Role: ${parsed.record.role}</p>`);
          }
        }
        return res;
      } catch (e) { return err(e.message); }
    }
    if (name === 'update_user') return await handleUpdate(User, args.id, args.updates);
    if (name === 'delete_user') return await handleDelete(User, args.id);

    // ── COMPANY ──────────────────────────────────────────────────────────────
    if (name === 'create_company') {
      try {
        const data = cleanData(args);
        await resolveCompanyRefs(data);
        const res = await handleCreate(Company, data);
        if (res.content && res.content[0] && !res.content[0].text.includes('error')) {
          const parsed = JSON.parse(res.content[0].text);
          if (parsed.success) {
            sendSystemEmail(parsed.record.email, 'Company Registration Successful', `<h3>Hello ${parsed.record.name}!</h3><p>Your company has been registered successfully.</p>`);
          }
        }
        return res;
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

        let oldDoc = null;
        if (args.id) {
          if (mongoose.Types.ObjectId.isValid(args.id)) {
            oldDoc = await Quotation.findById(args.id);
          } else {
            oldDoc = await Quotation.findOne({ quotationNo: args.id });
          }
        }

        const result = await handleUpdate(Quotation, args.id, updates);

        if (result.content && result.content[0] && !result.content[0].text.includes('error') && updates.status && oldDoc && oldDoc.status !== updates.status) {
          try {
            const userDoc = await User.findById(userId).lean();
            await QuotationStatusHistory.create({
              quotationId: oldDoc._id,
              status: updates.status,
              updateType: 'status_change',
              changedByRole: role,
              changedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
              changedByName: userDoc?.name || role,
              changedByEmail: userDoc?.email || '',
              reason: `Status updated to ${updates.status} via Sales AI chat`,
            });
          } catch (hErr) {
            console.error('[update_quotation] Status history error:', hErr.message);
          }
        }

        return result;
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
        const result = await handleCreate(Invoice, data);

        if (result.content && result.content[0] && !result.content[0].text.includes('error') && data.quotationId) {
          try {
            let quotation = null;
            if (mongoose.Types.ObjectId.isValid(data.quotationId)) {
              quotation = await Quotation.findById(data.quotationId);
            } else {
              quotation = await Quotation.findOne({ quotationNo: data.quotationId });
            }
            if (quotation && quotation.status !== 'paid') {
              quotation.status = 'paid';
              await quotation.save();

              const userDoc = await User.findById(userId).lean();
              await QuotationStatusHistory.create({
                quotationId: quotation._id,
                status: 'paid',
                updateType: 'status_change',
                changedByRole: role,
                changedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
                changedByName: userDoc?.name || role,
                changedByEmail: userDoc?.email || '',
                reason: `Invoice created for quotation`,
              });
            }
          } catch (qErr) {
            console.error('[create_invoice] Quotation status update error:', qErr.message);
          }
        }

        return result;
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
