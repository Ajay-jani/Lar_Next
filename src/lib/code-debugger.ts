export type CodeLanguage = 'javascript' | 'typescript' | 'json'
export type FindingSeverity = 'high' | 'medium' | 'low'

export interface CodeFinding {
  id: string
  title: string
  severity: FindingSeverity
  message: string
  suggestion: string
  evidence?: string
}

export interface CodeMetrics {
  totalLines: number
  nonEmptyLines: number
  functionCount: number
  conditionalCount: number
  loopCount: number
  asyncUsageCount: number
  commentLines: number
  longLineCount: number
}

export interface CodeAnalysisResult {
  score: number
  summary: string
  findings: CodeFinding[]
  strengths: string[]
  quickFixes: string[]
  metrics: CodeMetrics
}

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0
}

function getLineNumber(text: string, matchIndex: number): number {
  return text.slice(0, matchIndex).split('\n').length
}

function createEvidenceLine(code: string, lineNumber: number): string | undefined {
  const line = code.split('\n')[lineNumber - 1]?.trim()
  return line ? `Line ${lineNumber}: ${line}` : undefined
}

function addPatternFinding(
  findings: CodeFinding[],
  code: string,
  pattern: RegExp,
  config: Omit<CodeFinding, 'id' | 'evidence'>,
  limit = 1
): void {
  const matches = Array.from(code.matchAll(pattern)).slice(0, limit)

  matches.forEach((match, index) => {
    const matchIndex = match.index ?? 0
    const lineNumber = getLineNumber(code, matchIndex)

    findings.push({
      id: `${config.title.toLowerCase().replace(/\s+/g, '-')}-${lineNumber}-${index}`,
      evidence: createEvidenceLine(code, lineNumber),
      ...config,
    })
  })
}

function findDelimiterIssues(code: string): CodeFinding[] {
  const findings: CodeFinding[] = []
  const stack: Array<{ char: string; line: number }> = []
  const pairs: Record<string, string> = {
    ')': '(',
    ']': '[',
    '}': '{',
  }

  let line = 1
  let inSingle = false
  let inDouble = false
  let inTemplate = false
  let inLineComment = false
  let inBlockComment = false
  let escaped = false

  for (let index = 0; index < code.length; index += 1) {
    const char = code[index]
    const nextChar = code[index + 1]

    if (char === '\n') {
      line += 1
      inLineComment = false
      escaped = false
      continue
    }

    if (inLineComment) {
      continue
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false
        index += 1
      }
      continue
    }

    if (escaped) {
      escaped = false
      continue
    }

    if (inSingle) {
      if (char === '\\') {
        escaped = true
      } else if (char === '\'') {
        inSingle = false
      }
      continue
    }

    if (inDouble) {
      if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inDouble = false
      }
      continue
    }

    if (inTemplate) {
      if (char === '\\') {
        escaped = true
      } else if (char === '`') {
        inTemplate = false
      }
      continue
    }

    if (char === '/' && nextChar === '/') {
      inLineComment = true
      index += 1
      continue
    }

    if (char === '/' && nextChar === '*') {
      inBlockComment = true
      index += 1
      continue
    }

    if (char === '\'') {
      inSingle = true
      continue
    }

    if (char === '"') {
      inDouble = true
      continue
    }

    if (char === '`') {
      inTemplate = true
      continue
    }

    if (char === '(' || char === '[' || char === '{') {
      stack.push({ char, line })
      continue
    }

    if (char === ')' || char === ']' || char === '}') {
      const open = stack.pop()
      if (!open || open.char !== pairs[char]) {
        findings.push({
          id: `delimiter-mismatch-${line}-${index}`,
          title: 'Unbalanced delimiter',
          severity: 'high',
          message: `There is an unmatched "${char}" near line ${line}.`,
          suggestion: 'Check the surrounding block and make sure every opening bracket has a matching closing bracket.',
          evidence: createEvidenceLine(code, line),
        })
        return findings
      }
    }
  }

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1]
    findings.push({
      id: `delimiter-open-${unclosed.line}`,
      title: 'Missing closing delimiter',
      severity: 'high',
      message: `A "${unclosed.char}" opened near line ${unclosed.line} is never closed.`,
      suggestion: 'Close the open block or remove the extra opening delimiter.',
      evidence: createEvidenceLine(code, unclosed.line),
    })
  }

  return findings
}

