// deno-lint-ignore-file
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthResult =
  | { mode: "service"; client: SupabaseClient }
  | { mode: "jwt"; client: SupabaseClient; user: User };

// ---------------------------------------------------------------------------
// Dual authentication helper
// ---------------------------------------------------------------------------

/**
 * Authenticate a request using either a service secret (for public reads from
 * the Next.js API proxy) or a user JWT (for authenticated operations).
 *
 * Returns an `AuthResult` on success, or a `Response` (401) on failure.
 */
export async function authenticate(req: Request): Promise<AuthResult | Response> {
  const serviceSecret = req.headers.get("X-Service-Secret");
  const authHeader = req.headers.get("Authorization");

  // Service-to-service auth: validate shared secret
  if (serviceSecret) {
    const expected = Deno.env.get("EDGE_SERVICE_SECRET");
    if (!expected || serviceSecret !== expected) {
      return new Response(JSON.stringify({ error: "Invalid service secret" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    return { mode: "service", client };
  }

  // JWT auth: validate user token
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing authorization header" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return { mode: "jwt", client, user };
}
