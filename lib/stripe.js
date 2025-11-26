import Stripe from 'stripe';

// Initialize Stripe with secret key from environment variables
// Only initialize if STRIPE_SECRET_KEY is provided
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
  });
}

/**
 * Create a Stripe Product
 * @param {Object} productData - Product data
 * @param {string} productData.name - Product name
 * @param {string} productData.description - Product description
 * @param {string} productData.imageUrl - Product image URL
 * @returns {Promise<Stripe.Product>}
 */
export async function createStripeProduct(productData) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
  try {
    // Stripe has a limit of 2048 characters for image URLs
    // If URL is too long, skip the image
    let imageUrl = null;
    if (productData.imageUrl) {
      if (productData.imageUrl.length > 2048) {
        console.warn(`Image URL is too long (${productData.imageUrl.length} characters). Stripe limit is 2048. Skipping image.`);
      } else {
        imageUrl = productData.imageUrl;
      }
    }

    const productParams = {
      name: productData.name,
      description: productData.description || '',
      metadata: {
        productId: productData.mongoId || '',
      },
    };

    // Only add images array if we have a valid image URL
    if (imageUrl) {
      productParams.images = [imageUrl];
    }

    const product = await stripe.products.create(productParams);
    return product;
  } catch (error) {
    console.error('Error creating Stripe product:', error);
    throw new Error(`Failed to create Stripe product: ${error.message}`);
  }
}

/**
 * Create a Stripe Price
 * @param {Object} priceData - Price data
 * @param {string} priceData.productId - Stripe product ID
 * @param {number} priceData.amount - Amount in cents
 * @param {string} priceData.currency - Currency code (default: 'usd')
 * @param {string} priceData.billingType - 'one_time' or 'recurring'
 * @param {string} priceData.interval - 'day', 'week', 'month', or 'year' (for recurring)
 * @param {number} priceData.intervalCount - Interval count (for recurring)
 * @param {string} priceData.nickname - Price nickname
 * @returns {Promise<Stripe.Price>}
 */
export async function createStripePrice(priceData) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
  try {
    const priceParams = {
      product: priceData.productId,
      unit_amount: priceData.amount, // Amount in cents
      currency: priceData.currency || 'usd',
      nickname: priceData.nickname || undefined,
      metadata: {
        priceId: priceData.mongoId || '',
      },
    };

    if (priceData.billingType === 'recurring') {
      priceParams.recurring = {
        interval: priceData.interval || 'month',
        interval_count: priceData.intervalCount || 1,
      };
    }

    const price = await stripe.prices.create(priceParams);
    return price;
  } catch (error) {
    console.error('Error creating Stripe price:', error);
    throw new Error(`Failed to create Stripe price: ${error.message}`);
  }
}

/**
 * Update a Stripe Product
 * @param {string} stripeProductId - Stripe product ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Stripe.Product>}
 */
export async function updateStripeProduct(stripeProductId, updateData) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
  try {
    const updateParams = {
      name: updateData.name,
      description: updateData.description,
    };

    // Only add images if URL is valid and within Stripe's 2048 character limit
    if (updateData.imageUrl) {
      if (updateData.imageUrl.length > 2048) {
        console.warn(`Image URL is too long (${updateData.imageUrl.length} characters). Stripe limit is 2048. Skipping image update.`);
      } else {
        updateParams.images = [updateData.imageUrl];
      }
    }

    const product = await stripe.products.update(stripeProductId, updateParams);
    return product;
  } catch (error) {
    console.error('Error updating Stripe product:', error);
    throw new Error(`Failed to update Stripe product: ${error.message}`);
  }
}

/**
 * Create a Stripe Customer
 * @param {Object} customerData - Customer data
 * @param {string} customerData.email - Customer email
 * @param {string} customerData.name - Customer name
 * @param {string} customerData.mongoId - MongoDB user ID
 * @returns {Promise<Stripe.Customer>}
 */
export async function createStripeCustomer(customerData) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
  try {
    const customer = await stripe.customers.create({
      email: customerData.email,
      name: customerData.name || '',
      metadata: {
        userId: customerData.mongoId || '',
      },
    });
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw new Error(`Failed to create Stripe customer: ${error.message}`);
  }
}

