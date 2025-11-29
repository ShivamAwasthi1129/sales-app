import Company from '../models/Company.js';
import User from '../models/User.js';
import connectDB from './mongodb.js';

/**
 * Check if a company can add more users of a specific role
 * @param {String} companyId - The company ID
 * @param {String} role - The user role to check
 * @returns {Promise<{canAdd: Boolean, message: String, currentUsage: Number, limit: Number}>}
 */
export async function checkUserLimitForCompany(companyId, role) {
  await connectDB();
  
  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error('Company not found');
  }

  let currentUsage = 0;
  let limit = 0;
  let limitType = '';

  if (role === 'Sales Person') {
    // FIXED: Get actual count from database instead of relying on stored count
    currentUsage = await User.countDocuments({ 
      companyId: companyId, 
      role: 'Sales Person',
      status: { $ne: 'Deleted' } // Exclude deleted users
    });
    limit = company.planLimits.salesPersonLimit;
    limitType = 'sales person';
    
    // Sync the count if it's different
    if (currentUsage !== company.currentUsage.salesPersonCount) {
      console.log(`[SYNC] Syncing salesPersonCount for company ${companyId}: stored=${company.currentUsage.salesPersonCount}, actual=${currentUsage}`);
      await Company.findByIdAndUpdate(companyId, {
        'currentUsage.salesPersonCount': currentUsage
      });
    }
  } else {
    // FIXED: Get actual count from database for other users
    currentUsage = await User.countDocuments({ 
      companyId: companyId, 
      role: { $in: ['Admin', 'Customer'] },
      status: { $ne: 'Deleted' }
    });
    limit = company.planLimits.usersLimit;
    limitType = 'user';
    
    // Sync the count if it's different
    if (currentUsage !== company.currentUsage.usersCount) {
      console.log(`[SYNC] Syncing usersCount for company ${companyId}: stored=${company.currentUsage.usersCount}, actual=${currentUsage}`);
      await Company.findByIdAndUpdate(companyId, {
        'currentUsage.usersCount': currentUsage
      });
    }
  }

  const canAdd = currentUsage < limit;
  
  return {
    canAdd,
    message: canAdd 
      ? `You can add ${limit - currentUsage} more ${limitType}${limit - currentUsage > 1 ? 's' : ''}`
      : `You have reached your ${limitType} limit (${limit}). Please upgrade your plan to add more ${limitType}s.`,
    currentUsage,
    limit,
    company,
  };
}

/**
 * Check if a company can create more quotations
 * @param {String} companyId - The company ID
 * @returns {Promise<{canAdd: Boolean, message: String, currentUsage: Number, limit: Number}>}
 */
export async function checkQuotationLimitForCompany(companyId) {
  await connectDB();
  
  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error('Company not found');
  }

  const currentUsage = company.currentUsage.quotationCount;
  const limit = company.planLimits.quotationLimit;
  const canAdd = currentUsage < limit;
  
  return {
    canAdd,
    message: canAdd 
      ? `You can create ${limit - currentUsage} more quotation${limit - currentUsage > 1 ? 's' : ''} this month`
      : `You have reached your quotation limit (${limit}). Please upgrade your plan to create more quotations.`,
    currentUsage,
    limit,
    company,
  };
}

/**
 * Increment user count for a company
 * @param {String} companyId - The company ID
 * @param {String} role - The user role
 * @returns {Promise<Company>}
 */
export async function incrementUserCount(companyId, role) {
  await connectDB();
  
  const updateField = role === 'Sales Person' 
    ? 'currentUsage.salesPersonCount' 
    : 'currentUsage.usersCount';

  const company = await Company.findByIdAndUpdate(
    companyId,
    { $inc: { [updateField]: 1 } },
    { new: true }
  );

  return company;
}

/**
 * Decrement user count for a company
 * @param {String} companyId - The company ID
 * @param {String} role - The user role
 * @returns {Promise<Company>}
 */
