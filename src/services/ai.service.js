/**
 * Freedom Protocol - AI Service
 * Wrapper around Claude for medical draft interpretation
 */

const anthropicService = require('./anthropic.service');
const BaseError = require('../errors/baseError');

/**
 * Generate draft interpretation
 */
const generateInterpretation = async ({ type, file_url }) => {
  try {

    const prompt = `
You are a clinical assistant.

Analyze the following ${type} upload.

Provide:
- Key findings
- Possible concerns
- Simple explanation
- Suggestions for doctor review

File URL:
${file_url}
`;

    const response = await anthropicService.generate(prompt);

    return response;

  } catch (err) {
    console.error(err);
    throw new BaseError(
      'AI generation failed',
      500,
      'AI_ERROR'
    );
  }
};

module.exports = {
  generateInterpretation
};
