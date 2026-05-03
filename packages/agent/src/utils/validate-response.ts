import type { ManifestTool, ValidationResult } from "../../../../shared/manifest-types/index"

export function validateResponse(
  toolName: string,
  data: unknown,
  tools: ManifestTool[]
): ValidationResult {
  const tool = tools.find(t => t.name === toolName)

  if (!tool) return {
    valid: true, missingFields: [], wrongTypeFields: [],
    summary: `unknown tool "${toolName}" — skipped validation`
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) return {
    valid: false,
    missingFields: ["(entire response is not an object)"],
    wrongTypeFields: [],
    summary: "response is not an object"
  }

  const obj = data as Record<string, unknown>
  const missingFields: string[] = []
  const wrongTypeFields: string[] = []

  for (const [field, schema] of Object.entries(tool.outputSchema)) {
    if (!schema.required) continue

    if (obj[field] === null || obj[field] === undefined) {
      missingFields.push(field)
      continue
    }

    const actual = Array.isArray(obj[field]) ? "array" : typeof obj[field]
    if (schema.type !== actual) {
      wrongTypeFields.push(`${field} (expected ${schema.type}, got ${actual})`)
    }
  }

  const requiredCount = Object.values(tool.outputSchema).filter(s => s.required).length
  const valid = missingFields.length === 0 && wrongTypeFields.length === 0
  const summary = valid
    ? `all ${requiredCount} required fields present`
    : `INVALID — missing: [${missingFields.join(", ")}]` +
      (wrongTypeFields.length ? ` wrong type: [${wrongTypeFields.join(", ")}]` : "")

  return { valid, missingFields, wrongTypeFields, summary }
}
