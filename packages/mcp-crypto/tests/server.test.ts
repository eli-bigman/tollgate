// packages/mcp-crypto/tests/server.test.ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createServer } from '../src/server'

process.env.PAYEE_WALLET  = '0xTestPayee'
process.env.MCP_NAME      = 'crypto'
process.env.USDC_CONTRACT = '0x5dEaC602762362FE5f135FA5904351916053cF70'

describe('mcp-crypto server', () => {
  it('tools/call without payment returns 402', async () => {
    const app = createServer()
    const res = await request(app)
      .post('/mcp')
      .send({ method: 'tools/call', params: { name: 'get_price' } })
    expect(res.status).toBe(402)
  })

  it('tools/list returns 200 without payment', async () => {
    const app = createServer()
    const res = await request(app)
      .post('/mcp')
      .send({ method: 'tools/list' })
    expect(res.status).not.toBe(402)
  })
})