/**
 * Create a Stripe Subscription
 * @param {Object} subscriptionData - Subscription data
 * @param {string} subscriptionData.customerId - Stripe customer ID
 * @param {Array<string>} subscriptionData.priceIds - Array of Stripe price IDs
 * @param {Object} subscriptionData.metadata - Additional metadata
 * @returns {Promise<Stripe.Subscription>}
 */
export async function createStripeSubscription(subscriptionData) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
  try {
    const subscription = await stripe.subscriptions.create({
      customer: subscriptionData.customerId,
      items: subscriptionData.priceIds.map(priceId => ({
        price: priceId,
      })),
      metadata: subscriptionData.metadata || {},
      expand: ['latest_invoice.payment_intent'],
    });
    return subscription;
  } catch (error) {
    console.error('Error creating Stripe subscription:', error);
    throw new Error(`Failed to create Stripe subscription: ${error.message}`);
  }
}

/**
 * Cancel a Stripe Subscription
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {boolean} cancelAtPeriodEnd - Whether to cancel at period end
 * @returns {Promise<Stripe.Subscription>}
 */
export async function cancelStripeSubscription(subscriptionId, cancelAtPeriodEnd = false) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
  try {
    if (cancelAtPeriodEnd) {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return subscription;
    } else {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    }
  } catch (error) {
    console.error('Error canceling Stripe subscription:', error);
    throw new Error(`Failed to cancel Stripe subscription: ${error.message}`);
  }
}

/**
 * Get a Stripe Product by ID
 * @param {string} productId - Stripe product ID
 * @returns {Promise<Stripe.Product>}
 */
export async function getStripeProduct(productId) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
  try {
    const product = await stripe.products.retrieve(productId);
    return product;
  } catch (error) {
    console.error('Error retrieving Stripe product:', error);
    throw new Error(`Failed to retrieve Stripe product: ${error.message}`);
  }
}

/**
 * Get a Stripe Price by ID
 * @param {string} priceId - Stripe price ID
 * @returns {Promise<Stripe.Price>}
 */
export async function getStripePrice(priceId) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
  try {
    const price = await stripe.prices.retrieve(priceId);
    return price;
  } catch (error) {
    console.error('Error retrieving Stripe price:', error);
    throw new Error(`Failed to retrieve Stripe price: ${error.message}`);
  }
}

/**
 * Create a Stripe Checkout Session for quotation payment
 * Handles both one-time payments and subscriptions
 * @param {Object} quotationData - Quotation data
 * @param {string} quotationData.quotationNo - Quotation number
 * @param {number} quotationData.totalAmount - Total amount in currency units (not cents)
 * @param {string} quotationData.currency - Currency code (e.g., 'usd', 'inr')
 * @param {string} quotationData.to.email - Client email
 * @param {string} quotationData.to.businessName - Client business name
 * @param {string} quotationData.id - Quotation ID
 * @param {Array} quotationData.lineItems - Line items array
 * @returns {Promise<string>} Checkout session URL
 */
// Helper function to validate image URL for Stripe (max 2048 characters)
const validateImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  if (imageUrl.length > 2048) {
    console.warn(`Image URL is too long (${imageUrl.length} characters). Stripe limit is 2048. Skipping image.`);
    return null;
  }
  return imageUrl;
};

// Helper function to format currency symbol
const getCurrencySymbol = (currency) => {
  const symbols = {
    usd: '$',
    inr: '₹',
    eur: '€',
    gbp: '£',
    aud: 'A$',
    cad: 'C$',
    jpy: '¥',
  };
  return symbols[currency?.toLowerCase()] || currency?.toUpperCase() || '$';
};

