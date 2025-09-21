// netlify/functions/build-status.js

export async function handler() {
  try {
    const { NETLIFY_SITE_ID, NETLIFY_AUTH_TOKEN } = process.env;

    // If credentials are missing, return "unknown" instead of crashing
    if (!NETLIFY_SITE_ID || !NETLIFY_AUTH_TOKEN) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: "unknown",
          message: "Missing Netlify API credentials (NETLIFY_SITE_ID or NETLIFY_AUTH_TOKEN).",
        }),
      };
    }

    // Call Netlify API for latest deploys
    const response = await fetch(
      `https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/deploys`,
      {
        headers: {
          Authorization: `Bearer ${NETLIFY_AUTH_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "Failed to fetch deploys from Netlify API",
        }),
      };
    }

    const deploys = await response.json();
    const latestDeploy = deploys[0];

    // Respond with latest deploy status
    return {
      statusCode: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
      body: JSON.stringify({
        status: latestDeploy.state, // "building", "ready", "error", etc.
        deployId: latestDeploy.id,
        createdAt: latestDeploy.created_at,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
