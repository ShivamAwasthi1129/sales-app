const fs = require('fs');
let content = fs.readFileSync('mcp-server.js', 'utf8');

// 1. Inject mock userContext
const targetAuthLogic = `    // ── All other tools require userContext ──────────────────────────────────
    const ctx = args?.userContext;
    if (!ctx || !ctx.role) return err('User context required. Please log in first.');`;

const newAuthLogic = `    // ── All other tools require userContext ──────────────────────────────────
    let ctx = args?.userContext;
    if (!ctx || !ctx.role) {
      // BYPASS AUTHENTICATION FOR MCP
      ctx = {
        _id: '000000000000000000000000',
        role: 'Super Admin',
        name: 'MCP Auto Admin'
      };
      
    }`;

content = content.replace(targetAuthLogic, newAuthLogic);

// 2. Remove userContext from required arrays
content = content.replace(/required:\s*\[([^\]]*)\]/g, (match, p1) => {
  const items = p1.split(',').map(s => s.trim().replace(/'/g, ''));
  const newItems = items.filter(i => i !== 'userContext' && i !== '');
  if (newItems.length === 0) return 'required: []';
  return 'required: [' + newItems.map(i => "'" + i + "'").join(', ') + ']';
});

// 3. Update the prompt to tell it not to ask for login
content = content.replace(
  'You are Sales AI, an intelligent assistant for the Hexerve Sales Platform.',
  'You are Sales AI, an intelligent assistant for the Hexerve Sales Platform.\n\nCRITICAL RULE: DO NOT ASK THE USER TO LOGIN. You have bypass access to ALL tools without needing userContext. Never ask for email or password.'
);

fs.writeFileSync('mcp-server.js', content);
