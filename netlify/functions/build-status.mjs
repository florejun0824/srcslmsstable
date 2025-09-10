import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  // 'build_status_store' matches the name in netlify.toml
  const store = getStore("build_status_store");
  // Get the value of the 'current_status' key, defaulting to 'ready' if it doesn't exist
  const status = await store.get("current_status") || "ready";

  const statusData = {
    status: status,
  };

  return Response.json(statusData, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
};