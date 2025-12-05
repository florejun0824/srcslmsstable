// api/build-status.js
export const config = {
  runtime: 'edge', // Runs instantly on the edge
};

export default async function handler(req) {
  // Option A: Automatic "Ready" (Vercel deployments are atomic, so it's always ready)
  // Option B: Manual Maintenance Mode via Environment Variable
  
  const isMaintenance = process.env.VITE_MAINTENANCE_MODE === 'true';

  return new Response(
    JSON.stringify({ 
      status: isMaintenance ? 'building' : 'ready' 
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0', // Never cache this status
      },
    }
  );
}