import { extractJson, tryParseJson } from './jsonUtils';

/**
 * Calls the AI service to generate a ULP section from the given description.
 * Extracts JSON safely, sanitizes, and parses it.
 */
export const generateUlpSection = async (aiService, description, signal) => {
  try {
    const prompt = `
      Create a JSON object for a lesson plan section based on this description:
      "${description}"
      Ensure the format is:
      {
        "sectionTitle": "string",
        "objectives": ["string"],
        "activities": ["string"],
        "assessment": "string"
      }
    `;

    const aiResponse = await aiService(prompt, { signal });

    // Extract JSON from AI response
    const jsonContent = extractJson(aiResponse) || aiResponse;

    // Parse with recovery
    return tryParseJson(jsonContent);
  } catch (error) {
    console.error("Error generating ULP section:", error);
    throw error;
  }
};
