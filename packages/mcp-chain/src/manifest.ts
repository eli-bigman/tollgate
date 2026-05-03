import 'dotenv/config'
import type { TollgateManifest } from './types'

export const manifest: TollgateManifest = {
  ens:          process.env.ENS_NAME     ?? 'chain.tollgate.eth',
  version:      '1.0',
  description:  'On-chain data: ETH balance, token holdings, recent transactions',
  category:     'blockchain',
  payee:        process.env.PAYEE_WALLET ?? '',
  chain:        'base-sepolia',
  usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  defaultPrice: '0.02',
  tools: [
    {
      name:        'get_eth_balance',
      description: 'Get the ETH balance of any address',
      price:       '0.01',
      inputSchema: {
        address: { type: 'string', required: true, description: 'EVM address 0x...' }
      },
      outputSchema: {
        address:     { type: 'string', required: true },
        balance_eth: { type: 'number', required: true, description: 'Formatted ETH' },
        balance_wei: { type: 'string', required: true, description: 'Raw wei as string' },
        chain:       { type: 'string', required: true },
        timestamp:   { type: 'number', required: true }
      }
    },
    {
      name:        'get_token_holdings',
      description: 'Get all ERC-20 token balances for an address',
      price:       '0.02',
      inputSchema: {
        address: { type: 'string', required: true }
      },
      outputSchema: {
        address:   { type: 'string', required: true },
        tokens:    { type: 'array',  required: true, description: '[{ contractAddress, tokenBalance }]' },
        chain:     { type: 'string', required: true },
        timestamp: { type: 'number', required: true }
      }
    },
    {
      name:        'get_recent_txs',
      description: 'Get recent transactions sent from an address',
      price:       '0.02',
      inputSchema: {
        address: { type: 'string', required: true },
        limit:   { type: 'number', required: false, description: 'Max 20, default 5' }
      },
      outputSchema: {
        address:      { type: 'string', required: true },
        transactions: { type: 'array',  required: true, description: '[{ hash, from, to, value, asset, blockNum }]' },
        chain:        { type: 'string', required: true },
        timestamp:    { type: 'number', required: true }
      }
    }
  ],
  updatedAt: new Date().toISOString()
}
