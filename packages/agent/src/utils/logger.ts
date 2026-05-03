import fs from "fs"
import path from "path"

// All agent-side code writes here.
// When Next.js is running, process.cwd() = packages/nextjs/
// so the log lands at:  packages/nextjs/agent-pipeline.log
// Watch it live:
//   PowerShell:  Get-Content -Wait -Tail 50 agent-pipeline.log
//   bash/Git:    tail -f agent-pipeline.log
const LOG_PATH = process.env.AGENT_LOG_FILE
  ?? path.join(process.cwd(), "agent-pipeline.log")

function ts(): string {
  return new Date().toISOString()
}

function write(level: string, section: string, msg: string, extra?: unknown): void {
  const extraStr = extra !== undefined
    ? "\n" + JSON.stringify(extra, null, 2)
    : ""
  const line = `[${ts()}] ${level.padEnd(5)} [${section}] ${msg}${extraStr}\n`
  try {
    fs.appendFileSync(LOG_PATH, line, "utf8")
  } catch { /* ignore write errors */ }
  process.stdout.write(line)
}

export function logInfo(section: string, msg: string, extra?: unknown): void {
  write("INFO", section, msg, extra)
}

export function logWarn(section: string, msg: string, extra?: unknown): void {
  write("WARN", section, msg, extra)
}

export function logError(section: string, msg: string, extra?: unknown): void {
  write("ERROR", section, msg, extra)
}

export function logSep(label: string): void {
  const bar = "─".repeat(Math.max(0, 58 - label.length))
  write("─────", bar, label)
}
