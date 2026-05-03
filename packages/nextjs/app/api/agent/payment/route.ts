import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { resolvePayment } from "../payment-store"

const LOG_PATH = path.join(process.cwd(), "agent-pipeline.log")
function routeLog(msg: string, extra?: unknown): void {
  const line = `[${new Date().toISOString()}] INFO  [payment-route] ${msg}${extra !== undefined ? "\n" + JSON.stringify(extra, null, 2) : ""}\n`
  try { fs.appendFileSync(LOG_PATH, line, "utf8") } catch { /* ignore */ }
  process.stdout.write(line)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { paymentId?: string; txHash?: string }
  const { paymentId, txHash } = body

  routeLog("Incoming /api/agent/payment POST", { paymentId, txHash })

  if (!paymentId || !txHash) {
    routeLog("Bad request — missing paymentId or txHash", body)
    return NextResponse.json({ error: "Missing paymentId or txHash" }, { status: 400 })
  }

  const resolved = resolvePayment(paymentId, txHash)
  if (!resolved) {
    routeLog("Resolve failed — unknown or expired paymentId", { paymentId })
    return NextResponse.json({ error: "Unknown or expired paymentId" }, { status: 404 })
  }

  routeLog("Payment resolved — forwarded to agent", { paymentId, txHash })
  return NextResponse.json({ ok: true })
}
