import connectDB from '../../lib/mongodb.js';
import User from '../../models/User.js';
import Company from '../../models/Company.js';
import Quotation from '../../models/Quotation.js';

export const analyticsResolvers = {
  Query: {
    getCompanyAnalytics: async (_, __, context) => {
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

      // Fetch all quotations for this company (created by admins/sales persons of this company)
      const companyUsers = await User.find({ companyId }).select('_id');
      const companySalesPersons = await User.find({ 
        role: 'Sales Person',
        companyId: companyId 
      }).select('_id name');
      
      const userIds = companyUsers.map(u => u._id);
      const quotations = await Quotation.find({ 
        createdBy: { $in: userIds } 
      }).populate('createdBy');

      // Calculate stats
      const totalQuotations = quotations.length;

      // Quotation status counts
      const wonQuotations = quotations.filter(q => ['paid', 'accepted'].includes(q.status)).length;
      const lostQuotations = quotations.filter(q => q.status === 'rejected').length;
      const pendingQuotations = quotations.filter(q => q.status === 'sent').length;
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
      const now = new Date();
      
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
        } else if (q.status === 'sent') {
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
        { status: 'pending', count: pendingQuotations, percentage: totalQuotations > 0 ? (pendingQuotations / totalQuotations) * 100 : 0 },
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
    getDashboardAnalytics: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can view analytics
      if (context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Super Admin access required.');
      }

      // Fetch all data
      const users = await User.find();
      const companies = await Company.find();
      const quotations = await Quotation.find();

      // Calculate stats
      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.status === 'Active').length;
      const totalCompanies = companies.length;
      const activeCompanies = companies.filter(c => c.status === 'Active').length;
      const totalQuotations = quotations.length;

      // Quotation status counts
      const paidQuotations = quotations.filter(q => q.status === 'paid').length;
      const pendingQuotations = quotations.filter(q => q.status === 'sent').length;
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
      const now = new Date();
      
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

      // Recent users (last 5)
      const recentUsers = users
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
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
      };
    },
    getSalesPersonAnalytics: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Sales Person can view their own analytics
      if (context.user.role !== 'Sales Person') {
        throw new Error('Not authorized. Sales Person access required.');
      }

      // Sales Person must have a salesPersonId
      if (!context.user.salesPersonId) {
        throw new Error('Sales Person ID not found');
      }

      const salesPersonId = context.user.salesPersonId;
      const userId = context.user.id;

      // Fetch user data with company info
      const salesPerson = await User.findById(userId).populate('companyId');
      if (!salesPerson) {
        throw new Error('Sales Person not found');
      }

      const companyName = salesPerson.companyId?.name || 'N/A';

      // Fetch all quotations created by this sales person
      const quotations = await Quotation.find({ 
        createdBy: userId 
      });

      // Calculate stats
      const totalQuotations = quotations.length;

      // Quotation status counts
      const wonQuotations = quotations.filter(q => ['paid', 'accepted'].includes(q.status)).length;
      const lostQuotations = quotations.filter(q => q.status === 'rejected').length;
      const pendingQuotations = quotations.filter(q => q.status === 'sent').length;
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
      const now = new Date();
      
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
        } else if (q.status === 'sent') {
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
      const quotationStatusBreakdown = [
        { status: 'won', count: wonQuotations, percentage: totalQuotations > 0 ? (wonQuotations / totalQuotations) * 100 : 0 },
        { status: 'lost', count: lostQuotations, percentage: totalQuotations > 0 ? (lostQuotations / totalQuotations) * 100 : 0 },
        { status: 'pending', count: pendingQuotations, percentage: totalQuotations > 0 ? (pendingQuotations / totalQuotations) * 100 : 0 },
        { status: 'draft', count: draftQuotations, percentage: totalQuotations > 0 ? (draftQuotations / totalQuotations) * 100 : 0 },
      ];

      return {
        salesPersonId,
        salesPersonName: salesPerson.name,
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
  },
};

