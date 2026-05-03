import { describe, it, expect, vi, afterEach } from 'vitest'
import { geocodeCity, wmoToCondition } from '../src/data/open-meteo'

afterEach(() => vi.restoreAllMocks())

describe('geocodeCity', () => {
  it('returns lat/lng/displayName for London', async () => {
    vi.stubGlobal('fetch', async () => ({
      json: async () => ({
        results: [{ latitude: 51.5, longitude: -0.12, name: 'London', country: 'United Kingdom' }]
      })
    }))
    const result = await geocodeCity('London')
    expect(result.lat).toBe(51.5)
    expect(result.lng).toBe(-0.12)
    expect(result.displayName).toBe('London, United Kingdom')
  })

  it('throws for invalid city', async () => {
    vi.stubGlobal('fetch', async () => ({ json: async () => ({ results: [] }) }))
    await expect(geocodeCity('zzzznotacity')).rejects.toThrow('City "zzzznotacity" not found')
  })
})

describe('wmoToCondition', () => {
  it('returns Clear sky for code 0', () => { expect(wmoToCondition(0)).toBe('Clear sky') })
  it('returns Partly cloudy for code 2', () => { expect(wmoToCondition(2)).toBe('Partly cloudy') })
  it('returns Rain for code 61', () => { expect(wmoToCondition(61)).toBe('Rain') })
  it('returns Thunderstorm for code 95', () => { expect(wmoToCondition(95)).toBe('Thunderstorm') })
})
