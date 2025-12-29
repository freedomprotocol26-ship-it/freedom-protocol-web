/**
 * Paystack Payment Service
 * 
 * Handles all payment operations:
 * - Initializing transactions
 * - Verifying payments
 * - Processing webhooks
 * 
 * Paystack Documentation: https://paystack.com/docs/api
 */

const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');

const PAYSTACK_API = 'https://api.paystack.co';

/**
 * Initialize a payment transaction
 * Returns a payment URL to redirect the user to
 * 
 * @param {Object} params - Payment parameters
 * @param {string} params.email - Customer email
 * @param {number} params.amount - Amount in pesewas/kobo (100 = 1 GHS/NGN)
 * @param {string} params.reference - Unique transaction reference
 * @param {string} params.callback_url - URL to redirect after payment
 * @param {Object} params.metadata - Additional data (user_id, plan, etc.)
 * @returns {Promise<Object>} - Authorization URL and reference
 */
async function initializeTransaction(params) {
  try {
    const { email, amount, reference, callback_url, metadata } = params;
    
    const response = await axios.post(
      `${PAYSTACK_API}/transaction/initialize`,
      {
        email,
        amount, // Amount in kobo/pesewas
        reference,
        callback_url,
        metadata,
        currency: metadata?.currency || 'GHS', // Default to Ghana Cedis
        channels: ['card', 'mobile_money', 'bank'] // Payment methods
      },
      {
        headers: {
          Authorization: `Bearer ${config.paystack.secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.status) {
      console.log(`✅ Payment initialized: ${reference}`);
      return {
        success: true,
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        reference: response.data.data.reference
      };
    } else {
      throw new Error(response.data.message);
    }
    
  } catch (error) {
    console.error('❌ Paystack initialization error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Verify a transaction
 * Call this to confirm payment was successful
 * 
 * @param {string} reference - Transaction reference
 * @returns {Promise<Object>} - Transaction details
 */
async function verifyTransaction(reference) {
  try {
    const response = await axios.get(
      `${PAYSTACK_API}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${config.paystack.secretKey}`
        }
      }
    );
    
    if (response.data.status) {
      const data = response.data.data;
      
      return {
        success: data.status === 'success',
        reference: data.reference,
        amount: data.amount / 100, // Convert back to main currency
        currency: data.currency,
        paid_at: data.paid_at,
        channel: data.channel,
        customer: {
          email: data.customer.email,
          customer_code: data.customer.customer_code
        },
        metadata: data.metadata
      };
    } else {
      throw new Error(response.data.message);
    }
    
  } catch (error) {
    console.error('❌ Paystack verification error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Verify webhook signature
 * CRITICAL: Always verify webhooks are from Paystack
 * 
 * @param {string} signature - X-Paystack-Signature header
 * @param {string} body - Raw request body (as string)
 * @returns {boolean} - Whether signature is valid
 */
function verifyWebhookSignature(signature, body) {
  const hash = crypto
    .createHmac('sha512', config.paystack.secretKey)
    .update(body)
    .digest('hex');
  
  return hash === signature;
}

/**
 * Generate a unique payment reference
 * Format: FP-{userId}-{timestamp}
 * 
 * @param {string} userId - User ID
 * @returns {string} - Unique reference
 */
function generateReference(userId) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `FP-${userId.substring(0, 8)}-${timestamp}-${random}`;
}

/**
 * Create a payment link for a user
 * This is what gets sent via WhatsApp
 * 
 * @param {Object} user - User object
 * @param {string} plan - Plan type ('basic', 'plus')
 * @returns {Promise<Object>} - Payment details including URL
 */
async function createPaymentLink(user, plan = 'basic') {
  // Define pricing (in pesewas/kobo - 100 = 1 GHS/NGN)
  const plans = {
    basic: {
      name: 'Freedom Basic',
      amount_ghs: 5000,    // 50 GHS
      amount_ngn: 500000,  // 5,000 NGN
      duration: 90,        // days
      description: 'Full 90-day Freedom Protocol with daily AI coaching'
    },
    plus: {
      name: 'Freedom Plus',
      amount_ghs: 15000,   // 150 GHS
      amount_ngn: 1500000, // 15,000 NGN
      duration: 90,
      description: 'Freedom Protocol + weekly voice coaching'
    }
  };
  
  const selectedPlan = plans[plan] || plans.basic;
  
  // Determine currency and amount based on country
  const currency = user.country === 'Nigeria' ? 'NGN' : 'GHS';
  const amount = user.country === 'Nigeria' ? selectedPlan.amount_ngn : selectedPlan.amount_ghs;
  
  // Generate unique reference
  const reference = generateReference(user.id);
  
  // Create the transaction
  const result = await initializeTransaction({
    email: user.email || `${user.phone}@freedomprotocol.app`, // Use phone as email if not provided
    amount,
    reference,
    callback_url: `${config.app.baseUrl}/payment/callback`,
    metadata: {
      user_id: user.id,
      user_phone: user.phone,
      plan: plan,
      plan_name: selectedPlan.name,
      duration_days: selectedPlan.duration,
      currency,
      custom_fields: [
        {
          display_name: 'Customer Name',
          variable_name: 'customer_name',
          value: user.name
        },
        {
          display_name: 'Plan',
          variable_name: 'plan',
          value: selectedPlan.name
        }
      ]
    }
  });
  
  return {
    ...result,
    plan: selectedPlan,
    amount: amount / 100,
    currency
  };
}

/**
 * Get list of supported banks (for bank transfer)
 */
async function getBanks(country = 'ghana') {
  try {
    const response = await axios.get(
      `${PAYSTACK_API}/bank?country=${country}`,
      {
        headers: {
          Authorization: `Bearer ${config.paystack.secretKey}`
        }
      }
    );
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Error fetching banks:', error.message);
    return [];
  }
}

module.exports = {
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
  generateReference,
  createPaymentLink,
  getBanks
};
