import { createClient } from '@vercel/kv';

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
    // Exit gracefully so we don't crash the build if KV fails
    process.exit(0);
  }
};

setBuildStatus();