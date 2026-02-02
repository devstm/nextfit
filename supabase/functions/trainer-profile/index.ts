// deno-lint-ignore-file
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticate, type AuthResult } from "../_shared/auth.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

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
// Validation
// ---------------------------------------------------------------------------

function validateTrainerInput(
  body: unknown,
  partial = false,
): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  const b = body as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  // display_name — required on create, optional on update
  if (b.display_name !== undefined) {
    if (typeof b.display_name !== "string" || b.display_name.trim().length === 0) {
      throw new ValidationError("display_name must be a non-empty string");
    }
    if (b.display_name.length > 100) {
      throw new ValidationError("display_name must be 100 characters or less");
    }
    out.display_name = b.display_name.trim();
  } else if (!partial) {
    throw new ValidationError("display_name is required");
  }

  // bio
  if (b.bio !== undefined) {
    if (typeof b.bio !== "string") {
      throw new ValidationError("bio must be a string");
    }
    out.bio = b.bio;
  }

  // avatar_url
  if (b.avatar_url !== undefined) {
    if (typeof b.avatar_url !== "string") {
      throw new ValidationError("avatar_url must be a string");
    }
    out.avatar_url = b.avatar_url;
  }

  // phone
  if (b.phone !== undefined) {
    if (typeof b.phone !== "string") {
      throw new ValidationError("phone must be a string");
    }
    out.phone = b.phone;
  }

  // specializations
  if (b.specializations !== undefined) {
    if (
      !Array.isArray(b.specializations) ||
      !b.specializations.every((s: unknown) => typeof s === "string")
    ) {
      throw new ValidationError("specializations must be an array of strings");
    }
    out.specializations = b.specializations;
  }

  // certifications (jsonb — array of objects)
  if (b.certifications !== undefined) {
    if (!Array.isArray(b.certifications)) {
      throw new ValidationError("certifications must be an array");
    }
    out.certifications = b.certifications;
  }

  // experience_years
  if (b.experience_years !== undefined) {
    if (
      typeof b.experience_years !== "number" ||
      !Number.isInteger(b.experience_years) ||
      b.experience_years < 0
    ) {
      throw new ValidationError(
        "experience_years must be a non-negative integer",
      );
    }
    out.experience_years = b.experience_years;
  }

  // location — accepts { lat, lng }, converts to WKT for PostGIS
  if (b.location !== undefined) {
    if (b.location === null) {
      out.location = null;
    } else {
      const loc = b.location as Record<string, unknown>;
      if (typeof loc.lat !== "number" || typeof loc.lng !== "number") {
        throw new ValidationError("location must have numeric lat and lng");
      }
      if (loc.lat < -90 || loc.lat > 90) {
        throw new ValidationError("lat must be between -90 and 90");
      }
      if (loc.lng < -180 || loc.lng > 180) {
        throw new ValidationError("lng must be between -180 and 180");
      }
      // PostGIS expects POINT(longitude latitude)
      out.location = `POINT(${loc.lng} ${loc.lat})`;
    }
  }

  // city
  if (b.city !== undefined) {
    if (typeof b.city !== "string") {
      throw new ValidationError("city must be a string");
    }
    out.city = b.city;
  }

  // country
  if (b.country !== undefined) {
    if (typeof b.country !== "string") {
      throw new ValidationError("country must be a string");
    }
    out.country = b.country;
  }

  // hourly_rate
  if (b.hourly_rate !== undefined) {
    if (typeof b.hourly_rate !== "number" || b.hourly_rate < 0) {
      throw new ValidationError("hourly_rate must be a non-negative number");
    }
    out.hourly_rate = b.hourly_rate;
  }

  // currency
  if (b.currency !== undefined) {
    if (typeof b.currency !== "string" || b.currency.length !== 3) {
      throw new ValidationError("currency must be a 3-letter ISO code");
    }
    out.currency = b.currency.toUpperCase();
  }

  // is_available
  if (b.is_available !== undefined) {
    if (typeof b.is_available !== "boolean") {
      throw new ValidationError("is_available must be a boolean");
    }
    out.is_available = b.is_available;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleGetById(
  supabase: SupabaseClient,
  profileId: string,
): Promise<Response> {
  const { data, error } = await supabase
    .from("trainer_profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (error) {
    return jsonResponse({ error: "Profile not found" }, 404);
  }
  return jsonResponse({ data });
}

async function handleGetOwn(
  supabase: SupabaseClient,
  user: User,
): Promise<Response> {
  const { data, error } = await supabase
    .from("trainer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    return jsonResponse({ error: "Profile not found" }, 404);
  }
  return jsonResponse({ data });
}

async function handleList(
  supabase: SupabaseClient,
  url: URL,
): Promise<Response> {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const perPage = Math.min(50, Math.max(1, parseInt(url.searchParams.get("per_page") || "12", 10)));
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("trainer_profiles")
    .select("*", { count: "exact" });

  // Search by display_name
  const search = url.searchParams.get("search");
  if (search) {
    query = query.ilike("display_name", `%${search}%`);
  }

  // Filter by specialization (array contains)
  const specialization = url.searchParams.get("specialization");
  if (specialization) {
    query = query.contains("specializations", [specialization]);
  }

  // Filter by city
  const city = url.searchParams.get("city");
  if (city) {
    query = query.ilike("city", `%${city}%`);
  }

  // Filter by country
  const country = url.searchParams.get("country");
  if (country) {
    query = query.ilike("country", `%${country}%`);
  }

  // Filter by hourly_rate range
  const minRate = url.searchParams.get("min_rate");
  if (minRate) {
    query = query.gte("hourly_rate", parseFloat(minRate));
  }
  const maxRate = url.searchParams.get("max_rate");
  if (maxRate) {
    query = query.lte("hourly_rate", parseFloat(maxRate));
  }

  // Filter by experience_years range
  const minExp = url.searchParams.get("min_experience");
  if (minExp) {
    query = query.gte("experience_years", parseInt(minExp, 10));
  }
  const maxExp = url.searchParams.get("max_experience");
  if (maxExp) {
    query = query.lte("experience_years", parseInt(maxExp, 10));
  }

  // Filter by availability (default: show only available)
  const available = url.searchParams.get("available");
  if (available !== "false") {
    query = query.eq("is_available", true);
  }

  // Pagination and ordering
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  return jsonResponse({
    data: data || [],
    count: count || 0,
    page,
    per_page: perPage,
  });
}

async function handlePost(
  supabase: SupabaseClient,
  req: Request,
  user: User,
): Promise<Response> {
  const body = await req.json();
  const validated = validateTrainerInput(body, false);

  // Force user_id to the authenticated user
  validated.user_id = user.id;

  const { data, error } = await supabase
    .from("trainer_profiles")
    .insert(validated)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonResponse(
        { error: "A trainer profile already exists for this user" },
        409,
      );
    }
    return jsonResponse({ error: error.message }, 400);
  }

  return jsonResponse({ data }, 201);
}

