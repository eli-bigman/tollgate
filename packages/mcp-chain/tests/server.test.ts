import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createServer } from '../src/server'

process.env.PAYEE_WALLET             = '0xTestPayee'
process.env.MCP_NAME                 = 'chain'
process.env.USDC_CONTRACT            = '0x5dEaC602762362FE5f135FA5904351916053cF70'
process.env.ALCHEMY_BASE_SEPOLIA_RPC = 'https://fake.rpc'

describe('mcp-chain server', () => {
  it('tools/call without payment returns 402', async () => {
    const res = await request(createServer())
      .post('/mcp')
      .send({ method: 'tools/call', params: { name: 'get_eth_balance' } })
    expect(res.status).toBe(402)
  })

  it('tools/list passes without payment', async () => {
    const res = await request(createServer())
      .post('/mcp')
      .send({ method: 'tools/list' })
    expect(res.status).not.toBe(402)
  })
})
