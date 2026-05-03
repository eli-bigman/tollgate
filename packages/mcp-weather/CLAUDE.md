# TOLLGATE — packages/mcp-weather CLAUDE.md

## What This Package Is

The Weather MCP server. Wraps the Open-Meteo API (completely free, no key needed).
Exposes two paid tools behind x402 payment gating.
Runs on port 3002. Registered as `weather.tollgate.eth`.

## Your Scope

Work ONLY inside packages/mcp-weather/.
Import types from: ../../shared/manifest-types
Import middleware from: ../../shared/x402-middleware
Do NOT modify shared/ or any other package.

## Prerequisite

shared/manifest-types and shared/x402-middleware must be complete before you start.

## Files to Build

### src/manifest.ts

```typescript
export const manifest: TollgateManifest = {
  ens:          process.env.ENS_NAME     || "weather.tollgate.eth",
  version:      "1.0",
  description:  "Current weather and forecasts for any city worldwide",
  category:     "weather",
  payee:        process.env.PAYEE_WALLET || "",
  chain:        "base-sepolia",
  usdcContract: "0x5dEaC602762362FE5f135FA5904351916053cF70",
  defaultPrice: "0.01",
  tools: [
    {
      name:        "get_weather",
      description: "Get current weather conditions for a city",
      price:       "0.01",
      inputSchema: {
        city: { type: "string", required: true, example: "London" }
      },
      outputSchema: {
        city:         { type: "string", required: true },
        latitude:     { type: "number", required: true },
        longitude:    { type: "number", required: true },
        temp_c:       { type: "number", required: true },
        humidity_pct: { type: "number", required: true },
        wind_kmh:     { type: "number", required: true },
        condition:    { type: "string", required: true },
        source:       { type: "string", required: true },
        timestamp:    { type: "number", required: true }
      }
    },
    {
      name:        "get_forecast",
      description: "Multi-day weather forecast for a city",
      price:       "0.01",
      inputSchema: {
        city: { type: "string", required: true },
        days: { type: "number", required: false, description: "1-7, default 3" }
      },
      outputSchema: {
        city:      { type: "string", required: true },
        forecast:  { type: "array",  required: true,
                     description: "[{ date, high_c, low_c, condition }]" },
        source:    { type: "string", required: true },
        timestamp: { type: "number", required: true }
      }
    }
  ],
  updatedAt: new Date().toISOString()
}
```

### src/data/open-meteo.ts

Two-step helper functions:

```typescript
// Step 1: geocode city to lat/lng
export async function geocodeCity(city: string): Promise<{ lat: number, lng: number, displayName: string }> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
  )
  const json = await res.json()
  if (!json.results?.length) throw new Error(`City "${city}" not found`)
  const { latitude, longitude, name, country } = json.results[0]
  return { lat: latitude, lng: longitude, displayName: `${name}, ${country}` }
}

// WMO weather code → human string
export function wmoToCondition(code: number): string {
  if (code === 0)              return "Clear sky"
  if (code <= 3)               return "Partly cloudy"
  if (code <= 48)              return "Fog"
  if (code <= 67)              return "Rain"
  if (code <= 77)              return "Snow"
  if (code <= 82)              return "Rain showers"
  if (code <= 99)              return "Thunderstorm"
  return "Unknown"
}
```

### src/tools/get-weather.ts

```
Step 1: geocodeCity(input.city) → { lat, lng, displayName }
Step 2: fetch https://api.open-meteo.com/v1/forecast
  params: latitude={lat}&longitude={lng}
          &current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code
          &wind_speed_unit=kmh

Return:
{
  city:         displayName,
  latitude:     lat,
  longitude:    lng,
  temp_c:       json.current.temperature_2m,      // must be number
  humidity_pct: json.current.relative_humidity_2m, // must be number
  wind_kmh:     json.current.wind_speed_10m,       // must be number
  condition:    wmoToCondition(json.current.weather_code),
  source:       "open-meteo",
  timestamp:    Date.now()
}
```
ALL 9 required outputSchema fields must be present and correctly typed.

### src/tools/get-forecast.ts

```
Step 1: geocodeCity(input.city)
Step 2: fetch https://api.open-meteo.com/v1/forecast
  params: latitude={lat}&longitude={lng}
          &daily=temperature_2m_max,temperature_2m_min,weather_code
          &forecast_days={days || 3}
          &timezone=auto

Map json.daily.time[] to:
[{ date: time[i], high_c: temperature_2m_max[i], low_c: temperature_2m_min[i],
   condition: wmoToCondition(weather_code[i]) }]

Return:
{
  city:      displayName,
  forecast:  mappedArray,
  source:    "open-meteo",
  timestamp: Date.now()
}
```

## Tests Required

```typescript
it('manifest has ens, payee, 2 tools')
it('get_weather geocodes "London" and returns all 9 required fields')
it('get_weather temp_c is a number not a string')
it('get_weather condition is a non-empty string')
it('get_forecast days=3 returns forecast array with 3 items')
it('get_forecast each item has date, high_c, low_c, condition')
it('handles invalid city with descriptive error')
it('GET /.well-known/tollgate.json returns valid manifest JSON')
it('tools/call without payment returns 402')
```

## Environment Variables (.env)

```
PORT=3002
MCP_NAME=weather
ENS_NAME=weather.tollgate.eth
PAYEE_WALLET=0x...
USDC_CONTRACT=0x5dEaC602762362FE5f135FA5904351916053cF70
```

Announce "mcp-weather complete" when tests pass and server starts.
