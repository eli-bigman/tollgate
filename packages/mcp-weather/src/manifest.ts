import 'dotenv/config'
import type { TollgateManifest } from './types'

export const manifest: TollgateManifest = {
  ens:          process.env.ENS_NAME     ?? 'weather.tollgate.eth',
  version:      '1.0',
  description:  'Current weather and forecasts for any city worldwide',
  category:     'weather',
  payee:        process.env.PAYEE_WALLET ?? '',
  chain:        'base-sepolia',
  usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  defaultPrice: '0.01',
  tools: [
    {
      name:        'get_weather',
      description: 'Get current weather conditions for a city',
      price:       '0.01',
      inputSchema: {
        city: { type: 'string', required: true, example: 'London' }
      },
      outputSchema: {
        city:         { type: 'string', required: true },
        latitude:     { type: 'number', required: true },
        longitude:    { type: 'number', required: true },
        temp_c:       { type: 'number', required: true },
        humidity_pct: { type: 'number', required: true },
        wind_kmh:     { type: 'number', required: true },
        condition:    { type: 'string', required: true },
        source:       { type: 'string', required: true },
        timestamp:    { type: 'number', required: true }
      }
    },
    {
      name:        'get_forecast',
      description: 'Multi-day weather forecast for a city',
      price:       '0.01',
      inputSchema: {
        city: { type: 'string', required: true },
        days: { type: 'number', required: false, description: '1-7, default 3' }
      },
      outputSchema: {
        city:      { type: 'string', required: true },
        forecast:  { type: 'array',  required: true, description: '[{ date, high_c, low_c, condition }]' },
        source:    { type: 'string', required: true },
        timestamp: { type: 'number', required: true }
      }
    }
  ],
  updatedAt: new Date().toISOString()
}
