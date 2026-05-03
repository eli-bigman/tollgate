import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { alchemyRpc } from '../src/data/alchemy'

beforeEach(() => {
  process.env.ALCHEMY_BASE_SEPOLIA_RPC = 'https://fake.rpc'
})

afterEach(() => vi.restoreAllMocks())

describe('alchemyRpc', () => {
  it('returns result on success', async () => {
    vi.stubGlobal('fetch', async () => ({
      json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x1' })
    }))
    const result = await alchemyRpc('eth_blockNumber', [])
    expect(result).toBe('0x1')
  })

  it('throws on Alchemy error response', async () => {
    vi.stubGlobal('fetch', async () => ({
      json: async () => ({ error: { message: 'Invalid params' } })
    }))
    await expect(alchemyRpc('eth_call', [])).rejects.toThrow('Alchemy error: Invalid params')
  })
})
