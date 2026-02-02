import { NextRequest, NextResponse } from "next/server";

const EDGE_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/trainer-profile`;
const SERVICE_SECRET = process.env.EDGE_SERVICE_SECRET;

export async function GET(request: NextRequest) {
  if (!SERVICE_SECRET) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    const response = await fetch(`${EDGE_FUNCTION_URL}?${queryString}`, {
      method: "GET",
      headers: {
        "X-Service-Secret": SERVICE_SECRET,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch trainers" },
      { status: 500 },
    );
  }
}
