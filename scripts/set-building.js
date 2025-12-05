import { createClient } from '@vercel/kv';

const setBuildStatus = async () => {
  // 1. Safety Check: Do the variables exist?
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.warn("⚠️ KV_REST_API_URL not found. Skipping maintenance mode flag.");
    console.warn("   (Did you link Vercel KV to your project in the Storage tab?)");
    // Exit successfully (0) so we don't crash the build
    process.exit(0);
  }

  try {
    const kv = createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    await kv.set('build_status', 'building');
    console.log('✅ Set BUILD_STATUS to "building" in Vercel KV');
  } catch (error) {
    console.error('❌ Warning: Failed to set build status:', error.message);
    // Exit successfully (0) so we don't crash the build
    process.exit(0);
  }
};

setBuildStatus();