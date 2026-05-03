import { NextRequest } from "next/server"
import fs from "fs"
import path from "path"
import type { AgentEvent } from "@tollgate/agent/agent"
import { waitForPayment } from "../payment-store"

export const runtime = "nodejs"
export const maxDuration = 120

// Same log file as the agent pipeline (process.cwd() = packages/nextjs/ when Next.js runs)
const LOG_PATH = path.join(process.cwd(), "agent-pipeline.log")

function routeLog(msg: string, extra?: unknown): void {
  const line = `[${new Date().toISOString()}] INFO  [sse-route] ${msg}${extra !== undefined ? "\n" + JSON.stringify(extra, null, 2) : ""}\n`
  try { fs.appendFileSync(LOG_PATH, line, "utf8") } catch { /* ignore */ }
  process.stdout.write(line)
}

async function getRunAgent() {
  const { runAgent } = await import("@tollgate/agent/agent")
  return runAgent
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const task: string = typeof body.task === "string" ? body.task.trim() : ""

  routeLog(`Incoming POST /api/agent/run`, { task, ip: req.headers.get("x-forwarded-for") ?? "local" })

  if (!task) {
    routeLog("Rejected — empty task")
    return new Response(JSON.stringify({ error: "Missing task" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const encoder = new TextEncoder()
  let eventCount = 0

  function sseChunk(event: AgentEvent): Uint8Array {
    eventCount++
    routeLog(`SSE #${eventCount} → type=${event.type}`)
    return encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
  }

  const stream = new ReadableStream({
    async start(controller) {
      routeLog("Stream opened — starting agent")
      try {
        const runAgent = await getRunAgent()
        const gen = runAgent(task)
        let next = await gen.next()

        while (!next.done) {
          const event = next.value as AgentEvent
          controller.enqueue(sseChunk(event))

          if (event.type === "payment_required") {
            routeLog(`Awaiting user MetaMask payment — paymentId=${event.data.paymentId}`)
            let txHash: string | undefined
            try {
              txHash = await waitForPayment(event.data.paymentId, 120_000)
              routeLog(`Payment received from user — txHash=${txHash}`)
            } catch (err) {
              routeLog(`Payment timed out: ${err instanceof Error ? err.message : String(err)}`)
            }
            next = await gen.next(txHash)
          } else {
            next = await gen.next()
          }
        }

        routeLog(`Stream finished normally — ${eventCount} events sent`)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        routeLog(`Stream error`, { message })
        const errorEvent: AgentEvent = { type: "error", data: { message } }
        controller.enqueue(sseChunk(errorEvent))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
