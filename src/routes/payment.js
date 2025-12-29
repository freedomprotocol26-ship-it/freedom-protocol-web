/**
 * Payment Routes
 * 
 * Handles:
 * 1. Payment initiation
 * 2. Payment callback (redirect after payment)
 * 3. Paystack webhooks (server-to-server confirmation)
 */

const express = require('express');
const router = express.Router();
const config = require('../config');

// Services
const { 
  createPaymentLink, 
  verifyTransaction, 
  verifyWebhookSignature 
} = require('../services/paystack');
const { sendTextMessage } = require('../services/whatsapp');

// Database
const { 
  getUserById, 
  getUserByPhone,
  updateUserStatus,
  recordPayment,
  getPaymentByReference
} = require('../db/queries');

/**
 * POST /payment/initialize
 * 
 * Create a new payment for a user
 * Called when user wants to subscribe
 */
router.post('/payment/initialize', async (req, res) => {
  try {
    const { phone, plan } = req.body;
    
    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number is required' 
      });
    }
    
    // Get user
    const user = await getUserByPhone(phone);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found. Please register first.' 
      });
    }
    
    // Check if already subscribed
    if (user.subscription_status === 'active') {
      return res.status(400).json({ 
        success: false, 
        message: 'You already have an active subscription.' 
      });
    }
    
    // Create payment link
    const payment = await createPaymentLink(user, plan || 'basic');
    
    // Save payment record (pending)
    await recordPayment({
      user_id: user.id,
      reference: payment.reference,
      amount: payment.amount,
      currency: payment.currency,
      plan: plan || 'basic',
      status: 'pending'
    });
    
    res.json({
      success: true,
      message: 'Payment link created',
      payment_url: payment.authorization_url,
      reference: payment.reference,
      amount: payment.amount,
      currency: payment.currency,
      plan: payment.plan.name
    });
    
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Could not create payment. Please try again.' 
    });
  }
});

/**
 * GET /payment/callback
 * 
 * Paystack redirects here after payment
 * We verify and show success/failure page
 */
router.get('/payment/callback', async (req, res) => {
  try {
    const { reference, trxref } = req.query;
    const ref = reference || trxref;
    
    if (!ref) {
      return res.send(getResultPage(false, 'No payment reference provided'));
    }
    
    // Verify the transaction
    const verification = await verifyTransaction(ref);
    
    if (verification.success) {
      // Payment successful - activate user
      const userId = verification.metadata?.user_id;
      
      if (userId) {
        // Update user status
        await activateUserSubscription(userId, verification);
        
        // Get user for WhatsApp message
        const user = await getUserById(userId);
        
        if (user) {
          // Send confirmation via WhatsApp
          await sendTextMessage(
            user.phone,
            `🎉 Payment received! Thank you, ${user.name}!\n\nYour Freedom Protocol subscription is now active.\n\nReply "START" to begin your 90-day journey to better health!`
          );
        }
      }
      
      res.send(getResultPage(true, 'Payment successful! Check WhatsApp for next steps.'));
    } else {
      res.send(getResultPage(false, 'Payment was not successful. Please try again.'));
    }
    
  } catch (error) {
    console.error('Payment callback error:', error);
    res.send(getResultPage(false, 'Could not verify payment. Please contact support.'));
  }
});

/**
 * POST /payment/webhook
 * 
 * Paystack sends events here (server-to-server)
 * This is more reliable than the callback
 */
router.post('/payment/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Get the signature from headers
    const signature = req.headers['x-paystack-signature'];
    
    // Get raw body as string
    const rawBody = req.body.toString();
    
    // Verify signature
    if (!verifyWebhookSignature(signature, rawBody)) {
      console.error('❌ Invalid Paystack webhook signature');
      return res.status(400).send('Invalid signature');
    }
    
    // Parse the event
    const event = JSON.parse(rawBody);
    
    console.log(`📥 Paystack webhook: ${event.event}`);
    
    // Handle different events
    switch (event.event) {
      case 'charge.success':
        await handleSuccessfulCharge(event.data);
        break;
        
      case 'charge.failed':
        await handleFailedCharge(event.data);
        break;
        
      case 'subscription.create':
        // Handle if you implement recurring subscriptions
        break;
        
      default:
        console.log(`Unhandled event: ${event.event}`);
    }
    
    // Always respond 200 to acknowledge receipt
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Webhook processing failed');
  }
});

