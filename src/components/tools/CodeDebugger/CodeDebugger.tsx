'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CodeLanguage, FindingSeverity, analyzeCode } from '@/lib/code-debugger'

const SAMPLES: Record<CodeLanguage, string> = {
  javascript: `function calculateTotal(items) {
  var total = 0;

  for (let i = 0; i < items.length; i++) {
    if (items[i].price == null) {
      console.log("missing price");
    }

    total += items[i].price || 0;
  }

  return total;
}`,
  typescript: `type User = any

async function loadUsers() {
  const response = await fetch("/api/users")
  const data: User = await response.json()

  // TODO: handle empty states
  return data
}`,
  json: `{
  "name": "UtilityHub",
  "features": ["merge", "split",],
  "fast": true
}`,
}

const severityStyles: Record<FindingSeverity, string> = {
  high: 'border-destructive/30 bg-destructive/5 text-destructive',
  medium: 'border-warning/30 bg-warning/5 text-warning',
  low: 'border-info/30 bg-info/5 text-info',
}

export function CodeDebugger() {
  const [language, setLanguage] = useState<CodeLanguage>('javascript')
  const [code, setCode] = useState('')

  const analysisState = useMemo(() => {
    if (!code.trim()) {
      return { result: null, error: null as string | null }
    }

    try {
      return {
        result: analyzeCode(code, language),
        error: null as string | null,
      }
    } catch (analysisError) {
      return {
        result: null,
        error: analysisError instanceof Error ? analysisError.message : 'Unable to analyze this code.',
      }
    }
  }, [code, language])

  const { result, error } = analysisState

  const scoreTone = result && result.score >= 85
    ? 'text-success'
    : result && result.score >= 65
      ? 'text-warning'
      : 'text-destructive'

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h1 className="heading-lg">Code Debugger</h1>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Run a fast local review for common syntax risks, code smells, and cleanup opportunities before you ship.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Analyze code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[0.8fr_1fr]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Language</label>
                  <select
                    value={language}
                    onChange={event => setLanguage(event.target.value as CodeLanguage)}
                    className="form-input"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="json">JSON</option>
                  </select>
                </div>

                <div className="flex items-end gap-3">
                  <Button type="button" variant="secondary" onClick={() => setCode(SAMPLES[language])}>
                    Load Sample
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setCode('')}>
                    Clear
                  </Button>
                </div>
              </div>

              <textarea
                value={code}
                onChange={event => setCode(event.target.value)}
                placeholder="Paste JavaScript, TypeScript, or JSON here..."
                className="form-input min-h-[360px] resize-y font-mono text-sm leading-6"
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Review focus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Checks delimiter balance, JSON validity, debug logs, risky equality, loose typing, dynamic execution, long lines, and a few other quick static patterns.</p>
                <p>It is intentionally fast, so it works best as a first-pass quality filter rather than a full compiler or linter replacement.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Metrics snapshot</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Lines</p>
                  <p className="mt-2 text-2xl font-semibold">{result?.metrics.totalLines ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Functions</p>
                  <p className="mt-2 text-2xl font-semibold">{result?.metrics.functionCount ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Conditions</p>
                  <p className="mt-2 text-2xl font-semibold">{result?.metrics.conditionalCount ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Async Uses</p>
                  <p className="mt-2 text-2xl font-semibold">{result?.metrics.asyncUsageCount ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {result && (
          <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Quality score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-3xl bg-muted/35 p-6 text-center">
                  <p className={`text-5xl font-bold ${scoreTone}`}>{result.score}</p>
                  <p className="mt-2 text-sm text-muted-foreground">out of 100</p>
                </div>
                <p className="text-sm leading-7 text-muted-foreground">{result.summary}</p>

                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Quick fixes</h3>
                  {result.quickFixes.length > 0 ? (
                    <ul className="space-y-2">
                      {result.quickFixes.map((fix, index) => (
                        <li key={`${fix}-${index}`} className="rounded-2xl bg-muted/35 p-3 text-sm text-foreground">
                          {fix}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-2xl bg-success/10 p-4 text-sm text-success">
                      No obvious quick fixes were flagged in this pass.
                    </div>
                  )}
                </div>

                {result.strengths.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-foreground">Strengths</h3>
                    <ul className="space-y-2">
                      {result.strengths.map((strength, index) => (
                        <li key={`${strength}-${index}`} className="rounded-2xl bg-success/10 p-3 text-sm text-success">
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Findings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.findings.length === 0 ? (
                  <div className="rounded-2xl border border-success/20 bg-success/10 p-5 text-success">
                    No obvious issues showed up in this quick pass.
                  </div>
                ) : (
                  result.findings.map(finding => (
                    <div key={finding.id} className={`rounded-2xl border p-5 ${severityStyles[finding.severity]}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-semibold">{finding.title}</h3>
                        <span className="rounded-full border border-current/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                          {finding.severity}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-foreground">{finding.message}</p>
                      {finding.evidence && (
                        <pre className="mt-3 overflow-x-auto rounded-xl bg-background/80 p-3 text-xs text-foreground">
                          {finding.evidence}
                        </pre>
                      )}
                      <p className="mt-3 text-sm font-medium text-foreground">Suggested fix: {finding.suggestion}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
