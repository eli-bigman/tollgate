import { alchemyRpc } from '../data/alchemy'

interface TokenBalance { contractAddress: string; tokenBalance: string }

export async function getTokenHoldings(input: { address: string }) {
  const result = await alchemyRpc('alchemy_getTokenBalances', [input.address]) as { tokenBalances: TokenBalance[] }
  const nonZero = result.tokenBalances.filter(t => t.tokenBalance !== '0x0')
  return {
    address:   input.address,
    tokens:    nonZero,
    chain:     'base-sepolia',
    timestamp: Date.now()
  }
}
