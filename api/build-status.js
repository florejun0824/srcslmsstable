// api/build-status.js
import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge', 
};

export default async function handler(req) {
  try {
    // Fetch the status from Vercel KV
    // Default to 'ready' if the key doesn't exist
    const currentStatus = await kv.get('build_status') || 'ready';

    return new Response(
      JSON.stringify({ status: currentStatus }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0', // Important: Never cache this
        },
      }
    );
  } catch (error) {
    console.error("KV Error:", error);
    // Fallback to ready so the app doesn't break
    return new Response(JSON.stringify({ status: 'ready' }), { status: 200 });
  }
}