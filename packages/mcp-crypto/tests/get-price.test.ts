import { describe, it, expect, vi, afterEach } from 'vitest'
import { getPrice } from '../src/tools/get-price'

afterEach(() => vi.restoreAllMocks())

describe('getPrice', () => {
  it('returns all 5 required outputSchema fields for ethereum', async () => {
    vi.stubGlobal('fetch', async () => ({
      json: async () => ({ ethereum: { usd: 3000.50 } })
    }))
    const result = await getPrice({ token: 'ethereum' })
    expect(result.token).toBe('ethereum')
    expect(typeof result.price_usd).toBe('number')
    expect(result.currency).toBe('USD')
    expect(result.source).toBe('coingecko')
    expect(typeof result.timestamp).toBe('number')
  })

  it('price_usd is a number not a string', async () => {
    vi.stubGlobal('fetch', async () => ({
      json: async () => ({ bitcoin: { usd: 50000 } })
    }))
    const result = await getPrice({ token: 'bitcoin' })
    expect(typeof result.price_usd).toBe('number')
  })

  it('throws for unknown token', async () => {
    vi.stubGlobal('fetch', async () => ({
      json: async () => ({})
    }))
    await expect(getPrice({ token: 'notareal' })).rejects.toThrow('Token "notareal" not found')
  })
})
