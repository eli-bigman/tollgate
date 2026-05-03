import { describe, it, expect, vi, afterEach } from 'vitest'
import { getWeather } from '../src/tools/get-weather'

afterEach(() => vi.restoreAllMocks())

const geocodeResponse = { results: [{ latitude: 51.5, longitude: -0.12, name: 'London', country: 'United Kingdom' }] }
const weatherResponse = {
  current: {
    temperature_2m: 15.2,
    relative_humidity_2m: 72,
    wind_speed_10m: 12.5,
    weather_code: 2
  }
}

describe('getWeather', () => {
  it('returns all 9 required fields', async () => {
    let call = 0
    vi.stubGlobal('fetch', async () => ({
      json: async () => call++ === 0 ? geocodeResponse : weatherResponse
    }))
    const result = await getWeather({ city: 'London' })
    expect(result.city).toBe('London, United Kingdom')
    expect(typeof result.latitude).toBe('number')
    expect(typeof result.longitude).toBe('number')
    expect(typeof result.temp_c).toBe('number')
    expect(typeof result.humidity_pct).toBe('number')
    expect(typeof result.wind_kmh).toBe('number')
    expect(typeof result.condition).toBe('string')
    expect(result.condition.length).toBeGreaterThan(0)
    expect(result.source).toBe('open-meteo')
    expect(typeof result.timestamp).toBe('number')
  })

  it('temp_c is a number not a string', async () => {
    let call = 0
    vi.stubGlobal('fetch', async () => ({
      json: async () => call++ === 0 ? geocodeResponse : weatherResponse
    }))
    const result = await getWeather({ city: 'London' })
    expect(typeof result.temp_c).toBe('number')
  })
})
