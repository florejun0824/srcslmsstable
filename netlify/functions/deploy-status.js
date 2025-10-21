import fetch from "node-fetch";

export async function handler(event, context) {
  try {
    const { NETLIFY_SITE_ID, NETLIFY_AUTH_TOKEN } = process.env;

    if (!NETLIFY_SITE_ID || !NETLIFY_AUTH_TOKEN) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing Netlify API credentials" }),
      };
    }

    // Call Netlify API for latest deploy
    const response = await fetch(
      `https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/deploys`,
      {
        headers: {
          Authorization: `Bearer ${NETLIFY_AUTH_TOKEN}`,
        },
      }
    );

    const deploys = await response.json();
    const latestDeploy = deploys[0]; // most recent deploy

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: latestDeploy.state, // e.g. "building", "ready", "error"
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
