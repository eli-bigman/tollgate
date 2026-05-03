import { createPublicClient, http, formatEther } from 'viem'
import { baseSepolia } from 'viem/chains'

const client = createPublicClient({
  chain:     baseSepolia,
  transport: http(process.env.ALCHEMY_BASE_SEPOLIA_RPC)
})

export async function getEthBalance(input: { address: string }) {
  const raw = await client.getBalance({ address: input.address as `0x${string}` })
  return {
    address:     input.address,
    balance_eth: parseFloat(formatEther(raw)),
    balance_wei: raw.toString(),
    chain:       'base-sepolia',
    timestamp:   Date.now()
  }
}
