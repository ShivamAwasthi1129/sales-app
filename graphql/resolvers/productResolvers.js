import connectDB from '../../lib/mongodb.js';
import Group from '../../models/Group.js';
import Product from '../../models/Product.js';
import Attribute from '../../models/Attribute.js';
import AttributeOption from '../../models/AttributeOption.js';
import Price from '../../models/Price.js';

export const productResolvers = {
  Query: {
    getProducts: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const products = await Product.find()
        .populate('groupId')
        .populate('basePrice')
        .populate({
          path: 'attributes',
          populate: {
            path: 'options',
            populate: {
              path: 'price',
              model: 'Price'
            }
          }
        })
        .sort({ createdAt: -1 });

      return products.map(product => {
        const productObj = product.toObject();
        
        // Ensure attributes have valid IDs and prices
        const attributes = (productObj.attributes || []).map(attr => {
          if (!attr || !attr._id) return null;
          
          const attrId = attr._id.toString();
          if (!attrId) return null;

          const options = (attr.options || []).map(opt => {
            if (!opt || !opt._id) return null;
            
            const optId = opt._id.toString();
            if (!optId) return null;

            // Ensure price has valid ID
            if (!opt.price || !opt.price._id) {
              return null; // Skip options without valid prices
            }

            const priceId = opt.price._id.toString();
            if (!priceId) return null;

            return {
              ...opt,
              id: optId,
              price: {
                ...opt.price,
                id: priceId,
                amount: opt.price.amount || 0,
                currency: opt.price.currency || 'usd',
                billingType: opt.price.billingType || 'one_time',
                status: opt.price.status || 'active',
                createdAt: opt.price.createdAt?.toISOString() || new Date().toISOString(),
                updatedAt: opt.price.updatedAt?.toISOString() || new Date().toISOString(),
              },
              createdAt: opt.createdAt?.toISOString() || new Date().toISOString(),
              updatedAt: opt.updatedAt?.toISOString() || new Date().toISOString(),
            };
          }).filter(opt => opt !== null); // Remove null options

          return {
            ...attr,
            id: attrId,
            options: options,
            createdAt: attr.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: attr.updatedAt?.toISOString() || new Date().toISOString(),
          };
        }).filter(attr => attr !== null); // Remove null attributes

        // Ensure basePrice has valid ID if it exists
        let basePriceObj = null;
        if (productObj.basePrice && productObj.basePrice._id) {
          const basePriceId = productObj.basePrice._id.toString();
          if (basePriceId) {
            basePriceObj = {
              ...productObj.basePrice,
              id: basePriceId,
              createdAt: productObj.basePrice.createdAt?.toISOString() || new Date().toISOString(),
              updatedAt: productObj.basePrice.updatedAt?.toISOString() || new Date().toISOString(),
            };
          }
        }

        return {
          ...productObj,
          id: productObj._id.toString(),
          attributes: attributes,
          basePrice: basePriceObj,
          createdAt: productObj.createdAt.toISOString(),
          updatedAt: productObj.updatedAt.toISOString(),
        };
      });
    },

    getProduct: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const product = await Product.findById(id)
        .populate('groupId')
        .populate('basePrice')
        .populate({
          path: 'attributes',
          populate: {
            path: 'options',
            populate: {
              path: 'price',
              model: 'Price'
            }
          }
        });

      if (!product) {
        throw new Error('Product not found');
      }

      const productObj = product.toObject();
      
      // Ensure attributes have valid IDs and prices
      const attributes = (productObj.attributes || []).map(attr => {
        if (!attr || !attr._id) return null;
        
        const attrId = attr._id.toString();
        if (!attrId) return null;

        const options = (attr.options || []).map(opt => {
          if (!opt || !opt._id) return null;
          
          const optId = opt._id.toString();
          if (!optId) return null;

          // Ensure price has valid ID
          if (!opt.price || !opt.price._id) {
            return null; // Skip options without valid prices
          }

          const priceId = opt.price._id.toString();
          if (!priceId) return null;

          return {
            ...opt,
            id: optId,
            price: {
              ...opt.price,
              id: priceId,
              amount: opt.price.amount || 0,
              currency: opt.price.currency || 'usd',
              billingType: opt.price.billingType || 'one_time',
              status: opt.price.status || 'active',
              createdAt: opt.price.createdAt?.toISOString() || new Date().toISOString(),
              updatedAt: opt.price.updatedAt?.toISOString() || new Date().toISOString(),
            },
            createdAt: opt.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: opt.updatedAt?.toISOString() || new Date().toISOString(),
          };
        }).filter(opt => opt !== null); // Remove null options

        return {
          ...attr,
          id: attrId,
          options: options,
          createdAt: attr.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: attr.updatedAt?.toISOString() || new Date().toISOString(),
        };
      }).filter(attr => attr !== null); // Remove null attributes

      // Ensure basePrice has valid ID if it exists
      let basePriceObj = null;
      if (productObj.basePrice && productObj.basePrice._id) {
        const basePriceId = productObj.basePrice._id.toString();
        if (basePriceId) {
          basePriceObj = {
            ...productObj.basePrice,
            id: basePriceId,
            createdAt: productObj.basePrice.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: productObj.basePrice.updatedAt?.toISOString() || new Date().toISOString(),
          };
        }
      }

      return {
        ...productObj,
        id: productObj._id.toString(),
        attributes: attributes,
        basePrice: basePriceObj,
        createdAt: productObj.createdAt.toISOString(),
        updatedAt: productObj.updatedAt.toISOString(),
      };
    },

    getGroups: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const groups = await Group.find().sort({ order: 1, createdAt: -1 });

      return groups.map(group => ({
        ...group.toObject(),
        id: group._id.toString(),
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
      }));
    },

    getGroup: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const group = await Group.findById(id);
      if (!group) {
        throw new Error('Group not found');
      }

      return {
        ...group.toObject(),
        id: group._id.toString(),
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
      };
    },

    getAttributes: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const attributes = await Attribute.find()
        .populate({
          path: 'options',
          populate: 'price'
        })
        .sort({ order: 1, createdAt: -1 });

      return attributes.map(attr => ({
        ...attr.toObject(),
        id: attr._id.toString(),
        createdAt: attr.createdAt.toISOString(),
        updatedAt: attr.updatedAt.toISOString(),
      }));
    },

    getAttribute: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const attribute = await Attribute.findById(id)
        .populate({
          path: 'options',
          populate: 'price'
        });

      if (!attribute) {
        throw new Error('Attribute not found');
      }

      return {
        ...attribute.toObject(),
        id: attribute._id.toString(),
        createdAt: attribute.createdAt.toISOString(),
        updatedAt: attribute.updatedAt.toISOString(),
      };
    },

    getPrices: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const prices = await Price.find().sort({ createdAt: -1 });

      return prices.map(price => ({
        ...price.toObject(),
        id: price._id.toString(),
        createdAt: price.createdAt.toISOString(),
        updatedAt: price.updatedAt.toISOString(),
      }));
    },

    getPrice: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const price = await Price.findById(id);
      if (!price) {
        throw new Error('Price not found');
      }

      return {
        ...price.toObject(),
        id: price._id.toString(),
        createdAt: price.createdAt.toISOString(),
        updatedAt: price.updatedAt.toISOString(),
      };
    },
  },

  Mutation: {
    createGroup: async (_, { name, slug, description }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      if (!['Super Admin', 'Admin', 'AdminTeam'].includes(context.user.role)) {
        throw new Error('Not authorized');
      }

      // Generate slug if not provided
      const groupSlug = slug || name.toLowerCase().replace(/\s+/g, '-');

      const group = await Group.create({
        name,
        slug: groupSlug,
        description,
        createdBy: context.user.id,
      });

      return {
        ...group.toObject(),
        id: group._id.toString(),
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
      };
    },

    updateGroup: async (_, { id, name, slug, description, status, order }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      if (!['Super Admin', 'Admin', 'AdminTeam'].includes(context.user.role)) {
        throw new Error('Not authorized');
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (slug) updateData.slug = slug;
      if (description !== undefined) updateData.description = description;
      if (status) updateData.status = status;
      if (order !== undefined) updateData.order = order;

      const group = await Group.findByIdAndUpdate(id, updateData, { new: true });
      if (!group) {
        throw new Error('Group not found');
      }

      return {
        ...group.toObject(),
        id: group._id.toString(),
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
      };
    },

    deleteGroup: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      if (!['Super Admin', 'Admin'].includes(context.user.role)) {
        throw new Error('Not authorized');
      }

      const group = await Group.findByIdAndDelete(id);
      if (!group) {
        throw new Error('Group not found');
      }

      return { success: true, message: 'Group deleted successfully' };
    },

    createPrice: async (_, { input, productId }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      if (!['Super Admin', 'Admin', 'AdminTeam'].includes(context.user.role)) {
        throw new Error('Not authorized');
      }

      const price = await Price.create({
        ...input,
        productId: productId || null,
        currency: input.currency || 'usd',
      });

      return {
        ...price.toObject(),
        id: price._id.toString(),
        createdAt: price.createdAt.toISOString(),
        updatedAt: price.updatedAt.toISOString(),
      };
    },

    createAttribute: async (_, { input }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      if (!['Super Admin', 'Admin', 'AdminTeam'].includes(context.user.role)) {
        throw new Error('Not authorized');
      }

      // Create Price documents for each option
      const optionPromises = input.options.map(async (optionInput) => {
        // Create Price document for this option
        const price = await Price.create({
          amount: optionInput.price.amount,
          currency: optionInput.price.currency || 'usd',
          billingType: optionInput.price.billingType,
          interval: optionInput.price.interval,
          intervalCount: optionInput.price.intervalCount,
          nickname: optionInput.price.nickname,
        });

        // Create AttributeOption with Price reference
        const option = await AttributeOption.create({
          label: optionInput.label,
          value: optionInput.value,
          description: optionInput.description,
          price: price._id,
          defaultSelected: optionInput.defaultSelected || false,
          order: optionInput.order || 0,
        });

        return option._id;
      });

      const optionIds = await Promise.all(optionPromises);

      // Create Attribute with Option references
      const attribute = await Attribute.create({
        name: input.name,
        description: input.description,
        uiType: input.uiType,
        isMandatory: input.isMandatory || false,
        options: optionIds,
        order: input.order || 0,
      });

      return await Attribute.findById(attribute._id)
        .populate({
          path: 'options',
          populate: 'price'
        })
        .then(attr => ({
          ...attr.toObject(),
          id: attr._id.toString(),
          createdAt: attr.createdAt.toISOString(),
          updatedAt: attr.updatedAt.toISOString(),
        }));
    },

    createProduct: async (_, { input }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      if (!['Super Admin', 'Admin', 'AdminTeam'].includes(context.user.role)) {
        throw new Error('Not authorized');
      }

      // Step 1: Create base Price if provided
      let basePriceId = null;
      if (input.basePrice) {
        const basePrice = await Price.create({
          amount: input.basePrice.amount,
          currency: input.basePrice.currency || 'usd',
          billingType: input.basePrice.billingType,
          interval: input.basePrice.interval,
          intervalCount: input.basePrice.intervalCount,
          nickname: input.basePrice.nickname,
        });
        basePriceId = basePrice._id;
      }

      // Step 2: Create Attributes with their Options and Prices
      const attributePromises = input.attributes.map(async (attrInput) => {
        // Create Price documents for each option
        const optionPromises = attrInput.options.map(async (optionInput) => {
          const price = await Price.create({
            amount: optionInput.price.amount,
            currency: optionInput.price.currency || 'usd',
            billingType: optionInput.price.billingType,
            interval: optionInput.price.interval,
            intervalCount: optionInput.price.intervalCount,
            nickname: optionInput.price.nickname,
          });

          const option = await AttributeOption.create({
            label: optionInput.label,
            value: optionInput.value,
            description: optionInput.description,
            price: price._id,
            defaultSelected: optionInput.defaultSelected || false,
            order: optionInput.order || 0,
          });

          return option._id;
        });

        const optionIds = await Promise.all(optionPromises);

        // Create Attribute
        const attribute = await Attribute.create({
          name: attrInput.name,
          description: attrInput.description,
          uiType: attrInput.uiType,
          isMandatory: attrInput.isMandatory || false,
          options: optionIds,
          order: attrInput.order || 0,
        });

        return attribute._id;
      });

      const attributeIds = await Promise.all(attributePromises);

      // Step 3: Create Product
      const product = await Product.create({
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl,
        image: input.imageUrl, // Also set image field
        groupId: input.groupId,
        attributes: attributeIds,
        basePrice: basePriceId,
        discount: input.discount,
        billingMode: input.billingMode,
        tags: input.tags || [],
        createdBy: context.user.id,
      });

      // Step 4: Update basePrice with productId if it exists
      if (basePriceId) {
        await Price.findByIdAndUpdate(basePriceId, { productId: product._id });
      }

      // Return populated product
      const populatedProduct = await Product.findById(product._id)
        .populate('groupId')
        .populate('basePrice')
        .populate({
          path: 'attributes',
          populate: {
            path: 'options',
            populate: {
              path: 'price',
              model: 'Price'
            }
          }
        });

      if (!populatedProduct) {
        throw new Error('Failed to create product');
      }

      // Ensure all required fields are present
      const productObj = populatedProduct.toObject();
      
      // Helper function to ensure valid ID
      const ensureId = (obj, fallbackId) => {
        if (!obj) return null;
        const id = obj._id?.toString() || obj.id;
        if (!id || id === '' || id === 'default') {
          return fallbackId || null;
        }
        return id;
      };

      // Ensure attributes have proper structure with valid IDs
      const attributes = (productObj.attributes || []).map((attr, attrIndex) => {
        if (!attr || !attr._id) {
          throw new Error(`Attribute at index ${attrIndex} is missing _id`);
        }

        const attrId = attr._id.toString();
        if (!attrId) {
          throw new Error(`Attribute at index ${attrIndex} has invalid _id`);
        }

        const attrObj = {
          ...attr,
          id: attrId,
          name: attr.name || 'Unnamed Attribute',
          uiType: attr.uiType || 'dropdown',
          isMandatory: attr.isMandatory || false,
          status: attr.status || 'active',
          order: attr.order || 0,
          description: attr.description || '',
          options: (attr.options || []).map((opt, optIndex) => {
            if (!opt || !opt._id) {
              throw new Error(`Option at index ${optIndex} in attribute ${attrId} is missing _id`);
            }

            const optId = opt._id.toString();
            if (!optId) {
              throw new Error(`Option at index ${optIndex} in attribute ${attrId} has invalid _id`);
            }

            // Ensure price exists and has valid ID
            let priceObj = null;
            if (opt.price) {
              const priceId = opt.price._id?.toString() || opt.price.id;
              if (!priceId || priceId === '' || priceId === 'default') {
                // If price exists but has invalid ID, create a new price
                throw new Error(`Price for option ${optId} has invalid ID. This should not happen.`);
              }
              priceObj = {
                ...opt.price,
                id: priceId,
                amount: opt.price.amount || 0,
                currency: opt.price.currency || 'usd',
                billingType: opt.price.billingType || 'one_time',
                status: opt.price.status || 'active',
                createdAt: opt.price.createdAt?.toISOString() || new Date().toISOString(),
                updatedAt: opt.price.updatedAt?.toISOString() || new Date().toISOString(),
              };
            } else {
              // If price is missing, this is an error - every option must have a price
              throw new Error(`Option ${optId} in attribute ${attrId} is missing price. This should not happen.`);
            }

            return {
              ...opt,
              id: optId,
              label: opt.label || 'Unnamed Option',
              value: opt.value || opt.label?.toLowerCase().replace(/\s+/g, '_') || `option_${optIndex}`,
              description: opt.description || '',
              defaultSelected: opt.defaultSelected || false,
              order: opt.order || 0,
              status: opt.status || 'active',
              price: priceObj,
              createdAt: opt.createdAt?.toISOString() || new Date().toISOString(),
              updatedAt: opt.updatedAt?.toISOString() || new Date().toISOString(),
            };
          })
        };
        return attrObj;
      });

      // Ensure basePrice has valid ID if it exists
      let basePriceObj = null;
      if (productObj.basePrice) {
        const basePriceId = productObj.basePrice._id?.toString() || productObj.basePrice.id;
        if (!basePriceId || basePriceId === '') {
          throw new Error('Base price exists but has invalid ID');
        }
        basePriceObj = {
          ...productObj.basePrice,
          id: basePriceId,
          amount: productObj.basePrice.amount || 0,
          currency: productObj.basePrice.currency || 'usd',
          billingType: productObj.basePrice.billingType || 'one_time',
          status: productObj.basePrice.status || 'active',
          createdAt: productObj.basePrice.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: productObj.basePrice.updatedAt?.toISOString() || new Date().toISOString(),
        };
      }

      const productId = productObj._id?.toString();
      if (!productId) {
        throw new Error('Product has invalid _id');
      }

      return {
        ...productObj,
        id: productId,
        name: productObj.name || 'Unnamed Product',
        status: productObj.status || 'draft',
        tags: productObj.tags || [],
        attributes: attributes,
        basePrice: basePriceObj,
        groupId: productObj.groupId ? (productObj.groupId._id?.toString() || productObj.groupId.id || productObj.groupId) : productObj.groupId,
        createdAt: productObj.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: productObj.updatedAt?.toISOString() || new Date().toISOString(),
      };
    },

    updateProduct: async (_, { id, input }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      if (!['Super Admin', 'Admin', 'AdminTeam'].includes(context.user.role)) {
        throw new Error('Not authorized');
      }

      // For now, return error - full update implementation would be complex
      // as it needs to handle updating nested attributes, options, and prices
      throw new Error('Update product not yet implemented. Please delete and recreate.');
    },

    deleteProduct: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      if (!['Super Admin', 'Admin'].includes(context.user.role)) {
        throw new Error('Not authorized');
      }

      const product = await Product.findByIdAndDelete(id);
      if (!product) {
        throw new Error('Product not found');
      }

      return { success: true, message: 'Product deleted successfully' };
    },

    updateAttribute: async (_, { id, input }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      if (!['Super Admin', 'Admin', 'AdminTeam'].includes(context.user.role)) {
        throw new Error('Not authorized');
      }

      throw new Error('Update attribute not yet implemented');
    },

    deleteAttribute: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      if (!['Super Admin', 'Admin'].includes(context.user.role)) {
        throw new Error('Not authorized');
      }

      const attribute = await Attribute.findByIdAndDelete(id);
      if (!attribute) {
        throw new Error('Attribute not found');
      }

      return { success: true, message: 'Attribute deleted successfully' };
    },

    updatePrice: async (_, { id, input }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      if (!['Super Admin', 'Admin', 'AdminTeam'].includes(context.user.role)) {
        throw new Error('Not authorized');
      }

      const price = await Price.findByIdAndUpdate(id, input, { new: true });
      if (!price) {
        throw new Error('Price not found');
      }

      return {
        ...price.toObject(),
        id: price._id.toString(),
        createdAt: price.createdAt.toISOString(),
        updatedAt: price.updatedAt.toISOString(),
      };
    },

    deletePrice: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      if (!['Super Admin', 'Admin'].includes(context.user.role)) {
        throw new Error('Not authorized');
      }

      const price = await Price.findByIdAndDelete(id);
      if (!price) {
        throw new Error('Price not found');
      }

      return { success: true, message: 'Price deleted successfully' };
    },
  },
};

