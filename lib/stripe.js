import Stripe from 'stripe';

// Initialize Stripe with secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Create a Stripe Product
 * @param {Object} productData - Product data
 * @param {string} productData.name - Product name
 * @param {string} productData.description - Product description
 * @param {string} productData.imageUrl - Product image URL
 * @returns {Promise<Stripe.Product>}
 */
export async function createStripeProduct(productData) {
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
  try {
    const price = await stripe.prices.retrieve(priceId);
    return price;
  } catch (error) {
    console.error('Error retrieving Stripe price:', error);
    throw new Error(`Failed to retrieve Stripe price: ${error.message}`);
  }
}

export default stripe;