async function handlePut(
  supabase: SupabaseClient,
  req: Request,
  user: User,
): Promise<Response> {
  const body = await req.json();
  const validated = validateTrainerInput(body, true);

  // Strip protected fields
  delete validated.user_id;
  delete validated.is_verified;
  delete validated.id;
  delete validated.created_at;

  if (Object.keys(validated).length === 0) {
    return jsonResponse({ error: "No valid fields to update" }, 400);
  }

  const { data, error } = await supabase
    .from("trainer_profiles")
    .update(validated)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  return jsonResponse({ data });
}

async function handleDelete(
  supabase: SupabaseClient,
  _req: Request,
  user: User,
): Promise<Response> {
  const { data, error } = await supabase
    .from("trainer_profiles")
    .delete()
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return jsonResponse({ error: "Profile not found" }, 404);
  }

  return jsonResponse({ data });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // For GET requests that are public (list or single profile by id),
    // allow both service-secret and JWT auth.
    // For all other operations, require JWT.
    if (req.method === "GET") {
      const url = new URL(req.url);
      const profileId = url.searchParams.get("id");
      const isList = url.searchParams.get("list") === "true";

      if (isList || profileId) {
        // Public GET — accept service secret OR JWT
        const authResult = await authenticate(req);
        if (authResult instanceof Response) return authResult;
        return isList
          ? await handleList(authResult.client, url)
          : await handleGetById(authResult.client, profileId!);
      }

      // GET own profile — requires JWT
      const authResult = await authenticateJwt(req);
      if (authResult instanceof Response) return authResult;
      return await handleGetOwn(authResult.client, authResult.user);
    }

    // POST / PUT / DELETE — require JWT
    const authResult = await authenticateJwt(req);
    if (authResult instanceof Response) return authResult;

    switch (req.method) {
      case "POST":
        return await handlePost(authResult.client, req, authResult.user);
      case "PUT":
        return await handlePut(authResult.client, req, authResult.user);
      case "DELETE":
        return await handleDelete(authResult.client, req, authResult.user);
      default:
        return jsonResponse({ error: "Method not allowed" }, 405);
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      return jsonResponse({ error: err.message }, 400);
    }
    console.error("Unhandled error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

// ---------------------------------------------------------------------------
// JWT-only auth (for write operations and own-profile reads)
// ---------------------------------------------------------------------------

async function authenticateJwt(
  req: Request,
): Promise<{ client: SupabaseClient; user: User } | Response> {
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

  return { client: supabase, user };
}
