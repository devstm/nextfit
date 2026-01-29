#!/usr/bin/env bash
#
# Curl requests for the trainer-profile Edge Function (local dev).
#
# Prerequisites:
#   npx supabase start
#   npx supabase db reset
#   npx supabase functions serve trainer-profile --no-verify-jwt
#
# Usage:
#   bash scripts/trainer-profile-requests.sh

set -e

API="http://127.0.0.1:54321"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
FUNC_URL="$API/functions/v1/trainer-profile"

EMAIL="trainer-test@example.com"
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
# Step 3: Create a trainer profile
# -------------------------------------------------------
echo "=== CREATE Profile (POST) ==="
curl -s -X POST "$FUNC_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "John Trainer",
    "bio": "Certified personal trainer specializing in weight loss and strength training.",
    "phone": "+1234567890",
    "specializations": ["weight_loss", "strength_training", "rehabilitation"],
    "certifications": [
      {"name": "NASM-CPT", "issuer": "NASM", "year": 2022},
      {"name": "ACE-CPT", "issuer": "ACE", "year": 2020}
    ],
    "experience_years": 5,
    "city": "New York",
    "country": "US",
    "hourly_rate": 75.00,
    "currency": "USD",
    "is_available": true,
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
    "display_name": "John Updated",
    "hourly_rate": 90.00,
    "specializations": ["weight_loss", "strength_training", "rehabilitation", "yoga"]
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
