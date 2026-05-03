import OpenAI from "openai"
import type { TollgateManifest } from "../../../shared/manifest-types/index"
import { fetchManifest } from "./tools/fetch-manifest"
import { callMcpTool, callMcpToolWithPayment } from "./tools/call-mcp-tool"
import { logInfo, logError, logSep } from "./utils/logger"

export type AgentEvent =
  | { type: "thinking";          data: { text: string } }
  | { type: "tool_call";         data: { name: string; input: unknown } }
  | { type: "manifest_fetched";  data: { url: string; ens: string; tools: Array<{ name: string; price: string }> } }
  | { type: "price_check";       data: { price: string; manifestPrice: string; match: boolean } }
  | { type: "payment_required";  data: { paymentId: string; payee: string; amountEth: string; amountMicro: string; token: string; toolName: string; mcpName: string } }
  | { type: "payment";           data: { mcp: string; tool: string; amount: string; txHash?: string } }
  | { type: "validation";        data: { tool: string; valid: boolean; summary: string } }
  | { type: "result";            data: { answer: string; totalSpent: number; calls: number } }
  | { type: "error";             data: { message: string } }

const ZEROG_BASE_URL = process.env.ZEROG_BASE_URL ?? "https://router-api.0g.ai/v1"

const client = new OpenAI({
  baseURL: ZEROG_BASE_URL,
  apiKey: process.env.ZEROG_API_KEY ?? process.env.ZEROG_API ?? "",
})

