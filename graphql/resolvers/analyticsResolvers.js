import connectDB from '../../lib/mongodb.js';
import User from '../../models/User.js';
import Company from '../../models/Company.js';
import Quotation from '../../models/Quotation.js';
import Product from '../../models/Product.js';

export const analyticsResolvers = {
  Query: {
    getCompanyAnalytics: async (_, { timeRange = 'all' }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Admin can view their company analytics
      if (context.user.role !== 'Admin') {
        throw new Error('Not authorized. Admin access required.');
      }

      // Admin must have a company
      if (!context.user.companyId) {
        throw new Error('Admin must be associated with a company');
      }

      const companyId = context.user.companyId;

      // Fetch company data
      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      // Calculate date filter based on timeRange
      const now = new Date();
      let dateFilter = { companyId: companyId };
      
      switch(timeRange) {
        case 'monthly':
          dateFilter.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
          break;
        case '3months':
          dateFilter.createdAt = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
          break;
        case 'quarterly':
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
          dateFilter.createdAt = { $gte: quarterStart };
          break;
        case 'yearly':
          dateFilter.createdAt = { $gte: new Date(now.getFullYear(), 0, 1) };
          break;
        case 'all':
        default:
          // No date filter, just company filter
          break;
      }

      // SECURITY: Fetch all quotations for THIS company only using companyId and time filter
      const quotations = await Quotation.find(dateFilter).populate('createdBy');
      
      // Fetch sales persons for top performance stats
      const companySalesPersons = await User.find({ 
        role: 'Sales Person',
        companyId: companyId 
      }).select('_id name');

      // Calculate stats
      const totalQuotations = quotations.length;

      // Quotation status counts
      const wonQuotations = quotations.filter(q => ['paid', 'accepted'].includes(q.status)).length;
      const lostQuotations = quotations.filter(q => q.status === 'rejected').length;
      const pendingQuotations = quotations.filter(q => ['sent', 'viewed'].includes(q.status)).length;
      const viewedQuotations = quotations.filter(q => q.status === 'viewed').length;
      const sentQuotations = quotations.filter(q => q.status === 'sent').length;
      const draftQuotations = quotations.filter(q => q.status === 'draft').length;
      const paidQuotations = quotations.filter(q => q.status === 'paid').length;

      // Calculate revenue (from paid quotations)
      const totalRevenue = quotations
        .filter(q => q.status === 'paid')
        .reduce((sum, q) => sum + (q.totalAmount || 0), 0);

      // Calculate conversion rate (won / total non-draft)
      const nonDraftQuotations = totalQuotations - draftQuotations;
      const conversionRate = nonDraftQuotations > 0 
        ? (wonQuotations / nonDraftQuotations) * 100 
        : 0;

      // Calculate average quotation value
      const averageQuotationValue = totalQuotations > 0 
        ? quotations.reduce((sum, q) => sum + (q.totalAmount || 0), 0) / totalQuotations 
        : 0;

      // Monthly revenue and quotations (last 6 months)
      const monthlyData = {};
      
      quotations.forEach(q => {
        const date = q.createdAt;
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { 
            revenue: 0, 
            count: 0, 
            won: 0, 
            lost: 0, 
            pending: 0 
          };
        }
        
        monthlyData[monthKey].count += 1;
        
        if (q.status === 'paid') {
          monthlyData[monthKey].revenue += q.totalAmount || 0;
        }
        
        if (['paid', 'accepted'].includes(q.status)) {
          monthlyData[monthKey].won += 1;
        } else if (q.status === 'rejected') {
          monthlyData[monthKey].lost += 1;
        } else if (['sent', 'viewed'].includes(q.status)) {
          monthlyData[monthKey].pending += 1;
        }
      });

      // Generate last 6 months
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        monthlyRevenue.push({
          month: monthName,
          revenue: monthlyData[monthKey]?.revenue || 0,
          quotationCount: monthlyData[monthKey]?.count || 0,
          won: monthlyData[monthKey]?.won || 0,
          lost: monthlyData[monthKey]?.lost || 0,
          pending: monthlyData[monthKey]?.pending || 0,
        });
      }

      // Top salesperson by revenue
      const salespersonRevenue = {};
      quotations.forEach(q => {
        if (q.status === 'paid' && q.from?.salesPersonId) {
          const spId = q.from.salesPersonId;
          if (!salespersonRevenue[spId]) {
            salespersonRevenue[spId] = {
              salesPersonId: spId,
              name: q.from.salesPersonName || 'Unknown',
              revenue: 0,
              quotationCount: 0,
              wonCount: 0,
            };
          }
          salespersonRevenue[spId].revenue += q.totalAmount || 0;
          salespersonRevenue[spId].quotationCount += 1;
        }
        
        // Count won quotations
        if (['paid', 'accepted'].includes(q.status) && q.from?.salesPersonId) {
          const spId = q.from.salesPersonId;
          if (!salespersonRevenue[spId]) {
            salespersonRevenue[spId] = {
              salesPersonId: spId,
              name: q.from.salesPersonName || 'Unknown',
              revenue: 0,
              quotationCount: 0,
              wonCount: 0,
            };
          }
          salespersonRevenue[spId].wonCount += 1;
        }
      });

      const topSalespeople = Object.values(salespersonRevenue)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Recent quotations (last 5)
      const recentQuotations = quotations
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(q => ({
          id: q._id.toString(),
          quotationNo: q.quotationNo,
          totalAmount: q.totalAmount,
          status: q.status,
          clientName: q.to?.businessName || 'N/A',
          salesPerson: q.from?.salesPersonName || 'N/A',
          createdAt: q.createdAt.toISOString(),
        }));

      // Quotation status breakdown
      const quotationStatusBreakdown = [
        { status: 'won', count: wonQuotations, percentage: totalQuotations > 0 ? (wonQuotations / totalQuotations) * 100 : 0 },
        { status: 'lost', count: lostQuotations, percentage: totalQuotations > 0 ? (lostQuotations / totalQuotations) * 100 : 0 },
        { status: 'sent', count: sentQuotations, percentage: totalQuotations > 0 ? (sentQuotations / totalQuotations) * 100 : 0 },
        { status: 'viewed', count: viewedQuotations, percentage: totalQuotations > 0 ? (viewedQuotations / totalQuotations) * 100 : 0 },
        { status: 'draft', count: draftQuotations, percentage: totalQuotations > 0 ? (draftQuotations / totalQuotations) * 100 : 0 },
      ];

      return {
        companyName: company.name,
        stats: {
          totalQuotations,
          wonQuotations,
          lostQuotations,
          pendingQuotations,
          draftQuotations,
          paidQuotations,
          totalRevenue,
          averageQuotationValue,
          conversionRate,
        },
        monthlyRevenue,
        topSalespeople,
        recentQuotations,
        quotationStatusBreakdown,
      };
    },
    getDashboardAnalytics: async (_, { timeRange = 'all' }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can view analytics
      if (context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Super Admin access required.');
      }

      // Calculate date filter based on timeRange
      const now = new Date();
      let dateFilter = {};
      
      switch(timeRange) {
        case 'monthly':
          dateFilter = { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } };
          break;
        case '3months':
          dateFilter = { createdAt: { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } };
          break;
        case 'quarterly':
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
          dateFilter = { createdAt: { $gte: quarterStart } };
          break;
        case 'yearly':
          dateFilter = { createdAt: { $gte: new Date(now.getFullYear(), 0, 1) } };
          break;
        case 'all':
        default:
          dateFilter = {};
      }

      // Fetch all data
      const users = await User.find();
      const companies = await Company.find();
      const quotations = await Quotation.find(dateFilter);

      // Calculate stats
      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.status === 'Active').length;
      const totalCompanies = companies.length;
      const activeCompanies = companies.filter(c => c.status === 'Active').length;
      const totalQuotations = quotations.length;

      // Quotation status counts
      const paidQuotations = quotations.filter(q => q.status === 'paid').length;
      const pendingQuotations = quotations.filter(q => ['sent', 'viewed'].includes(q.status)).length;
      const draftQuotations = quotations.filter(q => q.status === 'draft').length;
      const acceptedQuotations = quotations.filter(q => q.status === 'accepted').length;
      const rejectedQuotations = quotations.filter(q => q.status === 'rejected').length;

      // Calculate revenue (from paid quotations)
      const totalRevenue = quotations
        .filter(q => q.status === 'paid')
        .reduce((sum, q) => sum + (q.totalAmount || 0), 0);

      // Calculate average quotation value
      const averageQuotationValue = totalQuotations > 0 
        ? quotations.reduce((sum, q) => sum + (q.totalAmount || 0), 0) / totalQuotations 
        : 0;

      // Calculate conversion rate (accepted + paid / total)
      const convertedQuotations = paidQuotations + acceptedQuotations;
      const conversionRate = totalQuotations > 0 
        ? (convertedQuotations / totalQuotations) * 100 
        : 0;

      // Role distribution
      const roleCounts = {};
      users.forEach(user => {
        roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
      });

      const roleDistribution = Object.entries(roleCounts).map(([role, count]) => ({
        role,
        count,
        percentage: (count / totalUsers) * 100,
      }));

      // Quotation status breakdown
      const statusCounts = {};
      const statusValues = {};
      
      quotations.forEach(q => {
        const status = q.status;
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        statusValues[status] = (statusValues[status] || 0) + (q.totalAmount || 0);
      });

      const quotationStatusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        totalValue: statusValues[status] || 0,
        percentage: (count / totalQuotations) * 100,
      }));

      // Monthly revenue (last 6 months)
      const monthlyData = {};
      
      quotations.forEach(q => {
        if (q.status === 'paid' && q.payment?.paidAt) {
          const date = new Date(q.payment.paidAt);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { revenue: 0, count: 0 };
          }
          
          monthlyData[monthKey].revenue += q.totalAmount || 0;
          monthlyData[monthKey].count += 1;
        }
      });

      // Generate last 6 months
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        monthlyRevenue.push({
          month: monthName,
          revenue: monthlyData[monthKey]?.revenue || 0,
          quotationCount: monthlyData[monthKey]?.count || 0,
        });
      }

      // Recent users (last 20 to support role filtering)
      const recentUsers = users
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 20)
        .map(u => ({
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt.toISOString(),
        }));

      // Recent quotations (last 5)
      const recentQuotations = quotations
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(q => ({
          id: q._id.toString(),
          quotationNo: q.quotationNo,
          totalAmount: q.totalAmount,
          status: q.status,
          businessName: q.to?.businessName || 'N/A',
          createdAt: q.createdAt.toISOString(),
        }));

      // Company-wise Revenue Analysis
      const companyRevenueMap = {};
      companies.forEach(company => {
        companyRevenueMap[company._id.toString()] = {
          companyId: company._id.toString(),
          companyName: company.name,
          totalRevenue: 0,
          paidQuotations: 0,
          pendingQuotations: 0,
          totalQuotations: 0,
          status: company.status,
        };
      });

      // Calculate revenue and quotations per company
      quotations.forEach(q => {
        const companyId = q.companyId?.toString();
        if (companyId && companyRevenueMap[companyId]) {
          companyRevenueMap[companyId].totalQuotations += 1;
          
          if (q.status === 'paid') {
            companyRevenueMap[companyId].totalRevenue += q.totalAmount || 0;
            companyRevenueMap[companyId].paidQuotations += 1;
          } else if (['sent', 'viewed'].includes(q.status)) {
            companyRevenueMap[companyId].pendingQuotations += 1;
          }
        }
      });

      const companyRevenues = Object.values(companyRevenueMap)
        .map(cr => ({
          ...cr,
          conversionRate: cr.totalQuotations > 0 
            ? (cr.paidQuotations / cr.totalQuotations) * 100 
            : 0,
          averageValue: cr.paidQuotations > 0 
            ? cr.totalRevenue / cr.paidQuotations 
            : 0,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Subscription Analytics (Active subscriptions from quotations)
      const subscriptionAnalyticsMap = {};
      
      companies.forEach(company => {
        subscriptionAnalyticsMap[company._id.toString()] = {
          companyId: company._id.toString(),
          companyName: company.name,
          activeSubscriptions: 0,
          totalSubscriptionRevenue: 0,
          monthlyRecurring: 0,
          yearlyRecurring: 0,
          subscriptionsByProduct: {},
          recentSubscriptions: [],
        };
      });

      // Process quotations to find subscriptions
      quotations.forEach(q => {
        const companyId = q.companyId?.toString();
        if (!companyId || !subscriptionAnalyticsMap[companyId]) return;

        // Check if quotation has subscription line items
        if (q.lineItems && Array.isArray(q.lineItems)) {
          q.lineItems.forEach(item => {
            if (item.isSubscription && q.status === 'paid') {
              const analytics = subscriptionAnalyticsMap[companyId];
              analytics.activeSubscriptions += 1;
              
              const itemRevenue = item.subscriptionPrice || item.total || 0;
              analytics.totalSubscriptionRevenue += itemRevenue;

              // Calculate recurring revenue based on billing type
              if (item.subscriptionDetails) {
                const billingType = item.subscriptionDetails.billingType;
                const interval = item.subscriptionDetails.interval || 'month';
                
                if (interval === 'month') {
                  analytics.monthlyRecurring += itemRevenue;
                } else if (interval === 'year') {
                  analytics.yearlyRecurring += itemRevenue;
                  analytics.monthlyRecurring += itemRevenue / 12;
                }
              }

              // Group by product
              const productKey = item.productId?.toString() || item.itemName;
              if (!analytics.subscriptionsByProduct[productKey]) {
                analytics.subscriptionsByProduct[productKey] = {
                  productId: item.productId?.toString() || 'unknown',
                  productName: item.itemName,
                  count: 0,
                  revenue: 0,
                };
              }
              analytics.subscriptionsByProduct[productKey].count += 1;
              analytics.subscriptionsByProduct[productKey].revenue += itemRevenue;

              // Add to recent subscriptions (if < 10)
              if (analytics.recentSubscriptions.length < 5) {
                analytics.recentSubscriptions.push({
                  quotationNo: q.quotationNo,
                  companyName: subscriptionAnalyticsMap[companyId].companyName,
                  clientName: q.to?.businessName || 'N/A',
                  productName: item.itemName,
                  amount: itemRevenue,
                  billingType: item.subscriptionDetails?.interval || 'month',
                  status: 'active',
                  startDate: q.payment?.paidAt || q.createdAt.toISOString(),
                });
              }
            }
          });
        }
      });

      const subscriptionAnalytics = Object.values(subscriptionAnalyticsMap)
        .map(sa => ({
          ...sa,
          subscriptionsByProduct: Object.values(sa.subscriptionsByProduct),
        }))
        .filter(sa => sa.activeSubscriptions > 0)
        .sort((a, b) => b.totalSubscriptionRevenue - a.totalSubscriptionRevenue);

      return {
        stats: {
          totalUsers,
          activeUsers,
          totalCompanies,
          activeCompanies,
          totalQuotations,
          totalRevenue,
          averageQuotationValue,
          conversionRate,
          paidQuotations,
          pendingQuotations,
          draftQuotations,
          acceptedQuotations,
          rejectedQuotations,
        },
        roleDistribution,
        quotationStatusBreakdown,
        monthlyRevenue,
        recentUsers,
        recentQuotations,
        companyRevenues,
        subscriptionAnalytics,
      };
    },
    getSalesPersonAnalytics: async (_, { timeRange = 'all' }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Sales Person can view their own analytics
      if (context.user.role !== 'Sales Person') {
        throw new Error('Not authorized. Sales Person access required.');
      }

      // Get userId from context (could be userId or id)
      const userId = context.user.userId || context.user.id;
      if (!userId) {
        throw new Error('User ID not found');
      }

      // Fetch user data with company info to get salesPersonId
      const salesPerson = await User.findById(userId).populate('companyId');
      if (!salesPerson) {
        throw new Error('Sales Person not found');
      }

      // Check if user is actually a Sales Person
      if (salesPerson.role !== 'Sales Person') {
        throw new Error('User is not a Sales Person');
      }

      // Get salesPersonId from database (it might not be in token)
      let salesPersonId = salesPerson.salesPersonId;
      
      // Auto-generate salesPersonId if missing (for existing users created before auto-generation was added)
      if (!salesPersonId) {
        const lastSalesPerson = await User.findOne(
          { role: 'Sales Person', salesPersonId: { $exists: true, $ne: null } },
          {},
          { sort: { 'createdAt': -1 } }
        );
        let nextId = 1;
        if (lastSalesPerson && lastSalesPerson.salesPersonId) {
          const lastIdNum = parseInt(lastSalesPerson.salesPersonId.split('-')[1]);
          if (!isNaN(lastIdNum)) {
            nextId = lastIdNum + 1;
          }
        }
        salesPersonId = `SP-${String(nextId).padStart(4, '0')}`;
        // Update the user with the generated salesPersonId
        await User.findByIdAndUpdate(userId, { salesPersonId });
      }

      const companyName = salesPerson.companyId?.name || 'N/A';
      const salesPersonName = salesPerson.name || 'N/A';
      const userCompanyId = salesPerson.companyId?._id || salesPerson.companyId;

      // Calculate date filter based on timeRange
      const now = new Date();
      let dateFilter = { 
        createdBy: userId,
        companyId: userCompanyId 
      };
      
      switch(timeRange) {
        case 'monthly':
          dateFilter.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
          break;
        case '3months':
          dateFilter.createdAt = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
          break;
        case 'quarterly':
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
          dateFilter.createdAt = { $gte: quarterStart };
          break;
        case 'yearly':
          dateFilter.createdAt = { $gte: new Date(now.getFullYear(), 0, 1) };
          break;
        case 'all':
        default:
          // No date filter, just user and company filter
          break;
      }

      // SECURITY: Fetch all quotations created by this sales person from their company only with time filter
      const quotations = await Quotation.find(dateFilter);

      // Calculate stats
      const totalQuotations = quotations.length;

      // Quotation status counts
      const wonQuotations = quotations.filter(q => ['paid', 'accepted'].includes(q.status)).length;
      const lostQuotations = quotations.filter(q => q.status === 'rejected').length;
      const pendingQuotations = quotations.filter(q => ['sent', 'viewed'].includes(q.status)).length;
      const draftQuotations = quotations.filter(q => q.status === 'draft').length;
      const paidQuotations = quotations.filter(q => q.status === 'paid').length;

      // Calculate revenue (from paid quotations)
      const totalRevenue = quotations
        .filter(q => q.status === 'paid')
        .reduce((sum, q) => sum + (q.totalAmount || 0), 0);

      // Calculate conversion rate (won / total non-draft)
      const nonDraftQuotations = totalQuotations - draftQuotations;
      const conversionRate = nonDraftQuotations > 0 
        ? (wonQuotations / nonDraftQuotations) * 100 
        : 0;

      // Calculate average quotation value
      const averageQuotationValue = totalQuotations > 0 
        ? quotations.reduce((sum, q) => sum + (q.totalAmount || 0), 0) / totalQuotations 
        : 0;

      // Monthly revenue and quotations (last 6 months)
      const monthlyData = {};
      
      quotations.forEach(q => {
        const date = q.createdAt;
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { 
            revenue: 0, 
            count: 0, 
            won: 0, 
            lost: 0, 
            pending: 0 
          };
        }
        
        monthlyData[monthKey].count += 1;
        
        if (q.status === 'paid') {
          monthlyData[monthKey].revenue += q.totalAmount || 0;
        }
        
        if (['paid', 'accepted'].includes(q.status)) {
          monthlyData[monthKey].won += 1;
        } else if (q.status === 'rejected') {
          monthlyData[monthKey].lost += 1;
        } else if (['sent', 'viewed'].includes(q.status)) {
          monthlyData[monthKey].pending += 1;
        }
      });

      // Generate last 6 months
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        monthlyRevenue.push({
          month: monthName,
          revenue: monthlyData[monthKey]?.revenue || 0,
          quotationCount: monthlyData[monthKey]?.count || 0,
          won: monthlyData[monthKey]?.won || 0,
          lost: monthlyData[monthKey]?.lost || 0,
          pending: monthlyData[monthKey]?.pending || 0,
        });
      }

      // Recent quotations (last 10)
      const recentQuotations = quotations
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)
        .map(q => ({
          id: q._id.toString(),
          quotationNo: q.quotationNo,
          totalAmount: q.totalAmount,
          status: q.status,
          clientName: q.to?.businessName || 'N/A',
          salesPerson: q.from?.salesPersonName || 'N/A',
          createdAt: q.createdAt.toISOString(),
        }));

      // Quotation status breakdown
      const viewedQuotations = quotations.filter(q => q.status === 'viewed').length;
      const sentQuotations = quotations.filter(q => q.status === 'sent').length;
      
      const quotationStatusBreakdown = [
        { status: 'won', count: wonQuotations, percentage: totalQuotations > 0 ? (wonQuotations / totalQuotations) * 100 : 0 },
        { status: 'lost', count: lostQuotations, percentage: totalQuotations > 0 ? (lostQuotations / totalQuotations) * 100 : 0 },
        { status: 'sent', count: sentQuotations, percentage: totalQuotations > 0 ? (sentQuotations / totalQuotations) * 100 : 0 },
        { status: 'viewed', count: viewedQuotations, percentage: totalQuotations > 0 ? (viewedQuotations / totalQuotations) * 100 : 0 },
        { status: 'draft', count: draftQuotations, percentage: totalQuotations > 0 ? (draftQuotations / totalQuotations) * 100 : 0 },
      ];

      return {
        salesPersonId,
        salesPersonName: salesPersonName,
        companyName,
        stats: {
          totalQuotations,
          wonQuotations,
          lostQuotations,
          pendingQuotations,
          draftQuotations,
          paidQuotations,
          totalRevenue,
          averageQuotationValue,
          conversionRate,
        },
        monthlyRevenue,
        recentQuotations,
        quotationStatusBreakdown,
      };
    },

    getProductAnalytics: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Admin can view product analytics
      if (!['Admin', 'Super Admin'].includes(context.user.role)) {
        throw new Error('Not authorized. Admin access required.');
      }

      // Get companyId based on role
      let companyId = null;
      if (context.user.role === 'Admin') {
        if (!context.user.companyId) {
          throw new Error('Admin must be associated with a company');
        }
        companyId = context.user.companyId;
      }

      // Build query for quotations
      const quotationQuery = companyId ? { companyId, status: 'paid' } : { status: 'paid' };
      
      // Fetch all paid quotations (these represent actual sales)
      const paidQuotations = await Quotation.find(quotationQuery).lean();

      // Fetch all products for the company
      const productQuery = companyId ? { companyId } : {};
      const products = await Product.find(productQuery)
        .populate('groupId')
        .lean();

      // Build product sales map
      const productSalesMap = {};
      const productBuyersMap = {};
      const productMonthlyData = {};

      // Initialize all products with zero sales
      products.forEach(product => {
        const productId = product._id.toString();
        productSalesMap[productId] = {
          productId,
          productName: product.name,
          imageUrl: product.imageUrl || product.image || '',
          groupName: product.groupId?.name || 'Uncategorized',
          totalQuantitySold: 0,
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          lastSoldAt: null,
        };
        productBuyersMap[productId] = {};
        productMonthlyData[productId] = {};
      });

      // Process paid quotations to extract product sales data
      paidQuotations.forEach(quotation => {
        if (!quotation.lineItems || !Array.isArray(quotation.lineItems)) return;

        const clientName = quotation.to?.businessName || 'Unknown Client';
        const clientEmail = quotation.to?.email || 'unknown@email.com';
        const quotationDate = quotation.payment?.paidAt || quotation.createdAt;

        quotation.lineItems.forEach(item => {
          const productId = item.productId?.toString();
          
          // Handle products that may not be in our current product list (deleted products)
          if (!productSalesMap[productId]) {
            productSalesMap[productId] = {
              productId: productId || 'unknown',
              productName: item.itemName || 'Unknown Product',
              imageUrl: item.imageUrl || '',
              groupName: 'Archived',
              totalQuantitySold: 0,
              totalRevenue: 0,
              totalOrders: 0,
              averageOrderValue: 0,
              lastSoldAt: null,
            };
            productBuyersMap[productId] = {};
            productMonthlyData[productId] = {};
          }

          const quantity = item.quantity || 1;
          const total = item.total || (item.rate * quantity) || 0;

          // Update product sales data
          productSalesMap[productId].totalQuantitySold += quantity;
          productSalesMap[productId].totalRevenue += total;
          productSalesMap[productId].totalOrders += 1;
          
          // Track last sold date
          if (!productSalesMap[productId].lastSoldAt || 
              new Date(quotationDate) > new Date(productSalesMap[productId].lastSoldAt)) {
            productSalesMap[productId].lastSoldAt = quotationDate;
          }

          // Track buyers
          if (!productBuyersMap[productId][clientEmail]) {
            productBuyersMap[productId][clientEmail] = {
              clientName,
              clientEmail,
              totalPurchases: 0,
              totalSpent: 0,
              lastPurchaseAt: quotationDate,
            };
          }
          productBuyersMap[productId][clientEmail].totalPurchases += quantity;
          productBuyersMap[productId][clientEmail].totalSpent += total;
          if (new Date(quotationDate) > new Date(productBuyersMap[productId][clientEmail].lastPurchaseAt)) {
            productBuyersMap[productId][clientEmail].lastPurchaseAt = quotationDate;
          }

          // Track monthly data for demand trends
          const monthKey = new Date(quotationDate).toISOString().slice(0, 7); // YYYY-MM
          if (!productMonthlyData[productId][monthKey]) {
            productMonthlyData[productId][monthKey] = {
              quantity: 0,
              revenue: 0,
              orders: 0,
            };
          }
          productMonthlyData[productId][monthKey].quantity += quantity;
          productMonthlyData[productId][monthKey].revenue += total;
          productMonthlyData[productId][monthKey].orders += 1;
        });
      });

      // Calculate average order value
      Object.values(productSalesMap).forEach(product => {
        if (product.totalOrders > 0) {
          product.averageOrderValue = product.totalRevenue / product.totalOrders;
        }
        if (product.lastSoldAt) {
          product.lastSoldAt = new Date(product.lastSoldAt).toISOString();
        }
      });

      // Get all product sales sorted by revenue
      const allProductSales = Object.values(productSalesMap)
        .filter(p => p.totalRevenue > 0 || p.totalQuantitySold > 0);

      // Top selling products (by revenue)
      const topSellingProducts = [...allProductSales]
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);

      // Low selling products (products with sales but lowest revenue)
      const lowSellingProducts = [...allProductSales]
        .filter(p => p.totalRevenue > 0)
        .sort((a, b) => a.totalRevenue - b.totalRevenue)
        .slice(0, 10);

      // Products with no sales
      const noSalesProducts = Object.values(productSalesMap)
        .filter(p => p.totalRevenue === 0 && p.totalQuantitySold === 0)
        .slice(0, 5);

      // Add no-sales products to low selling if we have room
      if (lowSellingProducts.length < 10) {
        lowSellingProducts.push(...noSalesProducts.slice(0, 10 - lowSellingProducts.length));
      }

      // Generate demand trends for last 6 months
      const now = new Date();
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toISOString().slice(0, 7);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        last6Months.push({ key: monthKey, name: monthName });
      }

      // Build demand analysis for top products
      const productDemandTrends = topSellingProducts.slice(0, 5).map(product => {
        const trends = last6Months.map(month => ({
          month: month.name,
          quantity: productMonthlyData[product.productId]?.[month.key]?.quantity || 0,
          revenue: productMonthlyData[product.productId]?.[month.key]?.revenue || 0,
          orders: productMonthlyData[product.productId]?.[month.key]?.orders || 0,
        }));

        // Find peak month
        let peakMonth = null;
        let peakQuantity = 0;
        trends.forEach(t => {
          if (t.quantity > peakQuantity) {
            peakQuantity = t.quantity;
            peakMonth = t.month;
          }
        });

        // Calculate growth rate (comparing last month vs first month)
        const firstMonthQty = trends[0]?.quantity || 0;
        const lastMonthQty = trends[trends.length - 1]?.quantity || 0;
        let growthRate = 0;
        if (firstMonthQty > 0) {
          growthRate = ((lastMonthQty - firstMonthQty) / firstMonthQty) * 100;
        } else if (lastMonthQty > 0) {
          growthRate = 100; // From 0 to some value = 100% growth
        }

        return {
          productId: product.productId,
          productName: product.productName,
          trends,
          peakMonth,
          peakQuantity,
          growthRate,
        };
      });

      // Top buyers by product
      const topBuyersByProduct = topSellingProducts.slice(0, 5).map(product => {
        const buyers = Object.values(productBuyersMap[product.productId] || {})
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 5)
          .map(buyer => ({
            ...buyer,
            lastPurchaseAt: new Date(buyer.lastPurchaseAt).toISOString(),
          }));

        return {
          productId: product.productId,
          productName: product.productName,
          topBuyers: buyers,
        };
      });

      // Overall stats
      const totalRevenue = allProductSales.reduce((sum, p) => sum + p.totalRevenue, 0);
      const totalProductsSold = allProductSales.filter(p => p.totalQuantitySold > 0).length;
      const mostProfitableProduct = topSellingProducts[0]?.productName || 'N/A';
      
      // Find fastest growing product
      let fastestGrowingProduct = 'N/A';
      let maxGrowthRate = -Infinity;
      productDemandTrends.forEach(pdt => {
        if (pdt.growthRate > maxGrowthRate) {
          maxGrowthRate = pdt.growthRate;
          fastestGrowingProduct = pdt.productName;
        }
      });

      return {
        topSellingProducts,
        lowSellingProducts,
        productDemandTrends,
        topBuyersByProduct,
        overallStats: {
          totalProducts: products.length,
          totalProductsSold,
          totalRevenue,
          averageProductRevenue: totalProductsSold > 0 ? totalRevenue / totalProductsSold : 0,
          mostProfitableProduct,
          fastestGrowingProduct: maxGrowthRate > 0 ? fastestGrowingProduct : 'N/A',
        },
      };
    },
  },
};

