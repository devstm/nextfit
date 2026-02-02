const ALLOWED_ORIGINS = [
  Deno.env.get("EDGE_ALLOWED_ORIGIN") || "",  // e.g. https://your-app.vercel.app
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean);

export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const requestOrigin = origin || "";
  const isAllowed = ALLOWED_ORIGINS.some((allowed) => requestOrigin === allowed);

  return {
    "Access-Control-Allow-Origin": isAllowed ? requestOrigin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, x-service-secret, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

// Backward-compatible static headers for internal/service calls
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, x-service-secret, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};
