import { geocodeCity, wmoToCondition } from '../data/open-meteo'

interface OpenMeteoForecastResponse {
  daily: {
    time:               string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    weather_code:       number[]
  }
}

export async function getForecast(input: { city: string; days?: number }) {
  const days = Math.min(input.days ?? 3, 7)
  const { lat, lng, displayName } = await geocodeCity(input.city)
  const params = new URLSearchParams({
    latitude:      lat.toString(),
    longitude:     lng.toString(),
    daily:         'temperature_2m_max,temperature_2m_min,weather_code',
    forecast_days: days.toString(),
    timezone:      'auto'
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  const json = await res.json() as OpenMeteoForecastResponse
  const forecast = json.daily.time.map((date, i) => ({
    date,
    high_c:    json.daily.temperature_2m_max[i],
    low_c:     json.daily.temperature_2m_min[i],
    condition: wmoToCondition(json.daily.weather_code[i])
  }))
  return { city: displayName, forecast, source: 'open-meteo', timestamp: Date.now() }
}
