import connectDB from '../../lib/mongodb.js';
import User from '../../models/User.js';
import Company from '../../models/Company.js';
import Quotation from '../../models/Quotation.js';

export const analyticsResolvers = {
  Query: {
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
  },
};

