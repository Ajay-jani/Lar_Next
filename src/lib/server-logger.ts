import { inspect } from 'util'

function formatParts(parts: unknown[]) {
  return parts
    .map(part => {
      if (typeof part === 'string') {
        return part
      }

      return inspect(part, { depth: 5, colors: false, breakLength: Infinity })
    })
    .join(' ')
}

function writeLine(stream: 'stdout' | 'stderr', level: 'INFO' | 'WARN' | 'ERROR', parts: unknown[]) {
  process[stream].write(`[UtilityHub ${level}] ${formatParts(parts)}\n`)
}

export const logger = {
  info: (...parts: unknown[]) => writeLine('stdout', 'INFO', parts),
  warn: (...parts: unknown[]) => writeLine('stderr', 'WARN', parts),
  error: (...parts: unknown[]) => writeLine('stderr', 'ERROR', parts),
}
