const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

interface CoinGeckoMarket {
  market_data: {
    current_price:               { usd: number }
    market_cap:                  { usd: number }
    total_volume:                { usd: number }
    price_change_percentage_24h: number
    price_change_percentage_7d:  number
  }
}

export async function getMarketData(input: { token: string }) {
  await delay(300)
  const res = await fetch(`https://api.coingecko.com/api/v3/coins/${input.token}`)
  if (res.status === 429) throw new Error('CoinGecko rate limit — wait 60 seconds')
  const json = await res.json() as CoinGeckoMarket
  return {
    token:      input.token,
    price_usd:  json.market_data.current_price.usd,
    market_cap: json.market_data.market_cap.usd,
    volume_24h: json.market_data.total_volume.usd,
    change_24h: json.market_data.price_change_percentage_24h,
    change_7d:  json.market_data.price_change_percentage_7d,
    source:     'coingecko',
    timestamp:  Date.now()
  }
}
