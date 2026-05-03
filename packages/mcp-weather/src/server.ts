import express from 'express'
import path from 'path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import { manifest } from './manifest'
import { createPaymentMiddleware } from './middleware'
import { getWeather } from './tools/get-weather'
import { getForecast } from './tools/get-forecast'

export function createServer() {
  const app = express()
  app.use(express.json())
  app.use(express.static(path.join(__dirname, '..', 'public')))

  app.use(createPaymentMiddleware({
    getToolPrice: (name) =>
      manifest.tools.find(t => t.name === name)?.price ?? manifest.defaultPrice,
    payee:        process.env.PAYEE_WALLET ?? '',
    mcpName:      process.env.MCP_NAME ?? 'weather',
    usdcContract: process.env.USDC_CONTRACT ?? ''
  }))

  const mcpServer = new McpServer({ name: manifest.ens, version: manifest.version })

  const citySchema = z.object({ city: z.string() })
  const forecastSchema = z.object({ city: z.string(), days: z.number().optional() })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mcpServer.registerTool('get_weather', { inputSchema: citySchema as any }, async (args: any) => {
    const result = await getWeather({ city: args.city as string })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mcpServer.registerTool('get_forecast', { inputSchema: forecastSchema as any }, async (args: any) => {
    const result = await getForecast({ city: args.city as string, days: args.days as number | undefined })
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
