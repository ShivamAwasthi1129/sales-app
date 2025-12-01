import connectDB from './mongodb.js';
import Quotation from '../models/Quotation.js';
import User from '../models/User.js';

/**
 * Migrate existing quotations to add companyId based on createdBy user
 * This is a one-time migration to fix existing data
 */
export async function migrateQuotationCompanyIds() {
  await connectDB();
  
  console.log('[Migration] Starting quotation companyId migration...');
  
  try {
    // Find all quotations without companyId
    const quotationsWithoutCompany = await Quotation.find({
      $or: [
        { companyId: null },
        { companyId: { $exists: false } }
      ]
    }).lean();
    
    console.log(`[Migration] Found ${quotationsWithoutCompany.length} quotations without companyId`);
    
    if (quotationsWithoutCompany.length === 0) {
      console.log('[Migration] No quotations to migrate. All quotations already have companyId.');
      return {
        success: true,
        message: 'No quotations to migrate',
        updated: 0,
        failed: 0,
      };
    }
    
    let updated = 0;
    let failed = 0;
    const errors = [];
    
    for (const quotation of quotationsWithoutCompany) {
      try {
        // Get the user who created this quotation
        const creator = await User.findById(quotation.createdBy).lean();
        
        if (creator && creator.companyId) {
          // Update quotation with companyId
          await Quotation.findByIdAndUpdate(
            quotation._id,
            { companyId: creator.companyId },
            { new: false }
          );
          
          updated++;
          console.log(`[Migration] ✅ Updated quotation ${quotation.quotationNo} with companyId: ${creator.companyId}`);
        } else {
          failed++;
          const error = `Quotation ${quotation.quotationNo} - Creator not found or has no company`;
          console.warn(`[Migration] ⚠️  ${error}`);
          errors.push(error);
        }
      } catch (err) {
        failed++;
        const error = `Quotation ${quotation.quotationNo || quotation._id} - ${err.message}`;
        console.error(`[Migration] ❌ ${error}`);
        errors.push(error);
      }
    }
    
    console.log(`[Migration] ==================== SUMMARY ====================`);
    console.log(`[Migration] Total quotations processed: ${quotationsWithoutCompany.length}`);
    console.log(`[Migration] Successfully updated: ${updated}`);
    console.log(`[Migration] Failed: ${failed}`);
    console.log(`[Migration] =====================================================`);
    
    return {
      success: true,
      message: `Migration completed. Updated ${updated} quotations, ${failed} failed.`,
      updated,
      failed,
      errors: errors.length > 0 ? errors : null,
    };
    
  } catch (error) {
    console.error('[Migration] Error during migration:', error);
    return {
      success: false,
      message: `Migration failed: ${error.message}`,
      updated: 0,
      failed: 0,
      error: error.message,
    };
  }
}

/**
 * Sync company quotation counts after migration
 * Counts actual quotations and updates company currentUsage
 */
export async function syncCompanyQuotationCounts() {
  await connectDB();
  
  console.log('[Sync] Starting company quotation count sync...');
  
  try {
    const Company = (await import('../models/Company.js')).default;
    const companies = await Company.find().lean();
    
    console.log(`[Sync] Found ${companies.length} companies to sync`);
    
    let synced = 0;
    
    for (const company of companies) {
      try {
        // Count actual quotations for this company
        const actualCount = await Quotation.countDocuments({
          companyId: company._id,
        });
        
        const storedCount = company.currentUsage?.quotationCount || 0;
        
        if (actualCount !== storedCount) {
          // Update company with correct count
          await Company.findByIdAndUpdate(
            company._id,
            { 'currentUsage.quotationCount': actualCount },
            { new: false }
          );
          
          console.log(`[Sync] ✅ Company ${company.name}: ${storedCount} → ${actualCount}`);
          synced++;
        } else {
          console.log(`[Sync] ✓  Company ${company.name}: ${actualCount} (already correct)`);
        }
      } catch (err) {
        console.error(`[Sync] ❌ Error syncing company ${company.name}:`, err.message);
      }
    }
    
    console.log(`[Sync] ==================== SUMMARY ====================`);
    console.log(`[Sync] Total companies processed: ${companies.length}`);
    console.log(`[Sync] Companies updated: ${synced}`);
    console.log(`[Sync] =====================================================`);
    
    return {
      success: true,
      message: `Sync completed. Updated ${synced} companies.`,
      synced,
    };
    
  } catch (error) {
    console.error('[Sync] Error during sync:', error);
    return {
      success: false,
      message: `Sync failed: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * Run complete migration: update quotations + sync counts
 */
export async function runCompleteMigration() {
  console.log('\n========================================');
  console.log('STARTING COMPLETE QUOTATION MIGRATION');
  console.log('========================================\n');
  
  // Step 1: Migrate quotation companyIds
  const migrationResult = await migrateQuotationCompanyIds();
  
  if (!migrationResult.success) {
    console.error('\n❌ Migration failed. Stopping...\n');
    return migrationResult;
  }
  
  console.log('\n');
  
  // Step 2: Sync company counts
  const syncResult = await syncCompanyQuotationCounts();
  
  console.log('\n========================================');
  console.log('MIGRATION COMPLETE');
  console.log('========================================\n');
  
  return {
    success: true,
    migration: migrationResult,
    sync: syncResult,
  };
}

