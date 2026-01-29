#!/usr/bin/env bash
#
# Curl requests for the user-profile Edge Function (local dev).
#
# Prerequisites:
#   npx supabase start
#   npx supabase db reset
#   npx supabase functions serve --no-verify-jwt
#
# Usage:
#   bash scripts/user-profile-requests.sh

set -e

API="http://127.0.0.1:54321"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
FUNC_URL="$API/functions/v1/user-profile"

EMAIL="user-test@example.com"
PASSWORD="testpassword123"

# -------------------------------------------------------
# Step 1: Sign up (skip if user already exists)
# -------------------------------------------------------
echo "=== Sign Up ==="
curl -s -X POST "$API/auth/v1/signup" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}" | head -c 200
echo -e "\n"

# -------------------------------------------------------
# Step 2: Sign in and extract the access token
# -------------------------------------------------------
echo "=== Sign In ==="
SIGN_IN_RESPONSE=$(curl -s -X POST "$API/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo "$SIGN_IN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get access token. Response:"
  echo "$SIGN_IN_RESPONSE"
  exit 1
fi
echo "Got token: ${TOKEN:0:20}..."
echo ""

# -------------------------------------------------------
# Step 3: Create a user profile
# -------------------------------------------------------
echo "=== CREATE Profile (POST) ==="
curl -s -X POST "$FUNC_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Jane Seeker",
    "phone": "+1987654321",
    "date_of_birth": "1990-05-15",
    "gender": "female",
    "bio": "Looking for a trainer to help me get back in shape after a long break.",
    "height_cm": 165.0,
    "weight_kg": 68.5,
    "fitness_level": "beginner",
    "fitness_goals": ["weight_loss", "flexibility", "stress_relief"],
    "health_conditions": ["lower_back_pain"],
    "preferred_training_style": ["one_on_one", "online"],
    "city": "New York",
    "country": "US",
    "location": {"lat": 40.7128, "lng": -74.0060}
  }' | python3 -m json.tool
echo ""

# -------------------------------------------------------
# Step 4: Get own profile
# -------------------------------------------------------
echo "=== GET Own Profile ==="
curl -s -X GET "$FUNC_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "apikey: $ANON_KEY" | python3 -m json.tool
echo ""

# -------------------------------------------------------
# Step 5: Update profile
# -------------------------------------------------------
echo "=== UPDATE Profile (PUT) ==="
curl -s -X PUT "$FUNC_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Jane Updated",
    "fitness_level": "intermediate",
    "weight_kg": 65.0,
    "fitness_goals": ["weight_loss", "flexibility", "stress_relief", "muscle_tone"]
  }' | python3 -m json.tool
echo ""

# -------------------------------------------------------
# Step 6: Verify the update
# -------------------------------------------------------
echo "=== GET Profile (verify update) ==="
curl -s -X GET "$FUNC_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "apikey: $ANON_KEY" | python3 -m json.tool
echo ""

echo "=== Done. Profile is kept in the database. ==="
