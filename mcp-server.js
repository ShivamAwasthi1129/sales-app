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
import Price from './models/Price.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// ─── Role Permission Matrix ───────────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  'Super Admin': ['login', 'get_products', 'get_users', 'get_companies', 'get_quotations', 'get_invoices', 'get_subscriptions', 'get_plans', 'get_coupons', 'get_dashboard_stats', 'get_groups', 'get_attributes', 'get_prices', 'create_product', 'update_product', 'delete_product', 'create_user', 'update_user', 'delete_user', 'create_company', 'update_company', 'delete_company', 'create_quotation', 'update_quotation', 'delete_quotation', 'create_invoice', 'update_invoice', 'delete_invoice', 'create_subscription', 'update_subscription', 'delete_subscription'],
  'Admin':       ['login', 'get_products', 'get_users', 'get_companies', 'get_quotations', 'get_invoices', 'get_subscriptions', 'get_plans', 'get_coupons', 'get_dashboard_stats', 'get_groups', 'get_attributes', 'get_prices', 'create_product', 'update_product', 'delete_product', 'create_user', 'update_user', 'delete_user', 'create_company', 'update_company', 'delete_company', 'create_quotation', 'update_quotation', 'delete_quotation', 'create_invoice', 'update_invoice', 'delete_invoice', 'create_subscription', 'update_subscription', 'delete_subscription'],
  'Sales Person':['login', 'get_products', 'get_users', 'get_quotations', 'get_invoices', 'get_dashboard_stats', 'get_groups', 'get_attributes', 'get_prices', 'create_product', 'update_product', 'delete_product', 'create_user', 'update_user', 'delete_user', 'create_quotation', 'update_quotation', 'delete_quotation', 'create_invoice', 'update_invoice', 'delete_invoice'],
  'Customer':    ['login', 'get_products', 'get_quotations', 'get_invoices', 'get_subscriptions'],
};

