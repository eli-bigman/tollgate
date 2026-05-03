// In-memory promise resolvers shared between /api/agent/run and /api/agent/payment.
// Store on globalThis to survive module reloads during Next.js dev.
const GLOB_KEY = "__tollgate_pending_payments_v1"
const pending: Map<string, (txHash: string) => void> = (globalThis as any)[GLOB_KEY] ?? new Map()
;(globalThis as any)[GLOB_KEY] = pending

export function waitForPayment(paymentId: string, timeoutMs = 120_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(paymentId)
      reject(new Error(`Payment timed out — user did not confirm within ${timeoutMs / 1000}s`))
    }, timeoutMs)

    pending.set(paymentId, (txHash: string) => {
      clearTimeout(timer)
      pending.delete(paymentId)
      resolve(txHash)
    })
  })
}

export function resolvePayment(paymentId: string, txHash: string): boolean {
  const resolver = pending.get(paymentId)
  if (!resolver) {
    // Log to console for visibility in server logs when resolution fails
    console.warn(`[payment-store] resolvePayment failed — no resolver for paymentId=${paymentId}`)
    return false
  }
  try {
    resolver(txHash)
    return true
  } finally {
    pending.delete(paymentId)
  }
}
