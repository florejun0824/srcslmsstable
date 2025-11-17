// netlify/functions/run-slide-job-bg.js
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// =======================================================================
// --- THIS IS THE NEW DEFENSIVE INITIALIZATION BLOCK ---
// =======================================================================
let db;
try {
  if (!getApps().length) {
    
    // 1. CHECK IF VARIABLES EXIST
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId) {
      throw new Error("FIREBASE_PROJECT_ID environment variable is not set.");
    }
    if (!clientEmail) {
      throw new Error("FIREBASE_CLIENT_EMAIL environment variable is not set.");
    }
    if (!privateKey) {
      throw new Error("FIREBASE_PRIVATE_KEY environment variable is not set.");
    }

    // 2. RECONSTRUCT THE CONFIG
    const firebaseConfig = {
      project_id: projectId,
      client_email: clientEmail,
      // This line replaces the literal '\n' strings with actual newlines
      private_key: privateKey.replace(/\\n/g, '\n'),
    };

    // 3. INITIALIZE APP
    initializeApp({
      credential: cert(firebaseConfig)
    });

    console.log("Firebase Admin SDK initialized successfully.");
  }
  
  db = getFirestore(); // Assign db only if init is successful

} catch (e) {
  // This will now catch the error and log it clearly
  console.error("CRITICAL: Firebase Admin SDK setup error:", e.message);
  // We throw again so the function fails hard, but *after* logging
  throw e; 
}
// =======================================================================

// --- Internal Gemini API Caller (Unchanged) ---
async function callGeminiApiForSlides(prompt) {
  const API_KEY = process.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY is not configured on server.");
  }
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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

// --- Netlify Background Function Handler ---
exports.handler = async (event) => {
  // NEW: Check if db was initialized.
  if (!db) {
      console.error("Firestore (db) is not initialized. Function cannot proceed.");
      return { statusCode: 500, body: "Firestore not initialized." };
  }
    
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