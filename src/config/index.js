require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  
  // Authentication
  jwtSecret: process.env.JWT_SECRET,
  
  // AI
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  
  // WhatsApp (optional - not needed for core functionality)
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'freedom-protocol-verify'
  },
  
  // Payment (optional)
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || ''
};
