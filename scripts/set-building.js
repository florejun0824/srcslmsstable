// scripts/set-building.js
// Note: This script runs in Node.js during the build
const { createClient } = require('@vercel/kv');

// Ensure these ENV vars are available in your Build Settings!
const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const setBuildStatus = async () => {
  try {
    await kv.set('build_status', 'building');
    console.log('✅ Set BUILD_STATUS to "building" in Vercel KV');
  } catch (error) {
    console.error('❌ Error setting build status:', error);
    // Don't fail the build just because status update failed
    process.exit(0);
  }
};

setBuildStatus();