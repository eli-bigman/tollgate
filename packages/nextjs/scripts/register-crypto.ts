/**
 * One-time script: registers crypto.tollgate.eth on-chain via the L2Registrar.
 * Run: npx tsx scripts/register-crypto.ts
 * (from packages/nextjs/ with .env.local populated)
 */
import "dotenv/config"

const BASE_URL = process.env.NEXT_APP_URL ?? "http://localhost:3000"
const CRYPTO_URL = (() => {
  const raw = process.env.MCP_CRYPTO_URL ?? ""
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw
  return `https://${raw}`
})()

async function main() {
  console.log(`Registering crypto.tollgate.eth → ${CRYPTO_URL}`)

  const res = await fetch(`${BASE_URL}/api/ens/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      label: "crypto",
      records: {
        url: CRYPTO_URL,
        manifest: `${CRYPTO_URL}/.well-known/tollgate.json`,
        type: "mcp",
        payee: process.env.DEPLOYER_WALLET_ADDRESS ?? "",
        description: "Real-time crypto prices, trending tokens, and market data",
        category: "finance",
        version: "1.0",
      },
    }),
  })

  const json = await res.json()
  if (!res.ok) {
    console.error("Registration failed:", json)
    process.exit(1)
  }

  console.log("✓ Registered:", json)
}

main()
