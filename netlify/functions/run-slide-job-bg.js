// netlify/functions/run-slide-job-bg.js
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// =======================================================================
// --- THIS IS THE NEW INITIALIZATION BLOCK ---
// =======================================================================
try {
  if (!getApps().length) {
    // Reconstruct the service account from the smaller env variables
    const firebaseConfig = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      // This line replaces the literal '\n' strings with actual newlines
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };

    initializeApp({
      credential: cert(firebaseConfig)
    });
  }
} catch (e) {
  console.error("Firebase Admin SDK setup error:", e.message);
}
// =======================================================================

const db = getFirestore();

// --- Internal Gemini API Caller (Unchanged) ---
async function callGeminiApiForSlides(prompt) {
  const API_KEY = process.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY is not configured on server.");
  }
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    safetySettings: [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    }
  };

  const response = await fetch(`${API_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini API call failed: ${response.status}`, errorText);
    throw new Error(`Gemini API failed: ${response.status}. ${errorText}`);
  }

  const data = await response.json();
  const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textPart) {
    const finishReason = data.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY') {
      throw new Error("Response blocked for safety.");
    }
    throw new Error("Invalid response from Gemini (no text part).");
  }
  
  return textPart;
}

// --- Netlify Background Function Handler (Unchanged) ---
exports.handler = async (event) => {
  // (Rest of the function is identical to before)
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { jobId, prompt } = JSON.parse(event.body);
  const jobRef = db.collection('slide_jobs').doc(jobId);

  try {
    console.log(`[Job: ${jobId}] Starting slide generation.`);
    
    const jsonString = await callGeminiApiForSlides(prompt);
    const slideData = JSON.parse(jsonString);

    await jobRef.update({
      status: 'completed',
      result: slideData,
      finishedAt: new Date().toISOString(),
    });

    console.log(`[Job: ${jobId}] Completed successfully.`);
    return { statusCode: 200 };

  } catch (error) {
    console.error(`[Job: ${jobId}] Failed:`, error);
    
    await jobRef.update({
      status: 'failed',
      error: error.message,
      finishedAt: new Date().toISOString(),
    });

    return { statusCode: 500 };
  }
};