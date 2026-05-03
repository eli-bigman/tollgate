import { geocodeCity, wmoToCondition } from '../data/open-meteo'

interface OpenMeteoCurrentResponse {
  current: {
    temperature_2m:       number
    relative_humidity_2m: number
    wind_speed_10m:       number
    weather_code:         number
  }
}

export async function getWeather(input: { city: string }) {
  const { lat, lng, displayName } = await geocodeCity(input.city)
  const params = new URLSearchParams({
    latitude:        lat.toString(),
    longitude:       lng.toString(),
    current:         'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
    wind_speed_unit: 'kmh'
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  const json = await res.json() as OpenMeteoCurrentResponse
  return {
    city:         displayName,
    latitude:     lat,
    longitude:    lng,
    temp_c:       json.current.temperature_2m,
    humidity_pct: json.current.relative_humidity_2m,
    wind_kmh:     json.current.wind_speed_10m,
    condition:    wmoToCondition(json.current.weather_code),
    source:       'open-meteo',
    timestamp:    Date.now()
  }
}