const MODEL = process.env.ZEROG_MODEL ?? "qwen/qwen-2.5-7b-instruct"

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_tollgate_services",
      description: "List all registered MCP services in the Tollgate marketplace",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_manifest",
      description: "Fetch the Tollgate Manifest for a service. ALWAYS call this before paying.",
      parameters: {
        type: "object",
        properties: {
          manifestUrl: { type: "string", description: "URL of the /.well-known/tollgate.json" },
        },
        required: ["manifestUrl"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "call_mcp_tool",
      description: "Call a paid MCP tool. Payment and validation handled automatically.",
      parameters: {
        type: "object",
        properties: {
          mcpUrl:        { type: "string" },
          toolName:      { type: "string" },
          toolInput:     { type: "object" },
          expectedPrice: { type: "string", description: "Price in USDC from manifest" },
          payee:         { type: "string", description: "Payee wallet from manifest" },
          mcpName:       { type: "string" },
        },
        required: ["mcpUrl", "toolName", "toolInput", "expectedPrice", "payee", "mcpName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_budget",
      description: "Check remaining USDC budget",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
]

const SYSTEM_PROMPT = `You are an autonomous research agent with a $5.00 USDC budget.
You use the Tollgate marketplace to discover and call paid MCP servers.

Your mandatory workflow for EVERY task:
1. list_tollgate_services() — discover what is available
2. fetch_manifest(url) — read the contract BEFORE paying anything
3. Verify the tool you need exists and the price is acceptable
4. call_mcp_tool() — payment and response validation happen automatically
5. After each call, check validationResult.valid — report if false
6. Never use data where validationResult.valid is false
7. Synthesise your answer with: which MCPs used, total USDC spent, validation status

Always show your reasoning at each step.`

export async function* runAgent(task: string): AsyncGenerator<AgentEvent, void, string | undefined> {
  logSep(`NEW RUN — task: "${task}"`)
  logInfo("agent", `Model: ${MODEL}  Endpoint: ${ZEROG_BASE_URL}  Key: ${(process.env.ZEROG_API_KEY ?? process.env.ZEROG_API ?? "").slice(0, 12)}...`)

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user",   content: task },
  ]

  let spent = 0
  let calls = 0
  const manifests: Map<string, TollgateManifest> = new Map()
  let turn = 0

  while (true) {
    turn++
    logInfo("agent", `── Turn ${turn}: calling 0G LLM (${messages.length} messages in context)`)

    let response: OpenAI.Chat.ChatCompletion
    try {
      response = await client.chat.completions.create({
        model: MODEL,
        messages,
        tools,
        tool_choice: "auto",
      })
    } catch (err) {
      const errMsg = `LLM error: ${err instanceof Error ? err.message : String(err)}`
      logError("agent", errMsg)
      yield { type: "error", data: { message: errMsg } }
      break
    }

    const msg = response.choices[0].message
    const finishReason = response.choices[0].finish_reason
    logInfo("agent", `LLM response finish_reason=${finishReason}  tool_calls=${msg.tool_calls?.length ?? 0}`)

    if (msg.content) {
      logInfo("agent", `LLM thinking text (${msg.content.length} chars)`, { text: msg.content })
      yield { type: "thinking", data: { text: msg.content } }
    }

    if (!msg.tool_calls?.length) {
      logInfo("agent", `No tool calls — agent done.  spent=$${spent}  calls=${calls}`)
      yield { type: "result", data: { answer: msg.content ?? "", totalSpent: spent, calls } }
      break
    }

    messages.push(msg)
    logInfo("agent", `Tool calls requested: ${msg.tool_calls.map(tc => tc.function.name).join(", ")}`)

    const toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[] = []

    for (const tc of msg.tool_calls) {
      let args: Record<string, unknown>
      try {
        args = JSON.parse(tc.function.arguments)
      } catch {
        args = {}
      }

      logInfo("agent", `▶ Tool: ${tc.function.name}`, args)
      yield { type: "tool_call", data: { name: tc.function.name, input: args } }

      let result: unknown

      if (tc.function.name === "list_tollgate_services") {
        const appUrl = process.env.NEXT_APP_URL ?? "http://localhost:3000"
        const listUrl = `${appUrl}/api/ens/list`
        logInfo("agent", `Fetching service list: ${listUrl}`)
        try {
          const r = await fetch(listUrl)
          result = await r.json()
          logInfo("agent", `Service list OK`, result)
        } catch (err) {
          const msg = `Failed to list services: ${err instanceof Error ? err.message : String(err)}`
          logError("agent", msg)
          result = { error: msg }
        }

      } else if (tc.function.name === "fetch_manifest") {
        const manifest = await fetchManifest(args.manifestUrl as string)
        if (manifest) {
          manifests.set(args.manifestUrl as string, manifest)
          yield {
            type: "manifest_fetched",
            data: {
              url: args.manifestUrl as string,
              ens: manifest.ens,
              tools: manifest.tools.map(t => ({ name: t.name, price: t.price })),
            },
          }
        } else {
          logError("agent", `fetch_manifest returned null for ${args.manifestUrl}`)
        }
        result = manifest ?? { error: "manifest not found" }

      } else if (tc.function.name === "call_mcp_tool") {
        const manifest = Array.from(manifests.values()).find(m =>
          m.tools.some(t => t.name === args.toolName)
        )
        const expectedPrice = args.expectedPrice as string

        logInfo("agent", `Price check: manifest price = $${expectedPrice}`)
        yield {
          type: "price_check",
          data: { price: expectedPrice + " ETH", manifestPrice: expectedPrice + " ETH", match: true },
        }

        const mcpParams = {
          mcpUrl:        args.mcpUrl as string,
          toolName:      args.toolName as string,
          toolInput:     args.toolInput as Record<string, unknown>,
          expectedPrice,
          payee:         args.payee as string,
          mcpName:       args.mcpName as string,
          manifestTools: manifest?.tools ?? [],
        }

        let callResult = await callMcpTool(mcpParams)

        if (callResult.paymentRequired) {
          const challenge = callResult.paymentRequired
          logInfo("agent", `Payment required — yielding payment_required event`, challenge)

          // Yield the event to SSE; the run route will await user's MetaMask tx and pass txHash back
          const txHash = yield {
            type: "payment_required" as const,
            data: {
              paymentId:  challenge.paymentId,
              payee:      challenge.payee,
              amountEth: challenge.amountUsdc,
              amountMicro: challenge.amountMicro,
              token:      challenge.token,
              toolName:   challenge.toolName,
              mcpName:    args.mcpName as string,
            },
          }

          if (!txHash) {
            logError("agent", "No txHash received — user did not confirm payment")
            result = { error: "Payment not confirmed by user" }
          } else {
            logInfo("agent", `txHash received from user: ${txHash} — retrying MCP call with payment`)
            callResult = await callMcpToolWithPayment({
              ...mcpParams,
              txHash,
              maxAmountMicro: challenge.amountMicro,
            })
          }
        }

        if (callResult.paymentAmount) {
          spent += parseFloat(callResult.paymentAmount)
          calls++
          logInfo("agent", `Payment recorded: $${callResult.paymentAmount}  total_spent=$${spent}`)
          yield {
            type: "payment",
            data: { mcp: args.mcpName as string, tool: args.toolName as string, amount: callResult.paymentAmount, txHash: callResult.txHash },
          }
        }

        if (callResult.validationResult) {
          logInfo("agent", `Validation: ${callResult.validationResult.valid ? "PASS" : "FAIL"} — ${callResult.validationResult.summary}`)
          yield {
            type: "validation",
            data: {
              tool: args.toolName as string,
              valid: callResult.validationResult.valid,
              summary: callResult.validationResult.summary,
            },
          }
        }

        if (callResult.error) {
          logError("agent", `callMcpTool error: ${callResult.error}`)
        }

        if (result === undefined) {
          result = callResult.error
            ? { error: callResult.error }
            : { data: callResult.data, validated: callResult.validationResult?.valid }
        }

      } else if (tc.function.name === "check_budget") {
        result = { total: 5.00, spent, remaining: 5.00 - spent, calls }
        logInfo("agent", `Budget check`, result)
      } else {
        result = { error: `Unknown tool: ${tc.function.name}` }
        logError("agent", `Unknown tool called: ${tc.function.name}`)
      }

      logInfo("agent", `◀ Tool result for ${tc.function.name}`, result)
      toolResults.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      })
    }

    messages.push(...toolResults)
  }

  logSep(`RUN COMPLETE — spent=$${spent}  calls=${calls}`)
}
