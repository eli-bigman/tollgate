import { describe, it, expect, vi, afterEach } from 'vitest'
import { getForecast } from '../src/tools/get-forecast'

afterEach(() => vi.restoreAllMocks())

const geocodeResponse = { results: [{ latitude: 51.5, longitude: -0.12, name: 'London', country: 'United Kingdom' }] }
const forecastResponse = {
  daily: {
    time:                ['2026-05-03', '2026-05-04', '2026-05-05'],
    temperature_2m_max:  [18, 20, 17],
    temperature_2m_min:  [10, 12, 9],
    weather_code:        [0, 61, 2]
  }
}

describe('getForecast', () => {
  it('returns forecast array with 3 items for days=3', async () => {
    let call = 0
    vi.stubGlobal('fetch', async () => ({
      json: async () => call++ === 0 ? geocodeResponse : forecastResponse
    }))
    const result = await getForecast({ city: 'London', days: 3 })
    expect(result.forecast).toHaveLength(3)
    expect(result.source).toBe('open-meteo')
    expect(typeof result.timestamp).toBe('number')
  })

  it('each forecast item has date, high_c, low_c, condition', async () => {
    let call = 0
    vi.stubGlobal('fetch', async () => ({
      json: async () => call++ === 0 ? geocodeResponse : forecastResponse
    }))
    const result = await getForecast({ city: 'London' })
    expect(result.forecast[0]).toMatchObject({
      date: '2026-05-03',
      high_c: 18,
      low_c: 10,
      condition: 'Clear sky'
    })
  })
})
