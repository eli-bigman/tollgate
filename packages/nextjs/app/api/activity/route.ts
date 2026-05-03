import { NextRequest, NextResponse } from "next/server"

interface ActivityEntry {
  id: string
  mcp: string
  tool: string
  amount: string
  validated: boolean
  timestamp: number
  txHash: string
}

// Module-level in-memory log. Shared across all requests in the same Node.js process.
const log: ActivityEntry[] = []
const MAX_ENTRIES = 50

export async function GET() {
  return NextResponse.json(log.slice(0, MAX_ENTRIES))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entry: ActivityEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      mcp: typeof body.mcp === "string" ? body.mcp : "unknown",
      tool: typeof body.tool === "string" ? body.tool : "unknown",
      amount: typeof body.amount === "string" ? body.amount : "0",
      validated: body.validated === true,
      timestamp: Date.now(),
      txHash: typeof body.txHash === "string" ? body.txHash : "0x0000000000000000000000000000000000000000000000000000000000000000",
    }
    log.unshift(entry)
    if (log.length > MAX_ENTRIES) log.length = MAX_ENTRIES
    return NextResponse.json({ ok: true, id: entry.id })
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
}
