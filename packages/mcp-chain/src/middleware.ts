import { Request, Response, NextFunction, RequestHandler } from 'express'

export interface PaymentMiddlewareOptions {
  getToolPrice: (toolName: string) => string
  payee:        string
  mcpName:      string
  usdcContract: string
}

interface ActivityEvent {
  ts:     number
  mcp:    string
  tool:   string
  amount: string
  caller: string
  txSig?: string
}

const activityLog: ActivityEvent[] = []

export function getActivityLog(): ActivityEvent[] { return activityLog }
export function clearActivityLog(): void { activityLog.length = 0 }

export function createPaymentMiddleware(opts: PaymentMiddlewareOptions): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const method: string = req.body?.method ?? ''

    if (method === 'tools/list') { next(); return }
    if (method !== 'tools/call') { next(); return }

    const toolName: string = req.body?.params?.name ?? ''
    const declaredPrice = opts.getToolPrice(toolName)
    const paymentHeader = req.headers['x-payment'] as string | undefined

    if (!paymentHeader) {
      const amountMicro = Math.round(parseFloat(declaredPrice) * 1e6).toString()
      res.status(402).json({
        error:       "Payment Required",
        x402Version: "1",
        toolName,
        accepts: [{
          scheme:            "exact",
          network:           "base-sepolia",
          maxAmountRequired: amountMicro,
          asset:             opts.usdcContract,
          payTo:             opts.payee,
          memo:              `tollgate-${opts.mcpName}-${toolName}`
        }]
      })
      return
    }

    let payload: { paymentAmount?: number; payerAddress?: string; txSignature?: string; toolName?: string }
    try {
      payload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf8'))
    } catch {
      res.status(402).json({ error: "Invalid payment header" })
      return
    }

    const paidAmount = (payload.paymentAmount ?? 0) / 1e6
    if (paidAmount < parseFloat(declaredPrice)) {
      res.status(402).json({ error: "Underpayment", required: declaredPrice, received: paidAmount.toString() })
      return
    }

    activityLog.push({
      ts:     Date.now(),
      mcp:    opts.mcpName,
      tool:   toolName,
      amount: declaredPrice,
      caller: payload.payerAddress ?? 'unknown',
      txSig:  payload.txSignature
    })

    next()
  }
}
