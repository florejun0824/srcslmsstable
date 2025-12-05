import { createClient } from '@vercel/kv';

const setReadyStatus = async () => {
  // 1. Safety Check
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.warn("⚠️ KV_REST_API_URL not found. Skipping maintenance mode flag.");
    process.exit(0);
  }

  try {
    const kv = createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    await kv.set('build_status', 'ready');
    console.log('✅ Set BUILD_STATUS to "ready" in Vercel KV');
  } catch (error) {
    console.error('❌ Warning: Failed to set ready status:', error.message);
    process.exit(0);
  }
};

setReadyStatus();