function hasPermission(role, toolName) {
  if (toolName === 'login') return true;
  return (ROLE_PERMISSIONS[role] || []).includes(toolName);
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────
function createMCPServer() {
  const mcpServer = new Server(
    { name: 'sales-app-mcp', version: '2.0.0' },
    { capabilities: { tools: {} } }
  );

  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
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
        {
          name: 'get_products',
          description: 'Fetch products. Filtered by company for Admin/Sales Person/Customer. Super Admin sees all.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object', description: 'Authenticated user context (role, userId, companyId)' }
            },
            required: ['userContext']
          },
        },
        {
          name: 'get_users',
          description: 'Fetch users. Admin sees company users only. Super Admin sees all.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' }
            },
            required: ['userContext']
          },
        },
        {
          name: 'get_companies',
          description: 'Fetch companies. Super Admin only sees all. Admin sees their own company info.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' }
            },
            required: ['userContext']
          },
        },
        {
          name: 'get_quotations',
          description: 'Fetch quotations. Role-filtered: Admin=company, Sales Person=own, Customer=own.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' }
            },
            required: ['userContext']
          },
        },
        {
          name: 'get_invoices',
          description: 'Fetch invoices. Role-filtered: Admin/Sales Person=company, Customer=own.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' }
            },
            required: ['userContext']
          },
        },
        {
          name: 'get_subscriptions',
          description: 'Fetch subscriptions. Super Admin/Admin sees all or company. Customer sees own.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' }
            },
            required: ['userContext']
          },
        },
        {
          name: 'get_plans',
          description: 'Fetch pricing plans. Super Admin only.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' }
            },
            required: ['userContext']
          },
        },
        {
          name: 'get_coupons',
          description: 'Fetch discount coupons. Admin sees company coupons. Super Admin sees all.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' }
            },
            required: ['userContext']
          },
        },
        {
          name: 'get_dashboard_stats',
          description: 'Get summary statistics for the logged-in user\'s dashboard.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' }
            },
            required: ['userContext']
          },
        },
        // ─── SPECIFIC CREATE/UPDATE/DELETE TOOLS ──────────────────────────────────────────
        {
          name: 'create_product',
          description: 'Create a new Product. Admins/Sales can do this for their company.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              name: { type: 'string', description: 'Product name' },
              description: { type: 'string' },
              image: { type: 'string', description: 'URL to product image' },
              groupId: { type: 'string', description: 'Group name or ID' },
              attributes: { type: 'array', items: { type: 'string' }, description: 'Array of attribute names or IDs' },
              basePrice: { type: 'string', description: 'Price nickname or ID' },
              discount: { type: 'number', description: 'Discount percentage (0-100)' },
              billingMode: { type: 'string', enum: ['subscription', 'one-time'] },
              tags: { type: 'array', items: { type: 'string' } }
            },
            required: ['userContext', 'name', 'groupId']
          }
        },
        {
          name: 'update_product',
          description: 'Update an existing Product.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              id: { type: 'string', description: 'Product ID' },
              updates: { type: 'object', description: 'Fields to update (name, description, etc.)' }
            },
            required: ['userContext', 'id', 'updates']
          }
        },
        {
          name: 'delete_product',
          description: 'Delete a Product by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['userContext', 'id'] }
        },
        {
          name: 'create_invoice',
          description: 'Create a new Invoice.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              quotationId: { type: 'string', description: 'ID of the related Quotation' },
              quotationNo: { type: 'string', description: 'Quotation number' },
              customerId: { type: 'string', description: 'Customer Name or ID' },
              dueDate: { type: 'string', description: 'ISO date string' },
              billTo: { 
                type: 'object', 
                properties: { businessName: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, address: { type: 'string' }, country: { type: 'string' } },
                required: ['businessName', 'email']
              },
              billFrom: { 
                type: 'object', 
                properties: { businessName: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, address: { type: 'string' }, country: { type: 'string' } },
                required: ['businessName']
              },
              lineItems: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    productId: { type: 'string', description: 'Product name or ID' },
                    itemName: { type: 'string' },
                    quantity: { type: 'number' },
                    rate: { type: 'number' },
                    amount: { type: 'number' },
                    total: { type: 'number' },
                    isSubscription: { type: 'boolean' }
                  },
                  required: ['itemName', 'quantity', 'rate', 'amount', 'total']
                }
              },
              currency: { type: 'string', default: 'USD' },
              subtotal: { type: 'number' },
              totalAmount: { type: 'number' },
              status: { type: 'string', enum: ['draft', 'sent', 'paid', 'cancelled', 'overdue'] }
            },
            required: ['userContext', 'quotationId', 'quotationNo', 'customerId', 'billTo', 'billFrom', 'subtotal', 'totalAmount']
          }
        },
        {
          name: 'update_invoice',
          description: 'Update an existing Invoice.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['userContext', 'id', 'updates'] }
        },
        {
          name: 'delete_invoice',
          description: 'Delete an Invoice by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['userContext', 'id'] }
        },
        {
          name: 'create_quotation',
          description: 'Create a new Quotation.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              dueDate: { type: 'string' },
              from: { type: 'object', properties: { businessName: { type: 'string' }, email: { type: 'string' }, salesPersonName: { type: 'string' } } },
              to: { type: 'object', properties: { businessName: { type: 'string' }, email: { type: 'string' } } },
              currency: { type: 'string' },
              lineItems: { type: 'array', items: { type: 'object' } },
              subtotal: { type: 'number' },
              totalAmount: { type: 'number' },
              status: { type: 'string', enum: ['draft', 'sent'] }
            },
            required: ['userContext', 'currency', 'subtotal', 'totalAmount']
          }
        },
        {
          name: 'update_quotation',
          description: 'Update an existing Quotation.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['userContext', 'id', 'updates'] }
        },
        {
          name: 'delete_quotation',
          description: 'Delete a Quotation by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['userContext', 'id'] }
        },
        {
          name: 'create_user',
          description: 'Create a new User (Customer, Admin, Sales Person).',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              name: { type: 'string' },
              email: { type: 'string' },
              password: { type: 'string' },
              role: { type: 'string', enum: ['Super Admin', 'Admin', 'Customer', 'Sales Person'] },
              phone: { type: 'string' },
              status: { type: 'string', enum: ['Active', 'Inactive'] }
            },
            required: ['userContext', 'name', 'email', 'password', 'role']
          }
        },
        {
          name: 'update_user',
          description: 'Update an existing User.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['userContext', 'id', 'updates'] }
        },
        {
          name: 'delete_user',
          description: 'Delete a User by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['userContext', 'id'] }
        },
        {
          name: 'create_company',
          description: 'Create a new Company (Super Admin only usually).',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              name: { type: 'string' },
              email: { type: 'string' },
              planId: { type: 'string', description: 'Plan Name or ID' }
            },
            required: ['userContext', 'name', 'email', 'planId']
          }
        },
        {
          name: 'update_company',
          description: 'Update an existing Company.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' }, updates: { type: 'object' } }, required: ['userContext', 'id', 'updates'] }
        },
        {
          name: 'delete_company',
          description: 'Delete a Company by ID.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' }, id: { type: 'string' } }, required: ['userContext', 'id'] }
        },
        {
          name: 'create_subscription',
          description: 'Create a Subscription.',
          inputSchema: {
            type: 'object',
            properties: {
              userContext: { type: 'object' },
              userId: { type: 'string' },
              stripeSubscriptionId: { type: 'string' },
              stripeCustomerId: { type: 'string' },
              status: { type: 'string' }
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
        {
          name: 'get_groups',
          description: 'Fetch product groups for the current company.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: ['userContext'] }
        },
        {
          name: 'get_attributes',
          description: 'Fetch product attributes for the current company.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: ['userContext'] }
        },
        {
          name: 'get_prices',
          description: 'Fetch prices for the current company.',
          inputSchema: { type: 'object', properties: { userContext: { type: 'object' } }, required: ['userContext'] }
        }
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
        }
      });
    }

    // ── All other tools require userContext ──────────────────────────────────
    const ctx = args?.userContext;
    if (!ctx || !ctx.role) return err('User context required. Please log in first.');
    if (!hasPermission(ctx.role, name)) return err(`Access denied. Your role (${ctx.role}) cannot perform: ${name}`);

    const userId = ctx._id || ctx.userId;
    const companyId = ctx.companyId;
    const role = ctx.role;

    // ── GET PRODUCTS ─────────────────────────────────────────────────────────
    if (name === 'get_products') {
      let query = {};

      if (role === 'Super Admin') {
        query = {};
      } else if (companyId) {
        // Admin, Sales Person, Customer — filter by their company
        query = { companyId: new mongoose.Types.ObjectId(companyId) };
      } else if (role === 'Sales Person' && userId) {
        // Fetch companyId from DB for Sales Person if not in context
        const sp = await User.findById(userId).select('companyId').lean();
        if (sp?.companyId) {
          query = { companyId: sp.companyId };
        } else {
          return ok([]);
        }
      } else {
        return ok([]);
      }

      const products = await Product.find(query)
        .select('name description image billingMode discount tags createdAt')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      return ok(products.map(p => ({
        ...p,
        _id: p._id.toString(),
        companyId: p.companyId?.toString() || null,
        createdAt: p.createdAt?.toISOString(),
        updatedAt: p.updatedAt?.toISOString(),
      })));
    }

    // ── GET USERS ────────────────────────────────────────────────────────────
    if (name === 'get_users') {
      let filter = {};

      if (role === 'Super Admin') {
        filter = {};
      } else if (role === 'Admin' && companyId) {
        filter = { companyId: new mongoose.Types.ObjectId(companyId) };
      } else if (role === 'Sales Person' && companyId) {
        // Sales Person can see customers of their company
        filter = { companyId: new mongoose.Types.ObjectId(companyId), role: { $in: ['Customer', 'Sales Person'] } };
      } else {
        return err(`Users list not accessible for role: ${role}`);
      }

      const users = await User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      return ok(users.map(u => ({
        ...u,
        _id: u._id.toString(),
        companyId: u.companyId?.toString() || null,
        createdAt: u.createdAt?.toISOString(),
        updatedAt: u.updatedAt?.toISOString(),
      })));
    }

    // ── GET COMPANIES ────────────────────────────────────────────────────────
    if (name === 'get_companies') {
      if (role === 'Super Admin') {
        const companies = await Company.find().sort({ createdAt: -1 }).limit(50).lean();
        return ok(companies.map(c => ({
          ...c,
          _id: c._id.toString(),
          adminId: c.adminId?.toString() || null,
          planId: c.planId?.toString() || null,
          createdAt: c.createdAt?.toISOString(),
          updatedAt: c.updatedAt?.toISOString(),
        })));
      } else if (companyId) {
        // Admin/Sales Person — show only their company info
        const company = await Company.findById(companyId).lean();
        if (!company) return ok([]);
        return ok([{
          ...company,
          _id: company._id.toString(),
          adminId: company.adminId?.toString() || null,
          planId: company.planId?.toString() || null,
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
        // Admin sees all company quotations
        const companyUsers = await User.find({ companyId: new mongoose.Types.ObjectId(companyId) }).select('_id').lean();
        const userIds = companyUsers.map(u => u._id);
        filter = {
          $or: [
            { companyId: new mongoose.Types.ObjectId(companyId) },
            { $and: [
              { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
              { createdBy: { $in: userIds } }
            ]}
          ]
        };
      } else if (role === 'Sales Person') {
        // Sales Person sees only their own quotations
        const sp = await User.findById(userId).lean();
        if (!sp) return ok([]);
        const spCompanyId = sp.companyId?.toString();
        const salesPersonId = sp.salesPersonId;

        if (spCompanyId) {
          filter = {
            $and: [
              { $or: [
                { companyId: new mongoose.Types.ObjectId(spCompanyId) },
                { $or: [{ companyId: { $exists: false } }, { companyId: null }] }
              ]},
              { $or: [
                { createdBy: new mongoose.Types.ObjectId(userId) },
                ...(salesPersonId ? [{ 'from.salesPersonId': salesPersonId }] : [])
              ]}
            ]
          };
        } else {
          filter = { createdBy: new mongoose.Types.ObjectId(userId) };
        }
      } else if (role === 'Customer') {
        // Customer sees only their own quotations (by email)
        const customer = await User.findById(userId).lean();
        if (!customer) return ok([]);
        const customerEmail = customer.email?.toLowerCase();
        filter = {
          $or: [
            { 'to.email': { $regex: new RegExp(`^${customerEmail}$`, 'i') } },
            { customerId: new mongoose.Types.ObjectId(userId) }
          ]
        };
      } else {
        return err('Not authorized to view quotations.');
      }

      const quotations = await Quotation.find(filter)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      return ok(quotations.map(q => ({
        ...q,
        _id: q._id.toString(),
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
        const customerEmail = customer?.email?.toLowerCase();
        const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        invoices = await Invoice.find({
          $or: [
            { customerId: new mongoose.Types.ObjectId(userId) },
            ...(customerEmail ? [{ 'billTo.email': { $regex: new RegExp(`^${escapeRegex(customerEmail)}$`, 'i') } }] : [])
          ]
        }).sort({ createdAt: -1 }).limit(50).lean();
      } else {
        return err('Not authorized to view invoices.');
      }

      return ok(invoices.map(inv => ({
        ...inv,
        _id: inv._id.toString(),
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

      if (role === 'Super Admin') {
        filter = {};
      } else if (role === 'Admin' && companyId) {
        filter = { companyId: new mongoose.Types.ObjectId(companyId) };
      } else if (role === 'Customer') {
        filter = { customerId: new mongoose.Types.ObjectId(userId) };
      } else {
        return err(`Subscriptions not accessible for role: ${role}`);
      }

      const subs = await Subscription.find(filter).sort({ createdAt: -1 }).limit(50).lean();
      return ok(subs.map(s => ({
        ...s,
        _id: s._id.toString(),
        companyId: s.companyId?.toString() || null,
        customerId: s.customerId?.toString() || null,
        planId: s.planId?.toString() || null,
        createdAt: s.createdAt?.toISOString(),
        updatedAt: s.updatedAt?.toISOString(),
      })));
    }

    // ── GET PLANS ────────────────────────────────────────────────────────────
    if (name === 'get_plans') {
      if (role !== 'Super Admin') return err('Plans are only accessible to Super Admin.');
      const plans = await Plan.find().sort({ displayOrder: 1, createdAt: -1 }).lean();
      return ok(plans.map(p => ({
        ...p,
        _id: p._id.toString(),
        createdAt: p.createdAt?.toISOString(),
        updatedAt: p.updatedAt?.toISOString(),
      })));
    }

    // ── GET COUPONS ──────────────────────────────────────────────────────────
    if (name === 'get_coupons') {
      if (!['Super Admin', 'Admin', 'Sales Person'].includes(role)) {
        return err('Coupons not accessible for your role.');
      }
      let filter = {};
      if (role !== 'Super Admin' && companyId) {
        filter = { companyId: new mongoose.Types.ObjectId(companyId) };
      } else if (role !== 'Super Admin') {
        return err('Company information missing.');
      }

      const coupons = await Coupon.find(filter).sort({ createdAt: -1 }).limit(50).lean();
      return ok(coupons.map(c => ({
        ...c,
        _id: c._id.toString(),
        companyId: c.companyId?.toString() || null,
        createdAt: c.createdAt?.toISOString(),
        updatedAt: c.updatedAt?.toISOString(),
      })));
    }

    // ── GET DASHBOARD STATS ──────────────────────────────────────────────────
    if (name === 'get_dashboard_stats') {
      const stats = {};

      if (role === 'Super Admin') {
        stats.totalUsers     = await User.countDocuments();
        stats.totalCompanies = await Company.countDocuments();
        stats.totalProducts  = await Product.countDocuments();
        stats.totalQuotations= await Quotation.countDocuments();
        stats.totalInvoices  = await Invoice.countDocuments();
        stats.totalPlans     = await Plan.countDocuments();
      } else if ((role === 'Admin' || role === 'Sales Person') && companyId) {
        const coid = new mongoose.Types.ObjectId(companyId);
        stats.totalProducts  = await Product.countDocuments({ companyId: coid });
        stats.totalQuotations= await Quotation.countDocuments({ companyId: coid });
        stats.totalInvoices  = await Invoice.countDocuments({ companyId: coid });
        stats.teamSize       = await User.countDocuments({ companyId: coid });
        if (role === 'Sales Person') {
          stats.myQuotations = await Quotation.countDocuments({ createdBy: new mongoose.Types.ObjectId(userId) });
        }
      } else if (role === 'Customer') {
        const customer = await User.findById(userId).lean();
        const email = customer?.email?.toLowerCase();
        stats.myQuotations = await Quotation.countDocuments({
          'to.email': { $regex: new RegExp(`^${email}$`, 'i') }
        });
        stats.myInvoices = await Invoice.countDocuments({
          $or: [
            { customerId: new mongoose.Types.ObjectId(userId) },
            ...(email ? [{ 'billTo.email': { $regex: new RegExp(`^${email}$`, 'i') } }] : [])
          ]
        });
      }

      return ok({ stats, role });
    }


    // ─── Helper for ID Resolution ──────────────────────────────────────────
    const resolveId = async (modelToSearch, query, errorMessage) => {
      if (typeof query === 'string' && mongoose.Types.ObjectId.isValid(query)) return query;
      const doc = await modelToSearch.findOne(query).lean();
      if (doc) return doc._id;
      throw new Error(errorMessage);
    };

    // ─── Helper for Error Handling ─────────────────────────────────────────
    const handleMongooseError = (e) => {
      if (e.name === 'ValidationError') {
        const messages = Object.values(e.errors).map(val => val.message);
        return err(`Validation Error: ${messages.join(', ')}`);
      }
      return err(e.message || 'Database error occurred');
    };

    // ─── SPECIFIC HANDLERS ─────────────────────────────────────────────────

    const handleCreate = async (Model, data) => {
      try {
        if (['Admin', 'Sales Person'].includes(role) && companyId && !data.companyId) {
          data.companyId = companyId;
        }
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
          id,
          { $set: updates },
          { new: true, runValidators: true }
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

    // PRODUCTS
    if (name === 'create_product') {
      try {
        const data = args;
        delete data.userContext;
        if (data.groupId && !mongoose.Types.ObjectId.isValid(data.groupId)) {
          data.groupId = await resolveId(Group, { name: new RegExp('^' + data.groupId + '$', 'i'), companyId: companyId || data.companyId }, `Could not resolve group name "${data.groupId}".`);
        }
        if (data.basePrice && !mongoose.Types.ObjectId.isValid(data.basePrice)) {
          data.basePrice = await resolveId(Price, { nickname: new RegExp('^' + data.basePrice + '$', 'i') }, `Could not resolve basePrice name "${data.basePrice}".`);
        }
        return await handleCreate(Product, data);
      } catch (e) { return err(e.message); }
    }
    if (name === 'update_product') return await handleUpdate(Product, args.id, args.updates);
    if (name === 'delete_product') return await handleDelete(Product, args.id);

    // USERS
    if (name === 'create_user') return await handleCreate(User, { ...args, userContext: undefined });
    if (name === 'update_user') return await handleUpdate(User, args.id, args.updates);
    if (name === 'delete_user') return await handleDelete(User, args.id);

    // COMPANIES
    if (name === 'create_company') {
      try {
        const data = { ...args };
        delete data.userContext;
        if (data.planId && !mongoose.Types.ObjectId.isValid(data.planId)) {
          data.planId = await resolveId(Plan, { name: new RegExp('^' + data.planId + '$', 'i') }, `Could not resolve plan name "${data.planId}".`);
        }
        return await handleCreate(Company, data);
      } catch (e) { return err(e.message); }
    }
    if (name === 'update_company') return await handleUpdate(Company, args.id, args.updates);
    if (name === 'delete_company') return await handleDelete(Company, args.id);

    // QUOTATIONS
    if (name === 'create_quotation') {
      try {
        const data = { ...args };
        delete data.userContext;
        const items = data.lineItems || [];
        for (const item of items) {
          if (item.productId && !mongoose.Types.ObjectId.isValid(item.productId)) {
            item.productId = await resolveId(Product, { name: new RegExp('^' + item.productId + '$', 'i'), companyId: companyId || data.companyId }, `Could not resolve product name "${item.productId}".`);
          }
        }
        data.createdBy = userId;
        return await handleCreate(Quotation, data);
      } catch (e) { return err(e.message); }
    }
    if (name === 'update_quotation') return await handleUpdate(Quotation, args.id, args.updates);
    if (name === 'delete_quotation') return await handleDelete(Quotation, args.id);

    // INVOICES
    if (name === 'create_invoice') {
      try {
        const data = { ...args };
        delete data.userContext;
        if (data.customerId && !mongoose.Types.ObjectId.isValid(data.customerId)) {
          data.customerId = await resolveId(User, { name: new RegExp('^' + data.customerId + '$', 'i'), companyId: companyId || data.companyId }, `Could not resolve customer name "${data.customerId}".`);
        }
        const items = data.lineItems || [];
        for (const item of items) {
          if (item.productId && !mongoose.Types.ObjectId.isValid(item.productId)) {
            item.productId = await resolveId(Product, { name: new RegExp('^' + item.productId + '$', 'i'), companyId: companyId || data.companyId }, `Could not resolve product name "${item.productId}".`);
          }
        }
        data.createdBy = userId;
        return await handleCreate(Invoice, data);
      } catch (e) { return err(e.message); }
    }
    if (name === 'update_invoice') return await handleUpdate(Invoice, args.id, args.updates);
    if (name === 'delete_invoice') return await handleDelete(Invoice, args.id);

    // SUBSCRIPTIONS
    if (name === 'create_subscription') {
      try {
        const data = { ...args };
        delete data.userContext;
        if (data.userId && !mongoose.Types.ObjectId.isValid(data.userId)) {
          data.userId = await resolveId(User, { name: new RegExp('^' + data.userId + '$', 'i'), companyId: companyId || data.companyId }, `Could not resolve user name "${data.userId}".`);
        }
        return await handleCreate(Subscription, data);
      } catch (e) { return err(e.message); }
    }
    if (name === 'update_subscription') return await handleUpdate(Subscription, args.id, args.updates);
    if (name === 'delete_subscription') return await handleDelete(Subscription, args.id);

    // ── RELATIONAL DATA DROPDOWNS ────────────────────────────────────────────
    const filterByCompany = role === 'Super Admin' ? {} : { companyId: new mongoose.Types.ObjectId(companyId) };

    if (name === 'get_groups') {
      const records = await Group.find(filterByCompany).limit(50).lean();
      return ok(records);
    }
    if (name === 'get_attributes') {
      const records = await Attribute.find(role === 'Super Admin' ? {} : {}).limit(50).lean(); // Attributes might be global? Wait, Attribute schema doesn't have companyId.
      return ok(records);
    }
    if (name === 'get_prices') {
      const records = await Price.find(role === 'Super Admin' ? {} : {}).limit(50).lean(); // Price schema has productId, no companyId directly.
      return ok(records);
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
    console.log(`Sales App MCP Server v2.0 running on port ${PORT} (SSE Mode)`);
    console.log(`SSE connection URL: http://localhost:${PORT}/mcp/sse`);
    console.log('Role-based data filtering: ENABLED');
  });
}
