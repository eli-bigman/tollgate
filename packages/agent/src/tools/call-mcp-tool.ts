import { randomUUID } from "crypto"
import type { ManifestTool, ValidationResult } from "../../../../shared/manifest-types/index"
import { validateResponse } from "../utils/validate-response"
import { logInfo, logWarn, logError } from "../utils/logger"

const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"

export interface CallMcpPaymentChallenge {
  paymentId: string
  payee: string
  amountMicro: string
  amountUsdc: string
  token: string
  toolName: string
}

interface CallMcpToolParams {
  mcpUrl: string
  toolName: string
  toolInput: Record<string, unknown>
  expectedPrice: string
  payee: string
  mcpName: string
  manifestTools: ManifestTool[]
}

interface CallMcpToolResult {
  data?: unknown
  validationResult?: ValidationResult
  paymentAmount?: string
  txHash?: string
  error?: string
  paymentRequired?: CallMcpPaymentChallenge
}

function normalizeMcpUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  return `https://${url}`
}

function buildPaymentHeader(maxAmountMicro: string, toolName: string, txSignature: string): string {
  const payerAddress =
    process.env.KEEPERHUB_WALLET_ID ??
    process.env.AGENT_ADDRESS ??
    "0x0000000000000000000000000000000000000001"
  const payload = {
    paymentAmount: maxAmountMicro, // Pass as string to preserve Wei precision
    payerAddress,
    txSignature,
    toolName,
  }
  return Buffer.from(JSON.stringify(payload)).toString("base64")
}

async function mcpCall(
  baseUrl: string,
  toolName: string,
  toolInput: Record<string, unknown>,
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  const body = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: { name: toolName, arguments: toolInput },
    id: Date.now(),
  }
  const endpoint = `${baseUrl}/mcp`
  const withPayment = Object.keys(extraHeaders).length > 0

  logInfo("mcp-http", `POST ${endpoint} [${withPayment ? "WITH payment header" : "no payment header"}]`, {
    tool: toolName,
    input: toolInput,
  })

  return fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })
}