// Helper function to create clean product description with price breakdown
const createDetailedDescription = (item, currency, isSubscription = false, subscriptionDetails = null) => {
  const currencySymbol = getCurrencySymbol(currency);
  const parts = [];
  
  // Add selected attributes/options with prices (clean format)
  if (item.selectedOptions && item.selectedOptions.length > 0) {
    const optionsText = item.selectedOptions
      .map(opt => {
        let optText = `${opt.attributeName}: ${opt.optionLabel}`;
        if (opt.price && opt.price > 0) {
          optText += ` (${currencySymbol}${opt.price.toFixed(2)})`;
        }
        return optText;
      })
      .join(' | ');
    parts.push(optionsText);
  }
  
  // Add price breakdown (clean and simple)
  const unitPrice = item.rate || 0;
  const quantity = item.quantity || 1;
  const lineTotal = item.total || (unitPrice * quantity);
  
  if (quantity > 1) {
    parts.push(`${currencySymbol}${unitPrice.toFixed(2)} × ${quantity} = ${currencySymbol}${lineTotal.toFixed(2)}`);
  } else {
    parts.push(`${currencySymbol}${lineTotal.toFixed(2)}`);
  }
  
  // Add subscription details if applicable
  if (isSubscription && subscriptionDetails) {
    const interval = subscriptionDetails.interval || 'month';
    const intervalCount = subscriptionDetails.intervalCount || 1;
    const intervalText = intervalCount === 1 
      ? interval.charAt(0).toUpperCase() + interval.slice(1) 
      : `Every ${intervalCount} ${interval}s`;
    parts.push(`Billed ${intervalText.toLowerCase()}`);
  }
  
  return parts.join('\n');
};

