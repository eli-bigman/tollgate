import { NextRequest, NextResponse } from "next/server"
import { REGISTRAR_ADDRESS, REGISTRAR_ABI, walletClient } from "../_ens-utils"

/**
 * POST /api/ens/register
 * Body: {
 *   label: string,           // e.g. "crypto"
 *   owner?: string,          // defaults to DEPLOYER_WALLET_ADDRESS
 *   records: {
 *     url: string,           // MCP server base URL
 *     manifest: string,      // /.well-known/tollgate.json URL
 *     type?: string,         // "mcp" | "api"
 *     payee?: string,        // 0x... wallet
 *     description?: string,
 *     category?: string,
 *     version?: string,
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const label = typeof body.label === "string" ? body.label.trim().toLowerCase() : ""
  if (!label) return NextResponse.json({ error: "Missing label" }, { status: 400 })

  const records = (body.records ?? {}) as Record<string, string>
  if (!records.url) return NextResponse.json({ error: "Missing records.url" }, { status: 400 })

  const owner = (typeof body.owner === "string" ? body.owner : process.env.DEPLOYER_WALLET_ADDRESS) as `0x${string}`
  if (!owner) return NextResponse.json({ error: "No owner — set DEPLOYER_WALLET_ADDRESS" }, { status: 400 })

  const manifestUrl = records.manifest ?? `${records.url}/.well-known/tollgate.json`

  const keys = [
    "tollgate:url",
    "tollgate:manifest",
    "tollgate:type",
    "tollgate:payee",
    "tollgate:description",
    "tollgate:category",
    "tollgate:version",
  ]
  const values = [
    records.url,
    manifestUrl,
    records.type ?? "mcp",
    records.payee ?? process.env.DEPLOYER_WALLET_ADDRESS ?? "",
    records.description ?? "",
    records.category ?? "other",
    records.version ?? "1.0",
  ]

  try {
    const { client, account } = walletClient()
    const hash = await client.writeContract({
      address: REGISTRAR_ADDRESS,
      abi: REGISTRAR_ABI,
      functionName: "register",
      args: [label, owner, keys, values],
      account,
    })

    return NextResponse.json({
      success: true,
      label,
      subname: `${label}.${process.env.NEXT_PUBLIC_PARENT_ENS ?? "tollgate.eth"}`,
      txHash: hash,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
