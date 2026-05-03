import type { TollgateManifest } from "../../../../shared/manifest-types/index"
import { logInfo, logError } from "../utils/logger"

export async function fetchManifest(manifestUrl: string): Promise<TollgateManifest | null> {
  logInfo("manifest", `Fetching manifest: ${manifestUrl}`)
  try {
    const res = await fetch(manifestUrl, { signal: AbortSignal.timeout(5000) })
    logInfo("manifest", `Response status: ${res.status} ${res.statusText}`)
    if (!res.ok) {
      logError("manifest", `Non-OK response — giving up`, { status: res.status })
      return null
    }
    const manifest = await res.json() as TollgateManifest
    logInfo("manifest", `Parsed manifest OK`, {
      ens: manifest.ens,
      tools: manifest.tools?.map((t: { name: string; price: string }) => `${t.name}=$${t.price}`)
    })
    return manifest
  } catch (err) {
    logError("manifest", `Fetch threw: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}
