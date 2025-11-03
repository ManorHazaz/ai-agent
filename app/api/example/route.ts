import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.API_KEY;

  return NextResponse.json({
    message: "Environment variables demo",
    hasApiKey: !!apiKey,
    note: "Server-only env vars (API_KEY, DATABASE_URL) are never exposed to the client",
  });
}
