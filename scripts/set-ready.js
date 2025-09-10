const fetch = require('node-fetch');

const SITE_ID = '{e80d52cd-4f0a-47d9-b762-6c2a007cab53}'; // <-- PASTE YOUR SITE ID HERE
const TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const url = `https://api.netlify.com/api/v1/sites/${SITE_ID}`;

const updateEnvVar = async () => {
  if (!TOKEN) {
    console.error('NETLIFY_AUTH_TOKEN not found.');
    return;
  }
  try {
    await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        build_settings: {
          env: { BUILD_STATUS: 'ready' },
        },
      }),
    });
    console.log('✅ Set BUILD_STATUS to ready');
  } catch (error) {
    console.error('Error setting build status:', error);
  }
};

updateEnvVar();