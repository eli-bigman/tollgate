const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

let trendingCache: { tokens: unknown[]; fetched_at: number } | null = null
let cacheTime = 0

export function clearTrendingCache(): void {
  trendingCache = null
  cacheTime = 0
}

export async function getTrending() {
  if (trendingCache && Date.now() - cacheTime < 60_000) {
    return trendingCache
  }
  await delay(300)
  const res = await fetch('https://api.coingecko.com/api/v3/search/trending')
  const json = await res.json() as { coins: Array<{ item: unknown }> }
  const tokens = json.coins.slice(0, 7).map((c) => c.item)
  trendingCache = { tokens, fetched_at: Date.now() }
  cacheTime = Date.now()
  return trendingCache
}
