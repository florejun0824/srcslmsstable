// This function acts as the central controller for the build status.
// - The live client app sends GET requests to read the status.
// - The Netlify build process sends POST requests to update the status.

export default async (req, context) => {
  // 'build_status_store' is the KV store we defined in netlify.toml
  const store = context.netlify.kvStore("build_status_store");

  // Handle POST requests from the Netlify build hooks
  if (req.method === "POST") {
    try {
      const { status } = await req.json(); // Expecting { "status": "building" | "ready" }

      if (status === "building") {
        // When the build starts, set status and record the timestamp
        await store.setJSON("status_data", {
          status: "building",
          startTime: Date.now(),
        });
        return new Response("Build status set to 'building'.", { status: 200 });
      } else if (status === "ready") {
        // When the build finishes, update the status
        await store.setJSON("status_data", { status: "ready" });
        return new Response("Build status set to 'ready'.", { status: 200 });
      } else {
        return new Response("Invalid status provided.", { status: 400 });
      }
    } catch (error) {
      return new Response(`Error updating status: ${error.message}`, { status: 500 });
    }
  }

  // Handle GET requests from the client-side UpdateOverlay
  if (req.method === "GET") {
    try {
      let statusData = await store.get("status_data", { type: "json" });

      // If no status is set yet, default to 'ready'
      if (!statusData) {
        statusData = { status: "ready" };
      }

      // Return the status data as JSON
      return Response.json(statusData, {
        headers: {
          // Prevent caching of the status response
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } catch (error) {
      // Return a default ready status if there's an error reading the store
      return Response.json({ status: "ready", error: error.message });
    }
  }

  // Handle other methods
  return new Response("Method Not Allowed", { status: 405 });
};