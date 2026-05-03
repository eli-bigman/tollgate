import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/agent/run
 * Body: { task: string }
 *
 * Starts the autonomous Tollgate agent for the given task and returns a Server-Sent Events stream.
 * Each SSE event is a JSON AgentEvent (thinking, manifest_fetch, price_check, payment, validation, result).
 * Stub — implement once ANTHROPIC_API_KEY and MCP server URLs are configured.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
