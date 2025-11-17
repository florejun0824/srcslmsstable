// netlify/functions/start-slide-job.js
const { v4: uuidv4 } = require('uuid');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// --- CORS Headers ---
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

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

// --- Netlify Function Handler ---
exports.handler = async (event) => {
  // (Rest of the function is identical to before)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: 'Method Not Allowed' };
  }

  try {
    const { prompt, userId } = JSON.parse(event.body);
    if (!prompt) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Missing prompt.' }) };
    }

    const jobId = uuidv4(); 
    const jobRef = db.collection('slide_jobs').doc(jobId);

    await jobRef.set({
      jobId: jobId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      userId: userId || null, 
    });

    const backgroundFunctionUrl = `${event.headers.origin}/.netlify/functions/run-slide-job-bg`;
    
    fetch(backgroundFunctionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: jobId, prompt: prompt }),
    });

    return {
      statusCode: 202, 
      headers: CORS_HEADERS,
      body: JSON.stringify({ jobId: jobId }),
    };

  } catch (error) {
    console.error("Error starting slide job:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Failed to start job.' })
    };
  }
};