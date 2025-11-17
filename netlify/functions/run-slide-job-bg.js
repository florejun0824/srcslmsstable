// netlify/functions/run-slide-job-bg.js

// We need to import the admin SDK
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// --- Initialize Firebase Admin ---
// This safely initializes the admin app, reading from the
// FIREBASE_ADMIN_SDK environment variable you'll set in Netlify
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }
} catch (e) {
  // This will log an error during build if the SDK isn't set,
  // but we'll allow the function to deploy.
  console.error("Firebase Admin SDK setup error. Make sure FIREBASE_ADMIN_SDK is set in Netlify.", e.message);
}

// Get the Firestore database instance
const db = getFirestore();

/**
 * This is the internal function that calls the Gemini API.
 * It's copied from your gemini-primary.js logic
 * but modified for JSON mode, which is required for slides.
 */
async function callGeminiApiForSlides(prompt) {
  // Use the same primary API key as your gemini-primary.js function
  const API_KEY = process.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY is not configured on server.");
  }

  // Use the same model and endpoint
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    safetySettings: [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
    generationConfig: {
      // This is the critical part for generating slide JSON
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
  
  // Return the raw JSON string
  return textPart;
}

// --- Netlify Background Function Handler ---
exports.handler = async (event) => {
  // This function is not called by a browser, so we just check POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { jobId, prompt } = JSON.parse(event.body);
  const jobRef = db.collection('slide_jobs').doc(jobId);

  try {
    console.log(`[Job: ${jobId}] Starting slide generation.`);
    
    // 1. This is the long-running call. It can take up to 15 minutes.
    const jsonString = await callGeminiApiForSlides(prompt);
    
    // 2. Parse the JSON response text from Gemini
    const slideData = JSON.parse(jsonString);

    // 3. Save the successful result to Firestore
    await jobRef.update({
      status: 'completed',
      result: slideData, // This is the slide JSON
      finishedAt: new Date().toISOString(),
    });

    console.log(`[Job: ${jobId}] Completed successfully.`);
    return { statusCode: 200 };

  } catch (error) {
    console.error(`[Job: ${jobId}] Failed:`, error);
    
    // 4. Save the error to Firestore
    // We use .update() here on the assumption the doc was created
    // by the trigger function (which we'll make next).
    await jobRef.update({
      status: 'failed',
      error: error.message,
      finishedAt: new Date().toISOString(),
    });

    return { statusCode: 500 }; // It failed, but the job is "done"
  }
};