// src/services/providers/openai.provider.js

const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateCompletion({ prompt }) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a clinical AI assistant." },
      { role: "user", content: prompt }
    ],
    temperature: 0.2
  });

  return {
    rawContent: response.choices[0].message.content,
    model: response.model,
    tokensUsed: response.usage?.total_tokens || 0
  };
}

module.exports = {
  generateCompletion
};