export function analyzeCode(code: string, language: CodeLanguage): CodeAnalysisResult {
  const trimmedCode = code.trim()
  if (!trimmedCode) {
    throw new Error('Paste some code before running the analysis')
  }

  const lines = code.split('\n')
  const nonEmptyLines = lines.filter(line => line.trim().length > 0)
  const findings: CodeFinding[] = []
  const strengths: string[] = []

  const metrics: CodeMetrics = {
    totalLines: lines.length,
    nonEmptyLines: nonEmptyLines.length,
    functionCount: countMatches(code, /\bfunction\b|=>|class\s+\w+/g),
    conditionalCount: countMatches(code, /\bif\b|\bswitch\b|\bcase\b|\?\s*[^:]/g),
    loopCount: countMatches(code, /\bfor\b|\bwhile\b|\bforEach\b|\bmap\b|\breduce\b/g),
    asyncUsageCount: countMatches(code, /\basync\b|\bawait\b|\bPromise\b/g),
    commentLines: lines.filter(line => /^\s*(\/\/|\/\*|\*)/.test(line)).length,
    longLineCount: lines.filter(line => line.length > 120).length,
  }

  findings.push(...findDelimiterIssues(code))

  if (language === 'json') {
    try {
      JSON.parse(trimmedCode)
      strengths.push('Valid JSON structure detected.')
    } catch (error) {
      findings.push({
        id: 'json-parse-error',
        title: 'Invalid JSON syntax',
        severity: 'high',
        message: error instanceof Error ? error.message : 'JSON.parse failed for this input.',
        suggestion: 'Fix the JSON syntax first, then re-run the analysis for structural feedback.',
      })
    }
  }

  addPatternFinding(findings, code, /\bconsole\.(log|debug|info)\s*\(/g, {
    title: 'Debug logging left in code',
    severity: 'low',
    message: 'Debug logging is still present and can create noisy output or leak internal details.',
    suggestion: 'Remove temporary logs or replace them with structured production logging.',
  }, 2)

  addPatternFinding(findings, code, /\bvar\s+[a-zA-Z_$]/g, {
    title: 'Legacy var declaration',
    severity: 'medium',
    message: '`var` is function-scoped and makes refactors harder to reason about.',
    suggestion: 'Prefer `const` by default and use `let` only when reassignment is required.',
  })

  addPatternFinding(findings, code, /(^|[^=!])==([^=]|$)|(^|[^!])!=([^=]|$)/gm, {
    title: 'Non-strict equality check',
    severity: 'medium',
    message: 'Loose equality can hide coercion bugs that are painful to track down.',
    suggestion: 'Use `===` / `!==` unless you intentionally need type coercion.',
  }, 2)

  addPatternFinding(findings, code, /\beval\s*\(|new Function\s*\(/g, {
    title: 'Dynamic code execution',
    severity: 'high',
    message: 'Dynamic execution is a major safety and maintainability risk.',
    suggestion: 'Replace `eval` or `new Function` with explicit parsing or mapped handlers.',
  })

  addPatternFinding(findings, code, /@ts-ignore/g, {
    title: 'TypeScript ignore directive',
    severity: 'medium',
    message: '`@ts-ignore` suppresses useful type feedback and can hide a real defect.',
    suggestion: 'Prefer narrowing the types or using a targeted `@ts-expect-error` with a comment.',
  }, 2)

  if (language === 'typescript') {
    addPatternFinding(findings, code, /\bany\b|as any/g, {
      title: 'Loose TypeScript typing',
      severity: 'medium',
      message: 'Broad `any` usage weakens the safety net that TypeScript is giving you.',
      suggestion: 'Replace `any` with a concrete type, union, generic, or `unknown` plus narrowing.',
    }, 2)
  }

  addPatternFinding(findings, code, /\b(TODO|FIXME|HACK)\b/gi, {
    title: 'Follow-up marker left in code',
    severity: 'low',
    message: 'The code still contains a note that likely points to unfinished or risky work.',
    suggestion: 'Resolve the follow-up or convert it into a tracked issue if it must stay.',
  }, 2)

  addPatternFinding(findings, code, /catch\s*\([^)]*\)\s*\{\s*\}/g, {
    title: 'Empty catch block',
    severity: 'medium',
    message: 'Errors are being swallowed without logging, fallback handling, or recovery.',
    suggestion: 'Handle the error explicitly or rethrow it with more context.',
  })

  if (metrics.longLineCount > 0) {
    findings.push({
      id: 'long-lines',
      title: 'Long lines reduce scan speed',
      severity: 'low',
      message: `${metrics.longLineCount} line${metrics.longLineCount === 1 ? '' : 's'} exceed 120 characters, which makes review and maintenance harder.`,
      suggestion: 'Wrap long expressions or split the logic into named variables.',
    })
  }

  const repeatedNumbers = Array.from(code.matchAll(/\b([2-9]\d{1,}|\d{2,})\b/g))
    .map(match => match[1])
    .reduce<Record<string, number>>((accumulator, literal) => {
      accumulator[literal] = (accumulator[literal] ?? 0) + 1
      return accumulator
    }, {})

  const noisyLiterals = Object.entries(repeatedNumbers).filter(([, count]) => count >= 3)
  if (noisyLiterals.length > 0) {
    findings.push({
      id: 'magic-numbers',
      title: 'Repeated numeric literals',
      severity: 'low',
      message: `Numeric values like ${noisyLiterals.slice(0, 3).map(([literal]) => `"${literal}"`).join(', ')} appear repeatedly and may be hidden domain rules.`,
      suggestion: 'Move important repeated numbers into named constants so the intent is obvious.',
    })
  }

  const repeatedLines = Object.entries(
    nonEmptyLines.reduce<Record<string, number>>((accumulator, line) => {
      const normalizedLine = line.trim()
      if (normalizedLine.length >= 16) {
        accumulator[normalizedLine] = (accumulator[normalizedLine] ?? 0) + 1
      }
      return accumulator
    }, {})
  ).filter(([, count]) => count >= 3)

  if (repeatedLines.length > 0) {
    findings.push({
      id: 'duplicate-lines',
      title: 'Possible duplicated logic',
      severity: 'low',
      message: 'Several non-trivial lines are repeated multiple times, which is often a sign the logic can be extracted.',
      suggestion: 'Look for helper functions or shared utilities to remove copy-paste maintenance cost.',
      evidence: repeatedLines[0][0],
    })
  }

  if (metrics.asyncUsageCount > 0 && !/\btry\s*\{/.test(code) && !/\.catch\s*\(/.test(code)) {
    findings.push({
      id: 'missing-async-guardrails',
      title: 'Async flow lacks visible error handling',
      severity: 'low',
      message: 'This code uses async operations, but no obvious `try/catch` or `.catch()` handling is present.',
      suggestion: 'Add error handling around async boundaries so failures are easier to recover from and debug.',
    })
  }

  if (!/\bconsole\.(log|debug|info)\s*\(/.test(code)) {
    strengths.push('No temporary debug logging detected.')
  }

  if (!/(^|[^=!])==([^=]|$)|(^|[^!])!=([^=]|$)/m.test(code) && /===|!==/.test(code)) {
    strengths.push('Uses strict equality checks, which reduces coercion surprises.')
  }

  if (/\btry\s*\{/.test(code) && /\bcatch\s*\(/.test(code)) {
    strengths.push('Explicit error handling is present.')
  }

  if (language === 'typescript' && (/\binterface\b/.test(code) || /\btype\b/.test(code))) {
    strengths.push('TypeScript models are defined, which usually improves maintainability.')
  }

  if (metrics.longLineCount === 0) {
    strengths.push('Line lengths are already easy to scan.')
  }

  const severityPenalty = findings.reduce((penalty, finding) => {
    if (finding.severity === 'high') {
      return penalty + 18
    }

    if (finding.severity === 'medium') {
      return penalty + 10
    }

    return penalty + 5
  }, 0)

  const score = Math.max(10, Math.min(100, 100 - severityPenalty))
  const quickFixes = findings.slice(0, 4).map(finding => finding.suggestion)

  let summary = 'The code looks healthy for a quick static review.'
  if (findings.some(finding => finding.severity === 'high')) {
    summary = 'There are a couple of high-risk issues worth fixing before you trust this code.'
  } else if (findings.length >= 4) {
    summary = 'The code is workable, but there are several cleanup opportunities that would improve reliability.'
  } else if (findings.length > 0) {
    summary = 'Nothing catastrophic showed up, but a few targeted fixes would tighten this up.'
  }

  return {
    score,
    summary,
    findings,
    strengths,
    quickFixes,
    metrics,
  }
}
