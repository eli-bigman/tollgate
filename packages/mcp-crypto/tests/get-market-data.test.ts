import { describe, it, expect, vi, afterEach } from 'vitest'
import { getMarketData } from '../src/tools/get-market-data'

afterEach(() => vi.restoreAllMocks())

const mockCoinResponse = {
  market_data: {
    current_price: { usd: 3000 },
    market_cap:    { usd: 350_000_000_000 },
    total_volume:  { usd: 15_000_000_000 },
    price_change_percentage_24h: 2.5,
    price_change_percentage_7d:  -1.2
  }
}

describe('getMarketData', () => {
  it('returns all 8 required fields', async () => {
    vi.stubGlobal('fetch', async () => ({ status: 200, json: async () => mockCoinResponse }))
    const result = await getMarketData({ token: 'ethereum' })
    expect(result.token).toBe('ethereum')
    expect(typeof result.price_usd).toBe('number')
    expect(typeof result.market_cap).toBe('number')
    expect(typeof result.volume_24h).toBe('number')
    expect(typeof result.change_24h).toBe('number')
    expect(typeof result.change_7d).toBe('number')
    expect(result.source).toBe('coingecko')
    expect(typeof result.timestamp).toBe('number')
  })

  it('throws CoinGecko rate limit error on 429', async () => {
    vi.stubGlobal('fetch', async () => ({ status: 429, json: async () => ({}) }))
    await expect(getMarketData({ token: 'ethereum' })).rejects.toThrow('CoinGecko rate limit')
  })
})
