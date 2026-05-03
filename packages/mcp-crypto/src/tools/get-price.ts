const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function getPrice(input: { token: string }) {
  await delay(300)
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${input.token}&vs_currencies=usd`
  )
  const json = await res.json() as Record<string, { usd?: number }>
  if (!json[input.token]) throw new Error(`Token "${input.token}" not found`)
  return {
    token:     input.token,
    price_usd: json[input.token].usd as number,
    currency:  'USD' as const,
    source:    'coingecko',
    timestamp: Date.now()
  }
}
