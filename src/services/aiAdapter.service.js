// src/services/aiAdapter.service.js

const openaiProvider = require("./providers/openai.provider");
const localProvider = require("./providers/local.provider");
const federatedProvider = require("./providers/federated.provider");

const PROVIDERS = {
  openai: openaiProvider,
  local: localProvider,
  federated: federatedProvider
};

function getProvider() {
  const providerKey = process.env.AI_PROVIDER || "openai";

  if (!PROVIDERS[providerKey]) {
    throw {
      type: "AI_ERROR",
      code: "INVALID_PROVIDER",
      provider: providerKey
    };
  }

  return PROVIDERS[providerKey];
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => {
        reject({
          type: "AI_ERROR",
          code: "PROVIDER_TIMEOUT"
        });
      }, timeoutMs)
    )
  ]);
}

async function generateCompletion({ prompt, metadata = {} }) {
  const provider = getProvider();
  const region = process.env.AI_REGION || "global";
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 15000;
  const maxRetries = Number(process.env.AI_MAX_RETRIES) || 1;

  let attempt = 0;
  const startTime = Date.now();

  while (attempt <= maxRetries) {
    try {
      const response = await withTimeout(
        provider.generateCompletion({ prompt, metadata }),
        timeoutMs
      );

      const latency = Date.now() - startTime;

      if (!response || !response.rawContent) {
        throw {
          type: "AI_ERROR",
          code: "INVALID_RESPONSE"
        };
      }

      return {
        content: response.rawContent,
        model: response.model || "unknown",
        tokens_used: response.tokensUsed || 0,
        provider: process.env.AI_PROVIDER || "openai",
        region,
        latency_ms: latency
      };

    } catch (error) {
      attempt++;

      if (attempt > maxRetries) {
        throw {
          type: "AI_ERROR",
          code: error.code || "PROVIDER_FAILURE",
          provider: process.env.AI_PROVIDER,
          region
        };
      }
    }
  }
}

module.exports = {
  generateCompletion
};