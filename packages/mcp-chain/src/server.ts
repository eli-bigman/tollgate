import express from 'express'
import path from 'path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import { manifest } from './manifest'
import { createPaymentMiddleware } from './middleware'
import { getEthBalance } from './tools/get-eth-balance'
import { getTokenHoldings } from './tools/get-token-holdings'
import { getRecentTxs } from './tools/get-recent-txs'

export function createServer() {
  const app = express()
  app.use(express.json())
  app.use(express.static(path.join(__dirname, '..', 'public')))

  app.use(createPaymentMiddleware({
    getToolPrice: (name) =>
      manifest.tools.find(t => t.name === name)?.price ?? manifest.defaultPrice,
    payee:        process.env.PAYEE_WALLET ?? '',
    mcpName:      process.env.MCP_NAME ?? 'chain',
    usdcContract: process.env.USDC_CONTRACT ?? ''
  }))

  const mcpServer = new McpServer({ name: manifest.ens, version: manifest.version })

  const addrSchema    = z.object({ address: z.string() })
  const addrLimSchema = z.object({ address: z.string(), limit: z.number().optional() })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mcpServer.registerTool('get_eth_balance', { inputSchema: addrSchema as any }, async (args: any) => {
    const result = await getEthBalance({ address: args.address as string })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mcpServer.registerTool('get_token_holdings', { inputSchema: addrSchema as any }, async (args: any) => {
    const result = await getTokenHoldings({ address: args.address as string })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mcpServer.registerTool('get_recent_txs', { inputSchema: addrLimSchema as any }, async (args: any) => {
    const result = await getRecentTxs({ address: args.address as string, limit: args.limit as number | undefined })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
  })

  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    res.on('close', () => transport.close())
    await mcpServer.connect(transport)
    await transport.handleRequest(req, res, req.body)
  })

  app.get('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    res.on('close', () => transport.close())
    await mcpServer.connect(transport)
    await transport.handleRequest(req, res)
  })

  return app
}
