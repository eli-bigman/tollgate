import { NextRequest, NextResponse } from "next/server"
import { resolvePayment } from "../payment-store"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { paymentId?: string; txHash?: string }
  const { paymentId, txHash } = body

  if (!paymentId || !txHash) {
    return NextResponse.json({ error: "Missing paymentId or txHash" }, { status: 400 })
  }

  const resolved = resolvePayment(paymentId, txHash)
  if (!resolved) {
    return NextResponse.json({ error: "Unknown or expired paymentId" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
