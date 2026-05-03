import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/activity
 *
 * Returns the recent payment activity log (last N tool calls with validation status and tx hashes).
 * Polled every 2s by the ActivityFeed component on the Agent Demo page.
 * Stub — implement once payment tracking is in place.
 */
export async function GET(_req: NextRequest) {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
