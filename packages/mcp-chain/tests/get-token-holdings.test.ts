import { describe, it, expect, vi, afterEach } from 'vitest'
import { getTokenHoldings } from '../src/tools/get-token-holdings'

afterEach(() => vi.restoreAllMocks())

describe('getTokenHoldings', () => {
  it('returns non-zero tokens array with chain and timestamp', async () => {
    vi.stubGlobal('fetch', async () => ({
      json: async () => ({
        jsonrpc: '2.0', id: 1,
        result: {
          tokenBalances: [
            { contractAddress: '0xabc', tokenBalance: '0x100' },
            { contractAddress: '0xdef', tokenBalance: '0x0' }
          ]
        }
      })
    }))
    process.env.ALCHEMY_BASE_SEPOLIA_RPC = 'https://fake.rpc'
    const result = await getTokenHoldings({ address: '0x1234567890123456789012345678901234567890' })
    expect(Array.isArray(result.tokens)).toBe(true)
    expect(result.tokens).toHaveLength(1)
    expect(result.chain).toBe('base-sepolia')
    expect(typeof result.timestamp).toBe('number')
  })
})
