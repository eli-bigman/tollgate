import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/ens/resolve?name=crypto.tollgate.eth
 *
 * Reads all tollgate: text records from the L2 Registry for a given subname.
 * Stub — implement once DURIN_L2_REGISTRY is deployed.
 */
export async function GET(_req: NextRequest) {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
