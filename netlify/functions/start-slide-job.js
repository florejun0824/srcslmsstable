// netlify/functions/start-slide-job.js

// We'll use uuid to create a unique ID for each job
const { v4: uuidv4 } = require('uuid');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// --- CORS Headers (Copied from your other functions) ---
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// --- Initialize Firebase Admin (Same as the -bg file) ---
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }
} catch (e) {
  console.error("Firebase Admin SDK setup error. Make sure FIREBASE_ADMIN_SDK is set in Netlify.", e.message);
}

const db = getFirestore();

// --- Netlify Function Handler ---
exports.handler = async (event) => {
  // Handle CORS preflight request
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

    const jobId = uuidv4(); // Create a unique job ID
    const jobRef = db.collection('slide_jobs').doc(jobId);

    // 1. Create a "pending" job document in Firestore
    // This is what our app will listen to
    await jobRef.set({
      jobId: jobId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      userId: userId || null, // Good to store who started it
    });

    // 2. Trigger the background function (fire and forget)
    // We get the site's URL from the 'origin' header
    // e.g., https://yoursite.netlify.app
    // This triggers the `run-slide-job-bg` function we made first.
    const backgroundFunctionUrl = `${event.headers.origin}/.netlify/functions/run-slide-job-bg`;
    
    fetch(backgroundFunctionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: jobId, prompt: prompt }),
    });

    // 3. Immediately return the Job ID to the app
    // The app will now use this ID to listen for the result
    return {
      statusCode: 202, // 202 "Accepted"
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