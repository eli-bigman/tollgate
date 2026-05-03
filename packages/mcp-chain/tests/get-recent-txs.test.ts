import { describe, it, expect, vi, afterEach } from 'vitest'
import { getRecentTxs } from '../src/tools/get-recent-txs'

afterEach(() => vi.restoreAllMocks())

const mockTransfers = Array.from({ length: 10 }, (_, i) => ({
  hash: `0xhash${i}`,
  from: '0xsender',
  to:   '0xrecipient',
  value: 0.01,
  asset: 'ETH',
  blockNum: `0x${i.toString(16)}`
}))

describe('getRecentTxs', () => {
  it('respects limit parameter', async () => {
    vi.stubGlobal('fetch', async () => ({
      json: async () => ({ jsonrpc: '2.0', id: 1, result: { transfers: mockTransfers } })
    }))
    process.env.ALCHEMY_BASE_SEPOLIA_RPC = 'https://fake.rpc'
    const result = await getRecentTxs({ address: '0x1234', limit: 3 })
    expect(result.transactions).toHaveLength(3)
  })

  it('defaults to 5 if no limit given', async () => {
    vi.stubGlobal('fetch', async () => ({
      json: async () => ({ jsonrpc: '2.0', id: 1, result: { transfers: mockTransfers } })
    }))
    process.env.ALCHEMY_BASE_SEPOLIA_RPC = 'https://fake.rpc'
    const result = await getRecentTxs({ address: '0x1234' })
    expect(result.transactions).toHaveLength(5)
  })

  it('includes chain and timestamp', async () => {
    vi.stubGlobal('fetch', async () => ({
      json: async () => ({ jsonrpc: '2.0', id: 1, result: { transfers: mockTransfers } })
    }))
    process.env.ALCHEMY_BASE_SEPOLIA_RPC = 'https://fake.rpc'
    const result = await getRecentTxs({ address: '0x1234' })
    expect(result.chain).toBe('base-sepolia')
    expect(typeof result.timestamp).toBe('number')
  })
})
