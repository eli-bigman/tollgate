export async function alchemyRpc(method: string, params: unknown[]): Promise<unknown> {
  const rpc = process.env.ALCHEMY_BASE_SEPOLIA_RPC
  if (!rpc) throw new Error('ALCHEMY_BASE_SEPOLIA_RPC is not set')
  const res = await fetch(rpc, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  })
  const json = await res.json() as { result?: unknown; error?: { message: string } }
  if (json.error) throw new Error(`Alchemy error: ${json.error.message}`)
  return json.result
}
