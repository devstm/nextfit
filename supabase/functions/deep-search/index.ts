// deno-lint-ignore-file
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";
import { parseSearchIntent } from "../_shared/deep-search/intent-parser.ts";
import { scoreTrainers } from "../_shared/deep-search/scoring-engine.ts";
import type { TrainerForScoring } from "../_shared/deep-search/types.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only GET allowed
  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Auth — same pattern as trainer-profile
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Parse query params
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";
    const page = Math.max(
      1,
      parseInt(url.searchParams.get("page") || "1", 10),
    );
    const perPage = Math.min(
      50,
      Math.max(1, parseInt(url.searchParams.get("per_page") || "12", 10)),
    );

    // Step 1: Parse intent from free-text query
    const intent = parseSearchIntent(query);

    // Step 2: Fetch trainers from DB with basic pre-filtering
    let dbQuery = supabase
      .from("trainer_profiles")
      .select("*")
      .eq("is_available", true);

    // Pre-filter by maxRate at DB level to reduce data transfer
    if (intent.maxRate !== null) {
      dbQuery = dbQuery.lte("hourly_rate", intent.maxRate);
    }

    const { data: trainers, error: dbError } = await dbQuery;
    if (dbError) {
      return jsonResponse({ error: dbError.message }, 500);
    }

    // Step 3: Score and sort
    const scored = scoreTrainers(intent, (trainers || []) as TrainerForScoring[]);

    // Step 4: Paginate
    const total = scored.length;
    const from = (page - 1) * perPage;
    const paginated = scored.slice(from, from + perPage);

    return jsonResponse({
      data: paginated.map((s) => ({
        ...s.trainer,
        _score: s.score,
        _breakdown: s.breakdown,
      })),
      intent,
      count: total,
      page,
      per_page: perPage,
    });
  } catch (err) {
    console.error("Deep search error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
