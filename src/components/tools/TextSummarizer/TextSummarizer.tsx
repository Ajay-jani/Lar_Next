'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SummaryLength, summarizeText } from '@/lib/text-summarizer'

type OutputFormat = 'paragraph' | 'bullets'

const SAMPLE_TEXT = `UtilityHub helps users finish practical digital tasks without friction. Instead of sending files to remote services for every small edit, the app focuses on fast browser-based workflows that feel immediate and trustworthy.

The biggest opportunities right now are in PDF and text workflows. People often need to merge, split, rotate, trim, or annotate PDFs in just a few clicks. They also want clear summaries from long notes, documents, and research without reading every line again.

Shipping fast utilities matters because users tend to judge these products on speed, clarity, and how quickly they can get back to work. A polished tool should explain what it does, keep the interface simple, and produce a downloadable result without extra setup.`

export function TextSummarizer() {
  const [text, setText] = useState('')
  const [summaryLength, setSummaryLength] = useState<SummaryLength>('medium')
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('paragraph')
  const [copied, setCopied] = useState(false)

  const summaryState = useMemo(() => {
    if (!text.trim()) {
      return { result: null, error: null as string | null }
    }

    try {
      return {
        result: summarizeText(text, summaryLength),
        error: null as string | null,
      }
    } catch (summaryError) {
      return {
        result: null,
        error: summaryError instanceof Error ? summaryError.message : 'Unable to summarize this text.',
      }
    }
  }, [summaryLength, text])

  const { result, error } = summaryState

  const outputText = useMemo(() => {
    if (!result) {
      return ''
    }

    if (outputFormat === 'bullets') {
      return result.bulletPoints.map(point => `• ${point}`).join('\n')
    }

    return result.summary
  }, [outputFormat, result])

  const handleCopy = async () => {
    if (!outputText) {
      return
    }

    await navigator.clipboard.writeText(outputText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h1 className="heading-lg">Text Summarizer</h1>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Turn long notes, articles, and documentation into clean summaries with keyword insights and flexible output length.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Paste your text</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={text}
                onChange={event => setText(event.target.value)}
                placeholder="Paste an article, meeting notes, research summary, or any long text here..."
                className="form-input min-h-[320px] resize-y"
              />

              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="secondary" onClick={() => setText(SAMPLE_TEXT)}>
                  Load Sample
                </Button>
                <Button type="button" variant="outline" onClick={() => setText('')}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Summary settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Length</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['short', 'medium', 'detailed'] as SummaryLength[]).map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSummaryLength(option)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                          summaryLength === option
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {option[0].toUpperCase() + option.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Output format</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['paragraph', 'bullets'] as OutputFormat[]).map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setOutputFormat(option)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                          outputFormat === option
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {option === 'paragraph' ? 'Paragraph' : 'Bullets'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
                  Summaries are generated locally from sentence importance and repeated keywords, so the workflow stays fast and private.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">At a glance</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Words</p>
                  <p className="mt-2 text-2xl font-semibold">{result?.stats.originalWords ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Reading Time</p>
                  <p className="mt-2 text-2xl font-semibold">{result?.stats.readingTimeMinutes ?? 0} min</p>
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Summary Words</p>
                  <p className="mt-2 text-2xl font-semibold">{result?.stats.summaryWords ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Reduction</p>
                  <p className="mt-2 text-2xl font-semibold">{result?.stats.compressionRatio ?? 0}%</p>
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
          <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-2xl">Summary output</CardTitle>
                <Button type="button" variant="outline" onClick={handleCopy}>
                  {copied ? 'Copied' : 'Copy Summary'}
                </Button>
              </CardHeader>
              <CardContent>
                {outputFormat === 'bullets' ? (
                  <ul className="space-y-3 text-foreground">
                    {result.bulletPoints.map((point, index) => (
                      <li key={`${point}-${index}`} className="rounded-2xl bg-muted/35 p-4 leading-relaxed">
                        {point}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-2xl bg-muted/35 p-5 text-foreground leading-8">
                    {result.summary}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Keyword insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {result.keywords.map(keyword => (
                    <span
                      key={keyword.term}
                      className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                    >
                      {keyword.term} · {keyword.count}
                    </span>
                  ))}
                </div>

                <div className="rounded-2xl bg-muted/35 p-4 text-sm text-muted-foreground">
                  Best for quickly condensing meeting notes, documentation, research, long emails, and article drafts.
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
