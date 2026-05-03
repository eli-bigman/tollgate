import 'dotenv/config'
import type { TollgateManifest } from './types'

export const manifest: TollgateManifest = {
  ens:          process.env.ENS_NAME     ?? 'crypto.tollgate.eth',
  version:      '1.0',
  description:  'Real-time crypto prices, trending tokens, and market data',
  category:     'finance',
  payee:        process.env.PAYEE_WALLET ?? '',
  chain:        'base-sepolia',
  usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  defaultPrice: '0.01',
  tools: [
    {
      name:        'get_price',
      description: 'Get the current USD price for a token',
      price:       '0.01',
      inputSchema: {
        token: { type: 'string', required: true, description: 'CoinGecko ID e.g. bitcoin, ethereum', example: 'ethereum' }
      },
      outputSchema: {
        token:     { type: 'string', required: true },
        price_usd: { type: 'number', required: true },
        currency:  { type: 'string', required: true, enum: ['USD'] },
        source:    { type: 'string', required: true },
        timestamp: { type: 'number', required: true }
      }
    },
    {
      name:        'get_trending',
      description: 'Get the top 7 trending tokens right now',
      price:       '0.01',
      inputSchema: {},
      outputSchema: {
        tokens:     { type: 'array',  required: true, description: '[{ name, symbol, market_cap_rank, price_btc }]' },
        fetched_at: { type: 'number', required: true }
      }
    },
    {
      name:        'get_market_data',
      description: 'Full market data: price, cap, volume, 24h/7d change',
      price:       '0.02',
      inputSchema: {
        token: { type: 'string', required: true, example: 'ethereum' }
      },
      outputSchema: {
        token:      { type: 'string', required: true },
        price_usd:  { type: 'number', required: true },
        market_cap: { type: 'number', required: true },
        volume_24h: { type: 'number', required: true },
        change_24h: { type: 'number', required: true },
        change_7d:  { type: 'number', required: true },
        source:     { type: 'string', required: true },
        timestamp:  { type: 'number', required: true }
      }
    }
  ],
  updatedAt: new Date().toISOString()
}
