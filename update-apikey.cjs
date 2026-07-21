const fs = require('fs');

// 1. Update mcp-server.js
let code = fs.readFileSync('mcp-server.js', 'utf8');
code = code.replace(
  /'re_Ts2ZP2zs_BHfbbHdNH5QmP2r1UezvjBFp'/g,
  'process.env.RESEND_API_KEY'
);
fs.writeFileSync('mcp-server.js', code);

// 2. Append to .env.local
let envVars = fs.readFileSync('.env.local', 'utf8');
if (!envVars.includes('RESEND_API_KEY=')) {
  fs.appendFileSync('.env.local', '\nRESEND_API_KEY=re_Q3JHKhPK_EyqrjhPST6zrPFFfBFAGnSA4\n');
}
