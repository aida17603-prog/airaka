export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Test API + D1 connection
    if (url.pathname === "/api/test") {
      try {
        const result = await env.DB
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
          .all();

        return Response.json({
          success: true,
          message: "AIRAKA API and D1 are connected",
          tables: result.results,
        });
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: "Database connection failed",
          },
          { status: 500 }
        );
      }
    }

    // Other API routes
    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        { error: "API route not found" },
        { status: 404 }
      );
    }

    // Serve AIRAKA website
    return env.ASSETS.fetch(request);
  },
};
