import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => vi.restoreAllMocks())

describe('getEthBalance', () => {
  it('balance_eth is a number, balance_wei is a string', async () => {
    vi.mock('viem', async (importOriginal) => {
      const actual = await importOriginal<typeof import('viem')>()
      return {
        ...actual,
        createPublicClient: () => ({
          getBalance: async () => BigInt('1500000000000000000')
        })
      }
    })
    const { getEthBalance } = await import('../src/tools/get-eth-balance')
    const result = await getEthBalance({ address: '0x1234567890123456789012345678901234567890' })
    expect(typeof result.balance_eth).toBe('number')
    expect(result.balance_eth).toBeCloseTo(1.5, 5)
    expect(typeof result.balance_wei).toBe('string')
    expect(result.chain).toBe('base-sepolia')
    expect(typeof result.timestamp).toBe('number')
  })
})
