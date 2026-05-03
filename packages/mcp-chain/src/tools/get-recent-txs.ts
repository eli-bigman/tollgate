import { alchemyRpc } from '../data/alchemy'

export async function getRecentTxs(input: { address: string; limit?: number }) {
  const limit = input.limit ?? 5
  const result = await alchemyRpc('alchemy_getAssetTransfers', [{
    fromAddress: input.address,
    category:    ['external', 'erc20'],
    maxCount:    `0x${limit.toString(16)}`
  }]) as { transfers: unknown[] }
  return {
    address:      input.address,
    transactions: result.transfers.slice(0, limit),
    chain:        'base-sepolia',
    timestamp:    Date.now()
  }
}