/**
 * Handle successful payment
 */
async function handleSuccessfulCharge(data) {
  try {
    const { reference, metadata, amount, currency, paid_at } = data;
    
    console.log(`✅ Payment successful: ${reference}`);
    
    // Update payment record
    await updatePaymentStatus(reference, 'success', {
      paid_at,
      amount: amount / 100,
      currency
    });
    
    // Activate user subscription
    const userId = metadata?.user_id;
    if (userId) {
      await activateUserSubscription(userId, {
        reference,
        amount: amount / 100,
        currency,
        metadata
      });
      
      // Send WhatsApp confirmation
      const user = await getUserById(userId);
      if (user) {
        await sendTextMessage(
          user.phone,
          `🎉 Payment confirmed! Your Freedom Protocol subscription is now active.\n\nReply "START" to begin your 90-day journey!`
        );
      }
    }
    
  } catch (error) {
    console.error('Error handling successful charge:', error);
  }
}

/**
 * Handle failed payment
 */
async function handleFailedCharge(data) {
  try {
    const { reference, metadata } = data;
    
    console.log(`❌ Payment failed: ${reference}`);
    
    // Update payment record
    await updatePaymentStatus(reference, 'failed');
    
    // Notify user
    const userId = metadata?.user_id;
    if (userId) {
      const user = await getUserById(userId);
      if (user) {
        await sendTextMessage(
          user.phone,
          `Your payment was not successful. Please try again or contact support if you need help.`
        );
      }
    }
    
  } catch (error) {
    console.error('Error handling failed charge:', error);
  }
}

/**
 * Activate user subscription after successful payment
 */
async function activateUserSubscription(userId, paymentData) {
  const { query } = require('../db');
  
  const durationDays = paymentData.metadata?.duration_days || 90;
  const plan = paymentData.metadata?.plan || 'basic';
  
  await query(`
    UPDATE users SET
      subscription_status = 'active',
      subscription_plan = $2,
      subscription_start = NOW(),
      subscription_end = NOW() + INTERVAL '${durationDays} days',
      payment_reference = $3,
      status = 'pending'
    WHERE id = $1
  `, [userId, plan, paymentData.reference]);
  
  console.log(`✅ User ${userId} subscription activated (${plan})`);
}

/**
 * Update payment status in database
 */
async function updatePaymentStatus(reference, status, additionalData = {}) {
  const { query } = require('../db');
  
  await query(`
    UPDATE payments SET
      status = $2,
      paid_at = $3,
      updated_at = NOW()
    WHERE reference = $1
  `, [reference, status, additionalData.paid_at || null]);
}

/**
 * Generate HTML result page
 */
function getResultPage(success, message) {
  const bgColor = success ? '#1d283d' : '#4a1c1c';
  const iconColor = success ? '#4db5ff' : '#ff6b6b';
  const icon = success ? '✓' : '✗';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment ${success ? 'Successful' : 'Failed'} - Freedom Protocol</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: ${bgColor};
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          padding: 20px;
        }
        .container {
          text-align: center;
          max-width: 400px;
        }
        .icon {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: ${iconColor};
          color: #fff;
          font-size: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 30px;
        }
        h1 { margin-bottom: 15px; font-size: 1.8rem; }
        p { opacity: 0.9; line-height: 1.6; margin-bottom: 30px; }
        .btn {
          display: inline-block;
          background: #25D366;
          color: #fff;
          padding: 15px 30px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">${icon}</div>
        <h1>Payment ${success ? 'Successful!' : 'Failed'}</h1>
        <p>${message}</p>
        ${success ? '<a href="https://wa.me/" class="btn">Open WhatsApp</a>' : '<a href="javascript:history.back()" class="btn" style="background:#666">Try Again</a>'}
      </div>
    </body>
    </html>
  `;
}

module.exports = router;
