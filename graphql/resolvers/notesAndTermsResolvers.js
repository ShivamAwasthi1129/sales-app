import connectDB from '../../lib/mongodb.js';
import NotesAndTerms from '../../models/NotesAndTerms.js';
import Company from '../../models/Company.js';

export const notesAndTermsResolvers = {
  Query: {
    getNotesAndTerms: async (_, { companyId }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Check if user has access to this company
      const isSuperAdmin = context.user.role === 'Super Admin';
      const isAdmin = context.user.role === 'Admin';
      const userCompanyId = context.user.companyId?.toString();
      
      if (!isSuperAdmin && isAdmin && userCompanyId !== companyId) {
        throw new Error('Not authorized to view notes and terms for this company');
      }

      let notesAndTerms = await NotesAndTerms.findOne({ companyId }).lean();

      // If not found, create default one
      if (!notesAndTerms) {
        const newNotesAndTerms = await NotesAndTerms.create({
          companyId,
          notesToClient: 'Thank you for your interest in our products/services.\n\nPlease review the quotation carefully and contact us if you have any questions.\n\nWe look forward to working with you.',
          termsAndConditions: '• Payment terms: Net 30 days from invoice date\n• All prices are subject to change without prior notice\n• Delivery time: As per agreed schedule\n• Warranty: Standard warranty applies as per product specifications',
          createdBy: context.user?.userId || context.user?.id,
        });
        notesAndTerms = newNotesAndTerms.toObject();
      }

      return {
        id: notesAndTerms._id.toString(),
        companyId: notesAndTerms.companyId.toString(),
        notesToClient: notesAndTerms.notesToClient || '',
        termsAndConditions: notesAndTerms.termsAndConditions || '',
        createdBy: notesAndTerms.createdBy?.toString() || null,
        updatedBy: notesAndTerms.updatedBy?.toString() || null,
        createdAt: notesAndTerms.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: notesAndTerms.updatedAt?.toISOString() || new Date().toISOString(),
      };
    },

    getAllNotesAndTerms: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can view all
      if (context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Super Admin access required.');
      }

      const allNotesAndTerms = await NotesAndTerms.find().lean();

      return allNotesAndTerms.map(nt => ({
        id: nt._id.toString(),
        companyId: nt.companyId.toString(),
        notesToClient: nt.notesToClient || '',
        termsAndConditions: nt.termsAndConditions || '',
        createdBy: nt.createdBy?.toString() || null,
        updatedBy: nt.updatedBy?.toString() || null,
        createdAt: nt.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: nt.updatedAt?.toISOString() || new Date().toISOString(),
      }));
    },
  },

  Mutation: {
    createNotesAndTerms: async (_, { companyId, input }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Check if user has access to this company
      const isSuperAdmin = context.user.role === 'Super Admin';
      const isAdmin = context.user.role === 'Admin';
      const userCompanyId = context.user.companyId?.toString();
      
      if (!isSuperAdmin && isAdmin && userCompanyId !== companyId) {
        throw new Error('Not authorized to create notes and terms for this company');
      }

      // Check if company exists
      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      // Check if already exists
      const existing = await NotesAndTerms.findOne({ companyId });
      if (existing) {
        throw new Error('Notes and Terms already exist for this company. Use update instead.');
      }

      const userId = context.user?.userId || context.user?.id;

      const notesAndTerms = await NotesAndTerms.create({
        companyId,
        notesToClient: input.notesToClient || 'Thank you for your interest in our products/services.\n\nPlease review the quotation carefully and contact us if you have any questions.\n\nWe look forward to working with you.',
        termsAndConditions: input.termsAndConditions || '• Payment terms: Net 30 days from invoice date\n• All prices are subject to change without prior notice\n• Delivery time: As per agreed schedule\n• Warranty: Standard warranty applies as per product specifications',
        createdBy: userId,
        updatedBy: userId,
      });

      return {
        id: notesAndTerms._id.toString(),
        companyId: notesAndTerms.companyId.toString(),
        notesToClient: notesAndTerms.notesToClient || '',
        termsAndConditions: notesAndTerms.termsAndConditions || '',
        createdBy: notesAndTerms.createdBy?.toString() || null,
        updatedBy: notesAndTerms.updatedBy?.toString() || null,
        createdAt: notesAndTerms.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: notesAndTerms.updatedAt?.toISOString() || new Date().toISOString(),
      };
    },

    updateNotesAndTerms: async (_, { companyId, input }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Check if user has access to this company
      const isSuperAdmin = context.user.role === 'Super Admin';
      const isAdmin = context.user.role === 'Admin';
      const userCompanyId = context.user.companyId?.toString();
      
      if (!isSuperAdmin && isAdmin && userCompanyId !== companyId) {
        throw new Error('Not authorized to update notes and terms for this company');
      }

      const userId = context.user?.userId || context.user?.id;

      // Try to find existing, if not create it
      let notesAndTerms = await NotesAndTerms.findOne({ companyId });

      if (!notesAndTerms) {
        // Create if doesn't exist
        notesAndTerms = await NotesAndTerms.create({
          companyId,
          notesToClient: input.notesToClient || 'Thank you for your interest in our products/services.\n\nPlease review the quotation carefully and contact us if you have any questions.\n\nWe look forward to working with you.',
          termsAndConditions: input.termsAndConditions || '• Payment terms: Net 30 days from invoice date\n• All prices are subject to change without prior notice\n• Delivery time: As per agreed schedule\n• Warranty: Standard warranty applies as per product specifications',
          createdBy: userId,
          updatedBy: userId,
        });
      } else {
        // Update existing
        notesAndTerms.notesToClient = input.notesToClient !== undefined ? input.notesToClient : notesAndTerms.notesToClient;
        notesAndTerms.termsAndConditions = input.termsAndConditions !== undefined ? input.termsAndConditions : notesAndTerms.termsAndConditions;
        notesAndTerms.updatedBy = userId;
        notesAndTerms.updatedAt = new Date();
        await notesAndTerms.save();
      }

      return {
        id: notesAndTerms._id.toString(),
        companyId: notesAndTerms.companyId.toString(),
        notesToClient: notesAndTerms.notesToClient || '',
        termsAndConditions: notesAndTerms.termsAndConditions || '',
        createdBy: notesAndTerms.createdBy?.toString() || null,
        updatedBy: notesAndTerms.updatedBy?.toString() || null,
        createdAt: notesAndTerms.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: notesAndTerms.updatedAt?.toISOString() || new Date().toISOString(),
      };
    },

    deleteNotesAndTerms: async (_, { companyId }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can delete
      if (context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Super Admin access required.');
      }

      const result = await NotesAndTerms.findOneAndDelete({ companyId });

      if (!result) {
        throw new Error('Notes and Terms not found');
      }

      return {
        success: true,
        message: 'Notes and Terms deleted successfully',
      };
    },
  },

  NotesAndTerms: {
    company: async (parent) => {
      await connectDB();
      if (!parent.companyId) return null;
      const company = await Company.findById(parent.companyId).lean();
      if (!company) return null;
      
      return {
        id: company._id.toString(),
        name: company.name,
        email: company.email,
        phone: company.phone || '',
        address: company.address || '',
        website: company.website || '',
        industry: company.industry || '',
        status: company.status,
        logo: company.logo || '',
        description: company.description || '',
      };
    },
  },
};

