// scripts/set-ready.js
const { createClient } = require('@vercel/kv');

const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const setReadyStatus = async () => {
  try {
    await kv.set('build_status', 'ready');
    console.log('✅ Set BUILD_STATUS to "ready" in Vercel KV');
  } catch (error) {
    console.error('❌ Error setting ready status:', error);
  }
};

setReadyStatus();