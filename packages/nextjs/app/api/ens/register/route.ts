import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ens/register
 * Body: { label, owner, records: Record<string, string> }
 *
 * Calls L2Registrar.register() via Viem on Base Sepolia.
 * Stub — implement once DURIN_L2_REGISTRAR is deployed.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
