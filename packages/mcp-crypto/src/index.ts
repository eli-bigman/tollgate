import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { manifest } from './manifest'
import { createServer } from './server'

function validateEnv() {
  const payee = process.env.PAYEE_WALLET
  if (!payee || !payee.startsWith('0x')) throw new Error('PAYEE_WALLET must be set and start with 0x')
  for (const tool of manifest.tools) {
    if (parseFloat(tool.price) <= 0) throw new Error(`Tool ${tool.name} has invalid price`)
  }
}

function writeManifest() {
  const dir = path.join(__dirname, '..', 'public', '.well-known')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'tollgate.json'), JSON.stringify(manifest, null, 2))
  console.log(`Manifest written: ${manifest.tools.length} tools`)
  for (const tool of manifest.tools) console.log(`  ${tool.name}: $${tool.price}`)
}

validateEnv()
writeManifest()

const port = parseInt(process.env.PORT ?? '3001', 10)
createServer().listen(port, () => console.log(`${manifest.ens} running on :${port}`))
