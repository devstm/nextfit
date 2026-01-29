// deno-lint-ignore-file
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

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

const VALID_FITNESS_LEVELS = ["beginner", "intermediate", "advanced"];

function validateUserInput(
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

  // date_of_birth (ISO 8601 date string: YYYY-MM-DD)
  if (b.date_of_birth !== undefined) {
    if (b.date_of_birth === null) {
      out.date_of_birth = null;
    } else {
      if (typeof b.date_of_birth !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.date_of_birth)) {
        throw new ValidationError("date_of_birth must be a date string in YYYY-MM-DD format");
      }
      const d = new Date(b.date_of_birth);
      if (isNaN(d.getTime())) {
        throw new ValidationError("date_of_birth is not a valid date");
      }
      out.date_of_birth = b.date_of_birth;
    }
  }

  // gender
  if (b.gender !== undefined) {
    if (b.gender === null) {
      out.gender = null;
    } else if (typeof b.gender !== "string") {
      throw new ValidationError("gender must be a string");
    } else {
      out.gender = b.gender;
    }
  }

  // bio
  if (b.bio !== undefined) {
    if (typeof b.bio !== "string") {
      throw new ValidationError("bio must be a string");
    }
    out.bio = b.bio;
  }

  // height_cm
  if (b.height_cm !== undefined) {
    if (b.height_cm === null) {
      out.height_cm = null;
    } else {
      if (typeof b.height_cm !== "number" || b.height_cm <= 0) {
        throw new ValidationError("height_cm must be a positive number");
      }
      out.height_cm = b.height_cm;
    }
  }

  // weight_kg
  if (b.weight_kg !== undefined) {
    if (b.weight_kg === null) {
      out.weight_kg = null;
    } else {
      if (typeof b.weight_kg !== "number" || b.weight_kg <= 0) {
        throw new ValidationError("weight_kg must be a positive number");
      }
      out.weight_kg = b.weight_kg;
    }
  }

  // fitness_level
  if (b.fitness_level !== undefined) {
    if (b.fitness_level === null) {
      out.fitness_level = null;
    } else {
      if (typeof b.fitness_level !== "string" || !VALID_FITNESS_LEVELS.includes(b.fitness_level)) {
        throw new ValidationError(
          `fitness_level must be one of: ${VALID_FITNESS_LEVELS.join(", ")}`,
        );
      }
      out.fitness_level = b.fitness_level;
    }
  }

  // fitness_goals
  if (b.fitness_goals !== undefined) {
    if (
      !Array.isArray(b.fitness_goals) ||
      !b.fitness_goals.every((s: unknown) => typeof s === "string")
    ) {
      throw new ValidationError("fitness_goals must be an array of strings");
    }
    out.fitness_goals = b.fitness_goals;
  }

  // health_conditions
  if (b.health_conditions !== undefined) {
    if (
      !Array.isArray(b.health_conditions) ||
      !b.health_conditions.every((s: unknown) => typeof s === "string")
    ) {
      throw new ValidationError("health_conditions must be an array of strings");
    }
    out.health_conditions = b.health_conditions;
  }

  // preferred_training_style
  if (b.preferred_training_style !== undefined) {
    if (
      !Array.isArray(b.preferred_training_style) ||
      !b.preferred_training_style.every((s: unknown) => typeof s === "string")
    ) {
      throw new ValidationError("preferred_training_style must be an array of strings");
    }
    out.preferred_training_style = b.preferred_training_style;
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

  return out;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleGet(
  supabase: SupabaseClient,
  req: Request,
  user: User,
): Promise<Response> {
  const url = new URL(req.url);
  const profileId = url.searchParams.get("id");

  if (profileId) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (error) {
      return jsonResponse({ error: "Profile not found" }, 404);
    }
    return jsonResponse({ data });
  }

  // No id param — return the caller's own profile
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    return jsonResponse({ error: "Profile not found" }, 404);
  }
  return jsonResponse({ data });
}

async function handlePost(
  supabase: SupabaseClient,
  req: Request,
  user: User,
): Promise<Response> {
  const body = await req.json();
  const validated = validateUserInput(body, false);

  // Force user_id to the authenticated user
  validated.user_id = user.id;

  const { data, error } = await supabase
    .from("user_profiles")
    .insert(validated)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonResponse(
        { error: "A user profile already exists for this user" },
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
  const validated = validateUserInput(body, true);

  // Strip protected fields
  delete validated.user_id;
  delete validated.id;
  delete validated.created_at;

  if (Object.keys(validated).length === 0) {
    return jsonResponse({ error: "No valid fields to update" }, 400);
  }

  const { data, error } = await supabase
    .from("user_profiles")
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
    .from("user_profiles")
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
    // Auth
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

    // Route by method
    switch (req.method) {
      case "GET":
        return await handleGet(supabase, req, user);
      case "POST":
        return await handlePost(supabase, req, user);
      case "PUT":
        return await handlePut(supabase, req, user);
      case "DELETE":
        return await handleDelete(supabase, req, user);
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
