import "dotenv/config"
import { runAgent } from "./agent"

const task = process.argv.slice(2).join(" ") || "What is the current ETH price?"
console.log(`Task: "${task}"\n`)

;(async () => {
  for await (const event of runAgent(task)) {
    if (event.type === "thinking")          console.log("💭", event.data.text?.slice(0, 120))
    if (event.type === "manifest_fetched")  console.log("📄", event.data.ens, "—", event.data.tools.map(t => `${t.name}($${t.price})`).join(", "))
    if (event.type === "price_check")       console.log("🔍 Price check:", event.data.price, "match:", event.data.match)
    if (event.type === "payment")           console.log("💰", event.data.mcp, "→", event.data.tool, event.data.amount + " USDC")
    if (event.type === "validation")        console.log("✓", event.data.tool, event.data.summary)
    if (event.type === "error")             console.error("❌", event.data.message)
    if (event.type === "result")            console.log("\n📋", event.data.answer, "\n💸 Spent:", event.data.totalSpent, "USDC in", event.data.calls, "calls")
  }
})()
