export function GET(request) {
  return Response.json(
    {
      ok: true,
      route: "/api/rnp",
      status: "RNP serverless function is online",
      method: request.method,
      keyConfigured: Boolean(process.env.OPENAI_API_KEY)
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

export function POST() {
  return Response.json(
    {
      ok: false,
      error: "The RNP model connection is not installed yet."
    },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}