// This script is run by Netlify at the END of a successful build.
const fetch = require('node-fetch'); // You may need to install this: npm i node-fetch

const DEPLOY_URL = process.env.URL;

async function setReadyStatus() {
  if (!DEPLOY_URL) {
    console.log("URL environment variable not found. Skipping status update.");
    return;
  }

  try {
    const response = await fetch(`${DEPLOY_URL}/.netlify/functions/build-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ready' }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    console.log('✅ Successfully set build status to: ready');
  } catch (error) {
    console.error('❌ Failed to set ready status:', error);
  }
}

setReadyStatus();