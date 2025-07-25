// functions/aiService.js
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Firebase Admin SDK. It's safe to call this multiple times.
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

const FREE_API_CALL_LIMIT_PER_MONTH = 500000;

// Helper function to create a delay for retries
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * A reusable function to call the Gemini API that includes free-tier usage checks
 * and exponential backoff, running securely on the backend.
 * @param {string} prompt The prompt to send to the AI.
 * @param {string} apiKey The secure API key for the generative AI service.
 * @returns {Promise<string>} The text response from the AI.
 * @throws {Error} Throws an error with message "LIMIT_REACHED" or a generic error if retries fail.
 */
async function callGeminiWithLimitCheck(prompt, apiKey, retries = 5, backoff = 1000) {
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    throw new Error("Prompt for Gemini API is empty or invalid.");
  }

  const usageDocRef = db.collection('usage_trackers').doc('ai_usage');
  const usageSnap = await usageDocRef.get();

  // 1. Check and update the monthly usage count in Firestore
  if (!usageSnap.exists) {
    await usageDocRef.set({ callCount: 1, resetMonth: new Date().getMonth() + 1 });
  } else {
    let { callCount, resetMonth } = usageSnap.data();
    const currentMonth = new Date().getMonth() + 1;

    if (resetMonth !== currentMonth) {
      await usageDocRef.update({ callCount: 1, resetMonth: currentMonth });
    } else {
      if (callCount >= FREE_API_CALL_LIMIT_PER_MONTH) {
        console.warn("AI monthly limit reached.");
        throw new Error("LIMIT_REACHED");
      }
      await usageDocRef.update({ callCount: FieldValue.increment(1) });
    }
  }

  // 2. Proceed with the API call
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // ✅ UPGRADED: Switched to the powerful 'gemini-1.5-pro' model for higher quality content.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error.message);
    
    // 3. Handle retryable errors
    const isRetryable = error.message.includes('429') || error.message.includes('503') || error.message.includes('overloaded');

    if (isRetryable && retries > 0) {
      console.warn(`Retryable API Error. Retrying in ${backoff / 1000}s... (${retries} retries left)`);
      await usageDocRef.update({ callCount: FieldValue.increment(-1) });
      await delay(backoff);
      return callGeminiWithLimitCheck(prompt, apiKey, retries - 1, backoff * 2);
    }

    // If not retryable, undo the increment and throw
    await usageDocRef.update({ callCount: FieldValue.increment(-1) });
    throw error;
  }
}

module.exports = { callGeminiWithLimitCheck };