export async function decrementUserCount(companyId, role) {
  await connectDB();
  
  const updateField = role === 'Sales Person' 
    ? 'currentUsage.salesPersonCount' 
    : 'currentUsage.usersCount';

  const company = await Company.findByIdAndUpdate(
    companyId,
    { $inc: { [updateField]: -1 } },
    { new: true }
  );

  return company;
}

/**
 * Increment quotation count for a company
 * @param {String} companyId - The company ID
 * @returns {Promise<Company>}
 */
export async function incrementQuotationCount(companyId) {
  await connectDB();
  
  const company = await Company.findByIdAndUpdate(
    companyId,
    { $inc: { 'currentUsage.quotationCount': 1 } },
    { new: true }
  );

  return company;
}

/**
 * Decrement quotation count for a company
 * @param {String} companyId - The company ID
 * @returns {Promise<Company>}
 */
export async function decrementQuotationCount(companyId) {
  await connectDB();
  
  const company = await Company.findByIdAndUpdate(
    companyId,
    { $inc: { 'currentUsage.quotationCount': -1 } },
    { new: true }
  );

  return company;
}

/**
 * Get company usage statistics
 * @param {String} companyId - The company ID
 * @returns {Promise<Object>}
 */
export async function getCompanyUsageStats(companyId) {
  await connectDB();
  
  const company = await Company.findById(companyId).populate('planId');
  if (!company) {
    throw new Error('Company not found');
  }

  return {
    limits: company.planLimits,
    usage: company.currentUsage,
    plan: company.plan,
    percentages: {
      users: Math.round((company.currentUsage.usersCount / company.planLimits.usersLimit) * 100),
      salesPersons: Math.round((company.currentUsage.salesPersonCount / company.planLimits.salesPersonLimit) * 100),
      quotations: Math.round((company.currentUsage.quotationCount / company.planLimits.quotationLimit) * 100),
    },
  };
}

/**
 * Sync company usage counts with actual database counts
 * @param {String} companyId - The company ID
 * @returns {Promise<Object>}
 */
export async function syncCompanyUsageCounts(companyId) {
  await connectDB();
  
  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error('Company not found');
  }

  // Get actual counts from database
  const actualSalesPersonCount = await User.countDocuments({ 
    companyId: companyId, 
    role: 'Sales Person',
    status: { $ne: 'Deleted' }
  });

  const actualUsersCount = await User.countDocuments({ 
    companyId: companyId, 
    role: { $in: ['Admin', 'Customer'] },
    status: { $ne: 'Deleted' }
  });

  // Get quotation count (if Quotation model is available)
  let actualQuotationCount = 0;
  try {
    const Quotation = (await import('../models/Quotation.js')).default;
    actualQuotationCount = await Quotation.countDocuments({ 
      companyId: companyId 
    });
  } catch (err) {
    console.log('Quotation model not available for count sync');
  }

  // Update company with synced counts
  const updatedCompany = await Company.findByIdAndUpdate(
    companyId,
    {
      'currentUsage.salesPersonCount': actualSalesPersonCount,
      'currentUsage.usersCount': actualUsersCount,
      'currentUsage.quotationCount': actualQuotationCount,
    },
    { new: true }
  );

  console.log(`[SYNC] Company ${companyId} usage synced:`, {
    salesPersons: { old: company.currentUsage.salesPersonCount, new: actualSalesPersonCount },
    users: { old: company.currentUsage.usersCount, new: actualUsersCount },
    quotations: { old: company.currentUsage.quotationCount, new: actualQuotationCount },
  });

  return {
    success: true,
    message: 'Company usage counts synced successfully',
    oldCounts: {
      salesPersonCount: company.currentUsage.salesPersonCount,
      usersCount: company.currentUsage.usersCount,
      quotationCount: company.currentUsage.quotationCount,
    },
    newCounts: {
      salesPersonCount: actualSalesPersonCount,
      usersCount: actualUsersCount,
      quotationCount: actualQuotationCount,
    },
  };
}

