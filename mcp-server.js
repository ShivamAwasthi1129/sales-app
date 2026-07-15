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

function createMCPServer() {
  const mcpServer = new Server(
    { name: 'sales-app-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  // Define tools
  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'login',
          description: 'Authenticate a user with email and password.',
          inputSchema: {
            type: 'object',
            properties: { email: { type: 'string' }, password: { type: 'string' } },
            required: ['email', 'password']
          },
        },
        { name: 'get_products', description: 'Fetch available products.', inputSchema: { type: 'object', properties: {} } },
        { name: 'get_users', description: 'Fetch registered users.', inputSchema: { type: 'object', properties: {} } },
        { name: 'get_companies', description: 'Fetch companies.', inputSchema: { type: 'object', properties: {} } },
        { name: 'get_quotations', description: 'Fetch quotations.', inputSchema: { type: 'object', properties: {} } },
        { name: 'get_invoices', description: 'Fetch invoices.', inputSchema: { type: 'object', properties: {} } },
        { name: 'get_subscriptions', description: 'Fetch subscriptions.', inputSchema: { type: 'object', properties: {} } },
        { name: 'get_plans', description: 'Fetch pricing plans.', inputSchema: { type: 'object', properties: {} } },
        { name: 'get_coupons', description: 'Fetch discount coupons.', inputSchema: { type: 'object', properties: {} } },
        {
          name: 'update_record',
          description: 'Update a specific record in the database.',
          inputSchema: {
            type: 'object',
            properties: {
              modelName: { type: 'string' },
              id: { type: 'string' },
              updates: { type: 'object' }
            },
            required: ['modelName', 'id', 'updates']
          }
        }
      ],
    };
  });

  // Handle tool execution
  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    await connectDB(); // Ensure DB is connected

    if (name === 'login') {
      const { email, password } = args || {};
      const user = await User.findOne({ email }).select('+password').lean();
      if (!user) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Invalid email or password' }) }] };
      const bcrypt = await import('bcryptjs');
      const isMatch = await bcrypt.default.compare(password, user.password);
      if (!isMatch) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Invalid email or password' }) }] };
      delete user.password;
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, user }) }] };
    }
    
    if (name === 'get_products') return { content: [{ type: 'text', text: JSON.stringify(await Product.find({}).limit(20).lean()) }] };
    if (name === 'get_users') return { content: [{ type: 'text', text: JSON.stringify(await User.find({}).select('-password').limit(20).lean()) }] };
    if (name === 'get_companies') return { content: [{ type: 'text', text: JSON.stringify(await Company.find({}).limit(20).lean()) }] };
    if (name === 'get_quotations') return { content: [{ type: 'text', text: JSON.stringify(await Quotation.find({}).limit(20).lean()) }] };
    if (name === 'get_invoices') return { content: [{ type: 'text', text: JSON.stringify(await Invoice.find({}).limit(20).lean()) }] };
    if (name === 'get_subscriptions') return { content: [{ type: 'text', text: JSON.stringify(await Subscription.find({}).limit(20).lean()) }] };
    if (name === 'get_plans') return { content: [{ type: 'text', text: JSON.stringify(await Plan.find({}).limit(20).lean()) }] };
    if (name === 'get_coupons') return { content: [{ type: 'text', text: JSON.stringify(await Coupon.find({}).limit(20).lean()) }] };

    if (name === 'update_record') {
      const { modelName, id, updates } = args || {};
      const models = {
        'Products': Product,
        'Users': User,
        'Companies': Company,
        'Quotations': Quotation,
        'Invoices': Invoice,
        'Subscriptions': Subscription,
        'Pricing Plans': Plan,
        'Coupons': Coupon
      };
      
      const Model = models[modelName];
      if (!Model) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown model: ${modelName}` }) }] };
      }

      if (modelName === 'Users' && updates.password) {
        delete updates.password;
      }
      
      const updatedRecord = await Model.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).lean();
      
      if (!updatedRecord) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Record not found` }) }] };
      }
      
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, record: updatedRecord }) }] };
    }

    throw new Error(`Tool not found: ${name}`);
  });

  return mcpServer;
}

// ----------------------------------------------------
// Startup Logic (STDIO vs SSE)
// ----------------------------------------------------

if (process.argv.includes('stdio')) {
  // RUN IN STDIO MODE (For Claude Desktop, Cursor, etc.)
  const transport = new StdioServerTransport();
  const mcpServer = createMCPServer();
  
  mcpServer.connect(transport).catch((err) => {
    console.error("STDIO connection error:", err);
    process.exit(1);
  });

} else {
  // RUN IN SSE / EXPRESS MODE (For Web Clients)
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
    } else {
      if (!sessionId && mcpServers.size > 0) {
        const fallbackTransport = Array.from(mcpServers.values())[0];
        await fallbackTransport.handlePostMessage(req, res);
      } else {
        res.status(500).send('SSE transport not initialized or invalid session.');
      }
    }
  });
  
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`Sales App MCP Server running on port ${PORT} (SSE Mode)`);
    console.log(`SSE connection URL: http://localhost:${PORT}/mcp/sse`);
    console.log(`To run in STDIO mode instead, append 'stdio' to the command (e.g. node mcp-server.js stdio)`);
  });
}
