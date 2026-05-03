import { describe, it, expect, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createPaymentMiddleware, getActivityLog, clearActivityLog } from '../src/middleware'

const opts = {
  getToolPrice: (_name: string) => '0.01',
  payee:        '0xPayee',
  mcpName:      'weather',
  usdcContract: '0x5dEaC602762362FE5f135FA5904351916053cF70'
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(createPaymentMiddleware(opts))
  app.post('/mcp', (_req, res) => res.json({ ok: true }))
  return app
}

beforeEach(() => clearActivityLog())

describe('x402 middleware', () => {
  it('allows tools/list without payment', async () => {
    const res = await request(buildApp())
      .post('/mcp')
      .send({ method: 'tools/list' })
    expect(res.status).toBe(200)
  })

  it('returns 402 for tools/call with no x-payment header', async () => {
    const res = await request(buildApp())
      .post('/mcp')
      .send({ method: 'tools/call', params: { name: 'get_weather' } })
    expect(res.status).toBe(402)
    expect(res.body.error).toBe('Payment Required')
  })

  it('402 body includes correct price from getToolPrice', async () => {
    const res = await request(buildApp())
      .post('/mcp')
      .send({ method: 'tools/call', params: { name: 'get_weather' } })
    expect(res.status).toBe(402)
    expect(res.body.accepts[0].maxAmountRequired).toBe('10000')
  })

  it('memo format is tollgate-{mcpName}-{toolName}', async () => {
    const res = await request(buildApp())
      .post('/mcp')
      .send({ method: 'tools/call', params: { name: 'get_weather' } })
    expect(res.body.accepts[0].memo).toBe('tollgate-weather-get_weather')
  })

  it('passes request with valid x-payment header', async () => {
    const payload = Buffer.from(JSON.stringify({
      paymentAmount: 10000,
      payerAddress: '0xUser',
      txSignature: '0xsig',
      toolName: 'get_weather'
    })).toString('base64')
    const res = await request(buildApp())
      .post('/mcp')
      .set('x-payment', payload)
      .send({ method: 'tools/call', params: { name: 'get_weather' } })
    expect(res.status).toBe(200)
  })

  it('rejects underpayment', async () => {
    const payload = Buffer.from(JSON.stringify({
      paymentAmount: 1,
      payerAddress: '0xUser'
    })).toString('base64')
    const res = await request(buildApp())
      .post('/mcp')
      .set('x-payment', payload)
      .send({ method: 'tools/call', params: { name: 'get_weather' } })
    expect(res.status).toBe(402)
    expect(res.body.error).toBe('Underpayment')
  })

  it('logs ActivityEvent on successful payment', async () => {
    const payload = Buffer.from(JSON.stringify({
      paymentAmount: 10000,
      payerAddress: '0xUser',
      txSignature: '0xsig',
      toolName: 'get_weather'
    })).toString('base64')
    await request(buildApp())
      .post('/mcp')
      .set('x-payment', payload)
      .send({ method: 'tools/call', params: { name: 'get_weather' } })
    expect(getActivityLog()).toHaveLength(1)
    expect(getActivityLog()[0].tool).toBe('get_weather')
    expect(getActivityLog()[0].caller).toBe('0xUser')
  })
})
