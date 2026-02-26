// src/services/providers/local.provider.js

async function generateCompletion({ prompt }) {
  // Placeholder for future local LLM server integration

  return {
    rawContent: "Local model response placeholder.",
    model: "local-llm",
    tokensUsed: 0
  };
}

module.exports = {
  generateCompletion
};