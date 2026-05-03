import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/ens/list
 *
 * Reads all SubnameRegistered events from the L2 Registry and returns service summaries.
 * Stub — implement once DURIN_L2_REGISTRY is deployed.
 */
export async function GET(_req: NextRequest) {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