export async function callMcpTool(params: CallMcpToolParams): Promise<CallMcpToolResult> {
  const { mcpUrl, toolName, toolInput, expectedPrice, mcpName, manifestTools } = params
  const baseUrl = normalizeMcpUrl(mcpUrl)

  logInfo("mcp-tool", `▶ callMcpTool start`, {
    mcpUrl: baseUrl,
    toolName,
    toolInput,
    expectedPrice,
    mcpName,
  })

  // First call — expects 402 if payment not yet provided
  const res = await mcpCall(baseUrl, toolName, toolInput)
  logInfo("mcp-http", `First call → HTTP ${res.status} (content-type: ${res.headers.get("content-type") ?? "none"})`)

  if (res.status === 402) {
    let challenge: {
      accepts?: Array<{ maxAmountRequired: string; asset?: string; payTo?: string }>
      error?: string
    }
    try {
      challenge = await res.json()
    } catch (err) {
      logError("mcp-tool", `402 body not JSON: ${err instanceof Error ? err.message : String(err)}`)
      return { error: "402 body not parseable" }
    }

    logInfo("mcp-tool", `402 challenge received`, challenge)

    const accept = challenge.accepts?.[0]
    const maxMicro = accept?.maxAmountRequired ?? "0"
    const actualUsdc = Number(maxMicro) / 1e6

    logInfo("mcp-tool", `Price check: manifest=$${expectedPrice}  402 asks=${actualUsdc} USDC  limit=${(parseFloat(expectedPrice) * 1.05).toFixed(6)}`)

    if (actualUsdc > parseFloat(expectedPrice) * 1.05) {
      logWarn("mcp-tool", `price_mismatch — aborting`, { declared: expectedPrice, charged: actualUsdc })
      return {
        error: "price_mismatch",
        data: { declared: expectedPrice, charged: actualUsdc.toString() },
      }
    }

    // Return payment challenge — user pays via MetaMask in the browser
    const paymentId = randomUUID()
    const payee = accept?.payTo ?? params.payee
    const token = accept?.asset ?? USDC_BASE_SEPOLIA

    logInfo("mcp-tool", `402 received — returning payment challenge for user`, {
      paymentId, payee, amountMicro: maxMicro, amountUsdc: actualUsdc.toFixed(6), token,
    })

    return {
      paymentRequired: {
        paymentId,
        payee,
        amountMicro: maxMicro,
        amountUsdc: actualUsdc.toFixed(6), // Reused the same property for simplicity on frontend
        token,
        toolName,
      },
    }
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => "(unreadable)")
    logError("mcp-tool", `Non-OK response after payment`, { status: res.status, body: errBody })
    return { error: `MCP call failed: ${res.status} ${res.statusText}` }
  }

  // Handle both JSON and SSE responses from Streamable HTTP transport
  const contentType = res.headers.get("content-type") ?? ""
  let rpcResult: unknown

  if (contentType.includes("text/event-stream")) {
    const text = await res.text()
    logInfo("mcp-http", `SSE raw response (${text.length} chars)`, { preview: text.slice(0, 400) })
    const dataLine = text.split("\n").find(l => l.startsWith("data: "))
    if (!dataLine) {
      logError("mcp-tool", "SSE response had no data: line")
      return { error: "Empty SSE response" }
    }
    rpcResult = JSON.parse(dataLine.slice(6))
  } else {
    const raw = await res.text()
    logInfo("mcp-http", `JSON raw response (${raw.length} chars)`, { preview: raw.slice(0, 400) })
    try {
      rpcResult = JSON.parse(raw)
    } catch {
      logError("mcp-tool", "Response body is not valid JSON", { raw: raw.slice(0, 200) })
      return { error: "Non-JSON MCP response" }
    }
  }

  const rpc = rpcResult as { result?: { content?: Array<{ text?: string }> }; error?: unknown }

  if (rpc.error) {
    logError("mcp-tool", "JSON-RPC error in response", rpc.error)
    return { error: JSON.stringify(rpc.error) }
  }

  const textContent = rpc.result?.content?.[0]?.text
  if (!textContent) {
    logError("mcp-tool", "No text content in MCP result", rpc.result)
    return { error: "No text content in MCP response" }
  }

  let data: unknown
  try {
    data = JSON.parse(textContent)
    logInfo("mcp-tool", `Tool result parsed OK`, data)
  } catch {
    data = textContent
    logWarn("mcp-tool", `Tool result is plain text (not JSON)`, { textContent })
  }

  const validationResult = validateResponse(toolName, data, manifestTools)
  logInfo("mcp-tool", `Validation: ${validationResult.valid ? "PASS" : "FAIL"} — ${validationResult.summary}`)

  // Post activity event (fire-and-forget)
  const appUrl = process.env.NEXT_APP_URL ?? "http://localhost:3000"
  fetch(`${appUrl}/api/activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mcp: mcpName,
      tool: toolName,
      amount: expectedPrice,
      validated: validationResult.valid,
      txHash: "0x0000000000000000000000000000000000000000000000000000000000000000"
    }),
  }).catch(() => { /* best-effort */ })

  return { data, validationResult, paymentAmount: expectedPrice }
}

export async function callMcpToolWithPayment(
  params: CallMcpToolParams & { txHash: string; maxAmountMicro: string }
): Promise<CallMcpToolResult> {
  const { mcpUrl, toolName, toolInput, expectedPrice, mcpName, manifestTools, txHash, maxAmountMicro } = params
  const baseUrl = normalizeMcpUrl(mcpUrl)

  logInfo("mcp-tool", `▶ callMcpToolWithPayment — retrying with confirmed txHash=${txHash}`)

  const paymentHeader = buildPaymentHeader(maxAmountMicro, toolName, txHash)
  const res = await mcpCall(baseUrl, toolName, toolInput, { "x-payment": paymentHeader })
  logInfo("mcp-http", `Retry (with payment) → HTTP ${res.status}`)

  if (!res.ok) {
    const errBody = await res.text().catch(() => "(unreadable)")
    logError("mcp-tool", `Non-OK response after payment`, { status: res.status, body: errBody })
    return { error: `MCP call failed: ${res.status} ${res.statusText}` }
  }

  const contentType = res.headers.get("content-type") ?? ""
  let rpcResult: unknown

  if (contentType.includes("text/event-stream")) {
    const text = await res.text()
    const dataLine = text.split("\n").find(l => l.startsWith("data: "))
    if (!dataLine) return { error: "Empty SSE response" }
    rpcResult = JSON.parse(dataLine.slice(6))
  } else {
    const raw = await res.text()
    try {
      rpcResult = JSON.parse(raw)
    } catch {
      return { error: "Non-JSON MCP response" }
    }
  }

  const rpc = rpcResult as { result?: { content?: Array<{ text?: string }> }; error?: unknown }
  if (rpc.error) return { error: JSON.stringify(rpc.error) }

  const textContent = rpc.result?.content?.[0]?.text
  if (!textContent) return { error: "No text content in MCP response" }

  let data: unknown
  try {
    data = JSON.parse(textContent)
    logInfo("mcp-tool", `Tool result parsed OK`, data)
  } catch {
    data = textContent
  }

  const validationResult = validateResponse(toolName, data, manifestTools)
  logInfo("mcp-tool", `Validation: ${validationResult.valid ? "PASS" : "FAIL"} — ${validationResult.summary}`)

  const appUrl = process.env.NEXT_APP_URL ?? "http://localhost:3000"
  fetch(`${appUrl}/api/activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mcp: mcpName, tool: toolName, amount: expectedPrice, validated: validationResult.valid, txHash }),
  }).catch(() => { /* best-effort */ })

  return { data, validationResult, paymentAmount: expectedPrice, txHash }
}
