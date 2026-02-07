require("dotenv").config();

module.exports = {
  app: {
    baseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
  },

  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || "sk_test_dummy",
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || "pk_test_dummy",
  },

  jwt: {
    secret: process.env.JWT_SECRET || "dev_secret",
    expiresIn: "7d",
  },
};
