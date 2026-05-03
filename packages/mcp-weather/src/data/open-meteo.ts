export async function geocodeCity(city: string): Promise<{ lat: number; lng: number; displayName: string }> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
  )
  const json = await res.json() as { results?: Array<{ latitude: number; longitude: number; name: string; country: string }> }
  if (!json.results?.length) throw new Error(`City "${city}" not found`)
  const { latitude, longitude, name, country } = json.results[0]
  return { lat: latitude, lng: longitude, displayName: `${name}, ${country}` }
}

export function wmoToCondition(code: number): string {
  if (code === 0)   return 'Clear sky'
  if (code <= 3)    return 'Partly cloudy'
  if (code <= 48)   return 'Fog'
  if (code <= 67)   return 'Rain'
  if (code <= 77)   return 'Snow'
  if (code <= 82)   return 'Rain showers'
  if (code <= 99)   return 'Thunderstorm'
  return 'Unknown'
}
