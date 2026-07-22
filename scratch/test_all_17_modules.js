import connectDB from '../lib/mongodb.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Product from '../models/Product.js';
import Group from '../models/Group.js';
import Attribute from '../models/Attribute.js';
import AttributeOption from '../models/AttributeOption.js';
import Price from '../models/Price.js';
import Quotation from '../models/Quotation.js';
import QuotationStatusHistory from '../models/QuotationStatusHistory.js';
import QuotationChange from '../models/QuotationChange.js';
import Invoice from '../models/Invoice.js';
import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';
import Coupon from '../models/Coupon.js';
import TaxRate from '../models/TaxRate.js';
import NotesAndTerms from '../models/NotesAndTerms.js';
import UserCompanyRole from '../models/UserCompanyRole.js';

async function runFull17ModuleAudit() {
  console.log('=== STARTING FULL 17-MODULE AUDIT ===');
  await connectDB();

  const results = {};

  const models = [
    { name: 'User', model: User },
    { name: 'Company', model: Company },
    { name: 'Product', model: Product },
    { name: 'Group', model: Group },
    { name: 'Attribute', model: Attribute },
    { name: 'AttributeOption', model: AttributeOption },
    { name: 'Price', model: Price },
    { name: 'Quotation', model: Quotation },
    { name: 'QuotationStatusHistory', model: QuotationStatusHistory },
    { name: 'QuotationChange', model: QuotationChange },
    { name: 'Invoice', model: Invoice },
    { name: 'Subscription', model: Subscription },
    { name: 'Plan', model: Plan },
    { name: 'Coupon', model: Coupon },
    { name: 'TaxRate', model: TaxRate },
    { name: 'NotesAndTerms', model: NotesAndTerms },
    { name: 'UserCompanyRole', model: UserCompanyRole }
  ];

  for (const { name, model } of models) {
    try {
      const count = await model.countDocuments();
      results[name] = { status: 'PASSED', count };
      console.log(`[PASS] ${name}: ${count} records found.`);
    } catch (err) {
      results[name] = { status: 'FAILED', error: err.message };
      console.error(`[FAIL] ${name}: ${err.message}`);
    }
  }

  console.log('=== SUMMARY OF AUDIT ===');
  console.table(results);
  process.exit(0);
}

runFull17ModuleAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
