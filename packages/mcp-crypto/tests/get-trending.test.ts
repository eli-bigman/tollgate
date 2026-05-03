import { describe, it, expect, vi, afterEach } from 'vitest'
import { getTrending, clearTrendingCache } from '../src/tools/get-trending'

afterEach(() => {
  vi.restoreAllMocks()
  clearTrendingCache()
})

describe('getTrending', () => {
  it('returns tokens array with fetched_at timestamp', async () => {
    const mockCoins = Array.from({ length: 7 }, (_, i) => ({
      item: { name: `Token${i}`, symbol: `T${i}`, market_cap_rank: i + 1, price_btc: 0.001 }
    }))
    vi.stubGlobal('fetch', async () => ({
      json: async () => ({ coins: mockCoins })
    }))
    const result = await getTrending()
    expect(Array.isArray(result.tokens)).toBe(true)
    expect(result.tokens).toHaveLength(7)
    expect(typeof result.fetched_at).toBe('number')
  })

  it('each token has name, symbol, market_cap_rank, price_btc', async () => {
    const mockCoins = [{ item: { name: 'Eth', symbol: 'ETH', market_cap_rank: 2, price_btc: 0.05 } }]
    vi.stubGlobal('fetch', async () => ({
      json: async () => ({ coins: mockCoins })
    }))
    const result = await getTrending()
    expect(result.tokens[0]).toMatchObject({ name: 'Eth', symbol: 'ETH', market_cap_rank: 2, price_btc: 0.05 })
  })
})
