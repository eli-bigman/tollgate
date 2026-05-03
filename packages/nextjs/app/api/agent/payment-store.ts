// In-memory promise resolvers shared between /api/agent/run and /api/agent/payment.
// Works because both routes run in the same Next.js Node.js process.
const pending = new Map<string, (txHash: string) => void>()

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
  if (!resolver) return false
  resolver(txHash)
  return true
}
