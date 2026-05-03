import { NextResponse } from "next/server"
import { namehash, encodePacked, keccak256 } from "viem"
import { publicClient, REGISTRY_ADDRESS, REGISTRY_ABI, SUBNAME_REGISTERED_EVENT } from "../_ens-utils"

export const dynamic = "force-dynamic"

function labelToNode(label: string, parentNode: `0x${string}`): `0x${string}` {
  const labelHash = keccak256(encodePacked(["string"], [label]))
  return keccak256(encodePacked(["bytes32", "bytes32"], [parentNode, labelHash]))
}

async function readTextRecord(node: `0x${string}`, key: string): Promise<string> {
  try {
    const client = publicClient()
    return await client.readContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "text",
      args: [node, key],
    }) as string
  } catch {
    return ""
  }
}

export async function GET() {
  // Try to read from on-chain L2 Registry first
  if (REGISTRY_ADDRESS) {
    try {
      const client = publicClient()
      const parentENS = process.env.NEXT_PUBLIC_PARENT_ENS ?? "tollgate.eth"
      const parentNode = namehash(parentENS)
      const fromBlock = BigInt(process.env.REGISTRY_DEPLOY_BLOCK ?? "0")

      const logs = await client.getLogs({
        address: REGISTRY_ADDRESS,
        event: SUBNAME_REGISTERED_EVENT,
        fromBlock,
      })

      if (logs.length > 0) {
        const services = await Promise.all(
          logs.map(async (log) => {
            const label = log.args.label as string
            const node = labelToNode(label, parentNode)

            const [url, manifest, type, payee, description, category] = await Promise.all([
              readTextRecord(node, "tollgate:url"),
              readTextRecord(node, "tollgate:manifest"),
              readTextRecord(node, "tollgate:type"),
              readTextRecord(node, "tollgate:payee"),
              readTextRecord(node, "tollgate:description"),
              readTextRecord(node, "tollgate:category"),
            ])

            if (!url) return null

            return {
              ens: `${label}.${parentENS}`,
              url,
              manifestUrl: manifest || `${url}/.well-known/tollgate.json`,
              type: type || "mcp",
              description,
              category,
              payee,
            }
          })
        )

        const valid = services.filter(Boolean)
        if (valid.length > 0) return NextResponse.json(valid)
      }
    } catch {
      // Fall through to env-var fallback
    }
  }

  // Fallback: build list from env vars (for local dev before any on-chain registrations)
  function normalizeUrl(raw: string | undefined): string {
    if (!raw) return ""
    const url = raw.trim()
    if (url.startsWith("http://") || url.startsWith("https://")) return url
    return `https://${url}`
  }

  const fallback = []
  const cryptoUrl = normalizeUrl(process.env.MCP_CRYPTO_URL)
  if (cryptoUrl) {
    fallback.push({
      ens: "crypto.tollgate.eth",
      url: cryptoUrl,
      manifestUrl: `${cryptoUrl}/.well-known/tollgate.json`,
      type: "mcp",
      description: "Real-time crypto prices, trending tokens, and market data",
      category: "finance",
      payee: process.env.DEPLOYER_WALLET_ADDRESS ?? "",
    })
  }

  return NextResponse.json(fallback)
}
