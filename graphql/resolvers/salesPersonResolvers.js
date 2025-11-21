import connectDB from '../../lib/mongodb.js';
import SalesPerson from '../../models/SalesPerson.js';
import User from '../../models/User.js';

export const salesPersonResolvers = {
  Query: {
    getSalesPersons: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can view all sales persons
      if (!['Super Admin'].includes(context.user.role)) {
        throw new Error('Not authorized to view sales persons');
      }

      const salesPersons = await SalesPerson.find({})
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      return salesPersons.map(sp => ({
        ...sp,
        id: sp._id.toString(),
        dateOfBirth: sp.dateOfBirth?.toISOString() || new Date().toISOString(),
        createdAt: sp.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: sp.updatedAt?.toISOString() || new Date().toISOString(),
      }));
    },

    getSalesPerson: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const salesPerson = await SalesPerson.findById(id)
        .populate('createdBy', 'name email')
        .lean();

      if (!salesPerson) {
        throw new Error('Sales person not found');
      }

      return {
        ...salesPerson,
        id: salesPerson._id.toString(),
        dateOfBirth: salesPerson.dateOfBirth?.toISOString() || new Date().toISOString(),
        createdAt: salesPerson.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: salesPerson.updatedAt?.toISOString() || new Date().toISOString(),
      };
    },

    getSalesPersonByEmail: async (_, { email }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const salesPerson = await SalesPerson.findOne({ email: email.toLowerCase() })
        .populate('createdBy', 'name email')
        .lean();

      if (!salesPerson) {
        return null;
      }

      return {
        ...salesPerson,
        id: salesPerson._id.toString(),
        dateOfBirth: salesPerson.dateOfBirth?.toISOString() || new Date().toISOString(),
        createdAt: salesPerson.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: salesPerson.updatedAt?.toISOString() || new Date().toISOString(),
      };
    },
  },

  Mutation: {
    createSalesPerson: async (_, { input }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can create sales persons
      if (!['Super Admin'].includes(context.user.role)) {
        throw new Error('Not authorized to create sales persons');
      }

      // Check if email already exists
      const existingEmail = await SalesPerson.findOne({ email: input.email.toLowerCase() });
      if (existingEmail) {
        throw new Error('Email already exists');
      }

      // Check if salesPersonId already exists (if provided)
      if (input.salesPersonId) {
        const existingId = await SalesPerson.findOne({ salesPersonId: input.salesPersonId.toUpperCase() });
        if (existingId) {
          throw new Error('Sales Person ID already exists');
        }
      }

      const salesPersonData = {
        ...input,
        email: input.email.toLowerCase(),
        salesPersonId: input.salesPersonId ? input.salesPersonId.toUpperCase() : undefined,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : new Date(),
        createdBy: context.user.userId || context.user.id,
        status: input.status || 'Active',
      };

      const salesPerson = new SalesPerson(salesPersonData);
      await salesPerson.save();

      const savedSalesPerson = await SalesPerson.findById(salesPerson._id)
        .populate('createdBy', 'name email')
        .lean();

      return {
        ...savedSalesPerson,
        id: savedSalesPerson._id.toString(),
        dateOfBirth: savedSalesPerson.dateOfBirth?.toISOString() || new Date().toISOString(),
        createdAt: savedSalesPerson.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: savedSalesPerson.updatedAt?.toISOString() || new Date().toISOString(),
      };
    },

    updateSalesPerson: async (_, { id, input }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can update sales persons
      if (!['Super Admin'].includes(context.user.role)) {
        throw new Error('Not authorized to update sales persons');
      }

      const existingSalesPerson = await SalesPerson.findById(id);
      
      if (!existingSalesPerson) {
        throw new Error('Sales person not found');
      }

      // Check if email is being changed and if new email already exists
      if (input.email && input.email.toLowerCase() !== existingSalesPerson.email) {
        const existingEmail = await SalesPerson.findOne({ email: input.email.toLowerCase() });
        if (existingEmail) {
          throw new Error('Email already exists');
        }
      }

      // Check if salesPersonId is being changed and if new ID already exists
      if (input.salesPersonId && input.salesPersonId.toUpperCase() !== existingSalesPerson.salesPersonId) {
        const existingId = await SalesPerson.findOne({ salesPersonId: input.salesPersonId.toUpperCase() });
        if (existingId) {
          throw new Error('Sales Person ID already exists');
        }
      }

      const updateData = {
        ...input,
        email: input.email ? input.email.toLowerCase() : existingSalesPerson.email,
        salesPersonId: input.salesPersonId ? input.salesPersonId.toUpperCase() : existingSalesPerson.salesPersonId,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : existingSalesPerson.dateOfBirth,
      };

      const salesPerson = await SalesPerson.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('createdBy', 'name email')
        .lean();

      return {
        ...salesPerson,
        id: salesPerson._id.toString(),
        dateOfBirth: salesPerson.dateOfBirth?.toISOString() || new Date().toISOString(),
        createdAt: salesPerson.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: salesPerson.updatedAt?.toISOString() || new Date().toISOString(),
      };
    },

    deleteSalesPerson: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can delete sales persons
      if (!['Super Admin'].includes(context.user.role)) {
        throw new Error('Not authorized to delete sales persons');
      }

      const salesPerson = await SalesPerson.findById(id);
      
      if (!salesPerson) {
        throw new Error('Sales person not found');
      }

      await SalesPerson.findByIdAndDelete(id);

      return {
        success: true,
        message: 'Sales person deleted successfully',
      };
    },
  },

  SalesPerson: {
    createdBy: async (parent) => {
      if (parent.createdBy && typeof parent.createdBy === 'object') {
        return {
          id: parent.createdBy._id?.toString() || parent.createdBy.id,
          name: parent.createdBy.name,
          email: parent.createdBy.email,
        };
      }
      if (parent.createdBy) {
        const user = await User.findById(parent.createdBy).lean();
        if (user) {
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
          };
        }
      }
      return null;
    },
  },
};

