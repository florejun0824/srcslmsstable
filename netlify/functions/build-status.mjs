export default async (req, context) => {
  const status = process.env.BUILD_STATUS || 'ready';

  // The 'startTime' is no longer available with this method,
  // so we won't return it. The UI will just show a static countdown.
  const statusData = {
    status: status,
  };

  return Response.json(statusData, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
};