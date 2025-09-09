// This script is run by Netlify at the START of the build.
const fetch = require('node-fetch'); // You may need to install this: npm i node-fetch

const DEPLOY_URL = process.env.URL; // Netlify provides this environment variable

async function setBuildStatus() {
  if (!DEPLOY_URL) {
    console.log("URL environment variable not found. Skipping status update.");
    return;
  }
  
  try {
    const response = await fetch(`${DEPLOY_URL}/.netlify/functions/build-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'building' }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    console.log('✅ Successfully set build status to: building');
  } catch (error) {
    console.error('❌ Failed to set build status:', error);
    // Even if this fails, we don't want to fail the build.
  }
}

setBuildStatus();