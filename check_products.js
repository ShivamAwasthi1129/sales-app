import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const users = await mongoose.connection.collection('users').find({ role: 'Admin' }).toArray();
  console.log('Admin users:', users.map(u => ({ email: u.email, companyId: u.companyId })));

  const products = await mongoose.connection.collection('products').find().toArray();
  console.log('Products count:', products.length);
  
  if (products.length > 0) {
    const counts = {};
    products.forEach(p => {
      const cid = p.companyId ? p.companyId.toString() : 'null';
      counts[cid] = (counts[cid] || 0) + 1;
    });
    console.log('Products by companyId:', counts);
  }

  process.exit(0);
}

check().catch(console.error);
