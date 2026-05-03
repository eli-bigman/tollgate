import express from 'express'
import path from 'path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import { manifest } from './manifest'
import { createPaymentMiddleware } from './middleware'
import { getPrice } from './tools/get-price'
import { getTrending } from './tools/get-trending'
import { getMarketData } from './tools/get-market-data'

export function createServer() {
  const app = express()
  app.use(express.json())
  app.use(express.static(path.join(__dirname, '..', 'public')))

  app.use(createPaymentMiddleware({
    getToolPrice: (name) =>
      manifest.tools.find(t => t.name === name)?.price ?? manifest.defaultPrice,
    payee:        process.env.PAYEE_WALLET ?? '',
    mcpName:      process.env.MCP_NAME ?? 'crypto',
    usdcContract: process.env.USDC_CONTRACT ?? ''
  }))

  const mcpServer = new McpServer({ name: manifest.ens, version: manifest.version })

  const tokenSchema = z.object({ token: z.string() })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mcpServer.registerTool('get_price', { inputSchema: tokenSchema as any }, async (args: any) => {
    const result = await getPrice({ token: args.token as string })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
  })

  mcpServer.registerTool('get_trending', {}, async () => {
    const result = await getTrending()
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mcpServer.registerTool('get_market_data', { inputSchema: tokenSchema as any }, async (args: any) => {
    const result = await getMarketData({ token: args.token as string })
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
