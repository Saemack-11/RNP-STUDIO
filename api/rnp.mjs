export default function handler(request, response) {
  response.status(200).json({
    ok: true,
    route: "/api/rnp",
    status: "RNP serverless function is online",
    method: request.method,
    keyConfigured: Boolean(process.env.OPENAI_API_KEY)
  });
}