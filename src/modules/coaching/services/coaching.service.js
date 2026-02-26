/**
 * Freedom Protocol Coaching Engine
 * Tone: Balanced motivational
 * Gentle correction
 * Mentions specific numbers
 * No medical advice
 */

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

function analyzeGlucose(glucose) {
  if (glucose === null) return null;

  if (glucose < 4.0) return "low";
  if (glucose >= 4.0 && glucose <= 6.0) return "optimal";
  if (glucose > 6.0 && glucose <= 8.0) return "elevated";

  return "high";
}

function generateMessage({
  phaseName,
  dayNumber,
  glucose,
  previousGlucose,
  weight
}) {
  // Ensure numeric safety
  const currentGlucose = toNumber(glucose);
  const previous = toNumber(previousGlucose);
  const currentWeight = toNumber(weight);

  const glucoseStatus = analyzeGlucose(currentGlucose);

  let trendMessage = "";

  if (previous !== null && currentGlucose !== null) {
    if (currentGlucose > previous) {
      trendMessage = `Your glucose increased from ${previous.toFixed(
        1
      )} to ${currentGlucose.toFixed(1)} mmol/L. `;
    } else if (currentGlucose < previous) {
      trendMessage = `Your glucose improved from ${previous.toFixed(
        1
      )} to ${currentGlucose.toFixed(1)} mmol/L. `;
    } else {
      trendMessage = `Your glucose remains stable at ${currentGlucose.toFixed(
        1
      )} mmol/L. `;
    }
  } else if (currentGlucose !== null) {
    trendMessage = `Today's glucose reading is ${currentGlucose.toFixed(
      1
    )} mmol/L. `;
  }

  let performanceMessage = "";

  switch (glucoseStatus) {
    case "optimal":
      performanceMessage =
        "This is within optimal metabolic range. Stay disciplined. Your consistency is building metabolic freedom.";
      break;

    case "elevated":
      performanceMessage =
        "This is slightly above optimal range. Reflect on your eating window and carbohydrate discipline yesterday. Small corrections today will restore momentum.";
      break;

    case "high":
      performanceMessage =
        "This level indicates metabolic stress. Do not panic. Review yesterday’s intake, eliminate processed carbohydrates today, and reinforce your structured eating window.";
      break;

    case "low":
      performanceMessage =
        "This level is lower than expected. Ensure your nutrition is adequate and balanced. Monitor how you feel.";
      break;

    default:
      performanceMessage =
        "Stay consistent with your structured nutrition and discipline.";
  }

  const closing =
    "Remember: you are not managing disease. You are restoring metabolic function through disciplined daily action.";

  return `Phase: ${phaseName} | Day ${dayNumber}

${trendMessage}
${performanceMessage}

Weight today: ${currentWeight !== null ? currentWeight + " kg." : "Not recorded."}

${closing}

(This coaching is educational and not medical advice.)`;
}

module.exports = {
  generateMessage,
};