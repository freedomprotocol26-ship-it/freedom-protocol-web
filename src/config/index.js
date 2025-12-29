/**
 * Configuration Module
 * 
 * This file loads all environment variables and exports them
 * in a structured way. Always import config from here, not
 * directly from process.env.
 */

require('dotenv').config();

const config = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // WhatsApp Cloud API
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN,
    apiVersion: 'v17.0',
    get apiUrl() {
      return `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
    }
  },
  
  // Anthropic (Claude)
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-20250514',
    maxTokens: 500  // Keep responses short for WhatsApp
  },
  
  // Paystack
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY,
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET // Optional, for extra verification
  },
  
  // Database
  database: {
    url: process.env.DATABASE_URL
  },
  
  // App Settings
  app: {
    onboardingUrl: process.env.ONBOARDING_URL || 'https://freedom-protocol.com/join',
    baseUrl: process.env.BASE_URL || 'https://freedom-protocol.com'
  }
};

// Validate required config on startup
function validateConfig() {
  const required = [
    ['WHATSAPP_ACCESS_TOKEN', config.whatsapp.accessToken],
    ['WHATSAPP_PHONE_NUMBER_ID', config.whatsapp.phoneNumberId],
    ['ANTHROPIC_API_KEY', config.anthropic.apiKey],
    ['DATABASE_URL', config.database.url]
  ];
  
  const missing = required.filter(([name, value]) => !value);
  
  if (missing.length > 0 && config.nodeEnv === 'production') {
    console.error('Missing required environment variables:');
    missing.forEach(([name]) => console.error(`  - ${name}`));
    process.exit(1);
  }
  
  if (missing.length > 0) {
    console.warn('⚠️  Warning: Some environment variables are missing.');
    console.warn('   This is OK for development, but fix before production.');
  }
}

validateConfig();

module.exports = config;
