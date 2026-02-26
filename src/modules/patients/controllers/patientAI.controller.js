const pool = require('../../../db');
const OpenAI = require('openai');

let openai = null;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * ======================================
 * METABOLIC INTELLIGENCE ENGINE
 * ======================================
 */
exports.chatWithAI = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    /**
     * 1️⃣ Get patient
     */
    const patientResult = await pool.query(
      `SELECT id FROM patients WHERE user_id = $1`,
      [userId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const patientId = patientResult.rows[0].id;

    /**
     * 2️⃣ Save patient message (ROLE MUST MATCH DB CONSTRAINT)
     * DB role allowed values: 'patient', 'assistant'
     */
    await pool.query(
      `
      INSERT INTO patient_ai_messages (patient_id, role, message)
      VALUES ($1, 'patient', $2)
      `,
      [patientId, message]
    );

    /**
     * 3️⃣ Get protocol context
     */
    const protocolResult = await pool.query(
      `
      SELECT pt.name, pp.started_at
      FROM patient_protocols pp
      JOIN protocol_phases pt ON pt.id = pp.current_phase_id
      WHERE pp.patient_id = $1
      `,
      [patientId]
    );

    const protocol = protocolResult.rows[0];
    const phaseName = protocol?.name || "Unknown Phase";

    const dayNumber = protocol
      ? Math.floor(
          (new Date() - new Date(protocol.started_at)) /
            (1000 * 60 * 60 * 24)
        ) + 1
      : 0;

    /**
     * 4️⃣ Get recent glucose readings
     */
    const glucoseResult = await pool.query(
      `
      SELECT value, context
      FROM glucose_readings
      WHERE patient_id = $1
      ORDER BY reading_time DESC
      LIMIT 7
      `,
      [patientId]
    );

    const glucoseHistory = glucoseResult.rows;

    /**
     * 5️⃣ Get recent weight logs
     */
    const weightResult = await pool.query(
      `
      SELECT weight
      FROM weight_logs
      WHERE patient_id = $1
      ORDER BY recorded_at DESC
      LIMIT 3
      `,
      [patientId]
    );

    const weightHistory = weightResult.rows;

    /**
     * 6️⃣ Get last 6 chat messages (memory)
     */
    const historyResult = await pool.query(
      `
      SELECT role, message
      FROM patient_ai_messages
      WHERE patient_id = $1
      ORDER BY created_at DESC
      LIMIT 6
      `,
      [patientId]
    );

    const conversationHistory = historyResult.rows.reverse();

    let aiMessage = null;

    /**
     * 7️⃣ Try OpenAI
     */
    if (openai) {
      try {
        const systemPrompt = `
You are the official Metabolic Intelligence Engine for the Freedom Protocol.

STRICT RULES:
- Be direct.
- Encourage disciplined behavior.
- No generic health advice.
- No medical diagnosis.
- Focus on metabolic restoration.
- Reinforce eating window control.
- Reinforce carbohydrate discipline.
- Speak with authority and clarity.

Current Phase: ${phaseName}
Day: ${dayNumber}

Recent Glucose Readings:
${glucoseHistory.map(g => `- ${g.value} (${g.context})`).join('\n')}

Recent Weight Entries:
${weightHistory.map(w => `- ${w.weight} kg`).join('\n')}
`;

        const messages = [
          { role: "system", content: systemPrompt },
          ...conversationHistory.map(m => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.message,
          })),
          { role: "user", content: message },
        ];

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
        });

        if (
          response &&
          response.choices &&
          response.choices.length > 0 &&
          response.choices[0].message
        ) {
          aiMessage = response.choices[0].message.content;
        }

      } catch (error) {
        console.error("OpenAI failed:", error.message);
      }
    }

    /**
     * 8️⃣ Fallback engine if OpenAI fails
     */
    if (!aiMessage) {
      aiMessage = `
You are in ${phaseName}, Day ${dayNumber}.

Metabolic improvement comes from:
• Controlled eating window
• Carbohydrate discipline
• Quality sleep
• Stress regulation

Do not react emotionally to single readings.
Focus on consistent execution.

Discipline creates metabolic restoration.
`;
    }

    /**
     * 9️⃣ Save assistant response
     */
    await pool.query(
      `
      INSERT INTO patient_ai_messages (patient_id, role, message)
      VALUES ($1, 'assistant', $2)
      `,
      [patientId, aiMessage]
    );

    return res.json({
      success: true,
      response: aiMessage,
    });

  } catch (error) {
    console.error("AI Chat Error:", error);
    return res.status(500).json({
      success: false,
      message: "AI response failed",
    });
  }
};