export async function createQuotationPaymentLink(quotationData) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
  
  try {
    const lineItems = quotationData.lineItems || [];
    const currency = quotationData.currency.toLowerCase() || 'usd';
    
    // Check if quotation has subscription items
    const hasSubscriptions = lineItems.some(item => item.isSubscription);
    const hasOneTimeItems = lineItems.some(item => !item.isSubscription);
    
    // Separate subscription and one-time items
    const subscriptionItems = lineItems.filter(item => item.isSubscription);
    const oneTimeItems = lineItems.filter(item => !item.isSubscription);
    
    // Calculate totals
    const subscriptionTotal = subscriptionItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const oneTimeTotal = oneTimeItems.reduce((sum, item) => sum + (item.total || 0), 0);
    
    const lineItemsForStripe = [];
    
    // Determine checkout mode and handle items accordingly
    let mode;
    
    if (hasSubscriptions && hasOneTimeItems) {
      // Mixed: Use subscription mode with setup fee for one-time items
      mode = 'subscription';
      
      // Add subscription items
      const subscriptionsByInterval = {};
      
      subscriptionItems.forEach(item => {
        const interval = item.subscriptionDetails?.interval || 'month';
        const intervalCount = item.subscriptionDetails?.intervalCount || 1;
        const key = `${interval}_${intervalCount}`;
        
        if (!subscriptionsByInterval[key]) {
          subscriptionsByInterval[key] = {
            interval: interval,
            intervalCount: intervalCount,
            items: [],
            total: 0,
          };
        }
        
        subscriptionsByInterval[key].items.push(item);
        subscriptionsByInterval[key].total += item.total || 0;
      });
      
      // Create subscription line items - show individual products
      Object.values(subscriptionsByInterval).forEach(group => {
        group.items.forEach(item => {
          const itemDescription = createDetailedDescription(
            { ...item, quotationNo: quotationData.quotationNo },
            currency,
            true,
            { interval: group.interval, intervalCount: group.intervalCount }
          );
          
          const validImageUrl = validateImageUrl(item.imageUrl);
          const productData = {
            name: item.itemName || `Subscription from Quotation ${quotationData.quotationNo || ''}`,
            description: itemDescription,
          };
          if (validImageUrl) {
            productData.images = [validImageUrl];
          }
          
          lineItemsForStripe.push({
            price_data: {
              currency: currency,
              product_data: productData,
              unit_amount: Math.round((item.rate || 0) * 100), // Price per unit
              recurring: {
                interval: group.interval,
                interval_count: group.intervalCount,
              },
            },
            quantity: item.quantity || 1,
          });
        });
      });
      
      // Add one-time items as individual line items (will be charged once with subscription)
      oneTimeItems.forEach(item => {
        const itemDescription = createDetailedDescription(
          { ...item, quotationNo: quotationData.quotationNo },
          currency,
          false,
          null
        );
        
        const validImageUrl = validateImageUrl(item.imageUrl);
        const productData = {
          name: item.itemName || `Product from Quotation ${quotationData.quotationNo || ''}`,
          description: itemDescription,
        };
        if (validImageUrl) {
          productData.images = [validImageUrl];
        }
        
        lineItemsForStripe.push({
          price_data: {
            currency: currency,
            product_data: productData,
            unit_amount: Math.round((item.rate || 0) * 100), // Price per unit
          },
          quantity: item.quantity || 1,
        });
      });
    } else if (hasSubscriptions) {
      // Only subscriptions
      mode = 'subscription';
      
      const subscriptionsByInterval = {};
      
      subscriptionItems.forEach(item => {
        const interval = item.subscriptionDetails?.interval || 'month';
        const intervalCount = item.subscriptionDetails?.intervalCount || 1;
        const key = `${interval}_${intervalCount}`;
        
        if (!subscriptionsByInterval[key]) {
          subscriptionsByInterval[key] = {
            interval: interval,
            intervalCount: intervalCount,
            items: [],
            total: 0,
          };
        }
        
        subscriptionsByInterval[key].items.push(item);
        subscriptionsByInterval[key].total += item.total || 0;
      });
      
      // Create individual subscription line items for each product
      Object.values(subscriptionsByInterval).forEach(group => {
        group.items.forEach(item => {
          const itemDescription = createDetailedDescription(
            { ...item, quotationNo: quotationData.quotationNo },
            currency,
            true,
            { interval: group.interval, intervalCount: group.intervalCount }
          );
          
          const validImageUrl = validateImageUrl(item.imageUrl);
          const productData = {
            name: item.itemName || `Subscription from Quotation ${quotationData.quotationNo || ''}`,
            description: itemDescription,
          };
          if (validImageUrl) {
            productData.images = [validImageUrl];
          }
          
          lineItemsForStripe.push({
            price_data: {
              currency: currency,
              product_data: productData,
              unit_amount: Math.round((item.rate || 0) * 100), // Price per unit
              recurring: {
                interval: group.interval,
                interval_count: group.intervalCount,
              },
            },
            quantity: item.quantity || 1,
          });
        });
      });
    } else {
      // Only one-time payments - show individual products
      mode = 'payment';
      
      // Create individual line items for each product
      oneTimeItems.forEach(item => {
        const itemDescription = createDetailedDescription(
          { ...item, quotationNo: quotationData.quotationNo },
          currency,
          false,
          null
        );
        
        const validImageUrl = validateImageUrl(item.imageUrl);
        const productData = {
          name: item.itemName || `Product from Quotation ${quotationData.quotationNo || ''}`,
          description: itemDescription,
        };
        if (validImageUrl) {
          productData.images = [validImageUrl];
        }
        
        lineItemsForStripe.push({
          price_data: {
            currency: currency,
            product_data: productData,
            unit_amount: Math.round((item.rate || 0) * 100), // Price per unit
          },
          quantity: item.quantity || 1,
        });
      });
    }
    
    // Create checkout session
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: lineItemsForStripe,
      mode: mode,
      customer_email: quotationData.to?.email,
      metadata: {
        quotationId: quotationData.id || quotationData._id?.toString() || '',
        quotationNo: quotationData.quotationNo || '',
        clientName: quotationData.to?.businessName || '',
        hasSubscriptions: hasSubscriptions.toString(),
        hasOneTimeItems: hasOneTimeItems.toString(),
      },
      success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/payment/cancel?quotation_id=${quotationData.id || ''}`,
    };
    
    // For subscriptions, add subscription_data
    if (mode === 'subscription') {
      sessionParams.subscription_data = {
        metadata: {
          quotationId: quotationData.id || quotationData._id?.toString() || '',
          quotationNo: quotationData.quotationNo || '',
        },
      };
    }
    
    const session = await stripe.checkout.sessions.create(sessionParams);

    return session.url;
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    throw new Error(`Failed to create payment link: ${error.message}`);
  }
}

export default stripe;


