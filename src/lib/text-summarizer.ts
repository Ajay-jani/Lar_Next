export type SummaryLength = 'short' | 'medium' | 'detailed'

export interface KeywordInsight {
  term: string
  count: number
}

export interface SummaryStats {
  originalWords: number
  summaryWords: number
  originalSentences: number
  summarySentences: number
  compressionRatio: number
  readingTimeMinutes: number
}

export interface SummaryResult {
  summary: string
  bulletPoints: string[]
  keywords: KeywordInsight[]
  stats: SummaryStats
}

interface SentenceCandidate {
  text: string
  index: number
  paragraphIndex: number
  localIndex: number
  score: number
}

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'also', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between',
  'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her',
  'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is',
  'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not',
  'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves',
  'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were',
  'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'you',
  'your', 'yours', 'yourself', 'yourselves'
])

function countWords(text: string): number {
  return text.match(/\b[\w'-]+\b/g)?.length ?? 0
}

function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? [])
    .map(sentence => sentence.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function getTargetSentenceCount(totalSentences: number, length: SummaryLength): number {
  if (totalSentences <= 2) {
    return totalSentences
  }

  const ratioByLength: Record<SummaryLength, number> = {
    short: 0.22,
    medium: 0.34,
    detailed: 0.5,
  }

  const maxByLength: Record<SummaryLength, number> = {
    short: 4,
    medium: 6,
    detailed: 8,
  }

  const minimumByLength: Record<SummaryLength, number> = {
    short: 1,
    medium: 2,
    detailed: 3,
  }

  const estimated = Math.round(totalSentences * ratioByLength[length])
  return Math.max(minimumByLength[length], Math.min(maxByLength[length], estimated, totalSentences))
}

export function summarizeText(text: string, length: SummaryLength): SummaryResult {
  const normalizedText = text.replace(/\r/g, '').trim()
  if (!normalizedText) {
    throw new Error('Paste some text to summarize')
  }

  const paragraphs = normalizedText.split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean)
  const candidates: SentenceCandidate[] = []

  let globalIndex = 0
  paragraphs.forEach((paragraph, paragraphIndex) => {
    const sentences = splitSentences(paragraph)
    sentences.forEach((sentence, localIndex) => {
      candidates.push({
        text: sentence,
        index: globalIndex,
        paragraphIndex,
        localIndex,
        score: 0,
      })
      globalIndex += 1
    })
  })

  if (candidates.length === 0) {
    throw new Error('Could not detect any readable sentences in that text')
  }

  const frequency = new Map<string, number>()
  normalizedText
    .toLowerCase()
    .match(/\b[a-z0-9'-]{3,}\b/g)
    ?.forEach(word => {
      if (STOP_WORDS.has(word)) {
        return
      }

      frequency.set(word, (frequency.get(word) ?? 0) + 1)
    })

  const keywords = Array.from(frequency.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([term, count]) => ({ term, count }))

  const sentenceCount = candidates.length
  const targetSentenceCount = getTargetSentenceCount(sentenceCount, length)

  const scoredCandidates = candidates.map(candidate => {
    const words = candidate.text.toLowerCase().match(/\b[a-z0-9'-]{2,}\b/g) ?? []
    const keywordScore = words.reduce((sum, word) => sum + (frequency.get(word) ?? 0), 0)
    const uniqueKeywords = new Set(words.filter(word => frequency.has(word))).size
    const wordCount = words.length

    let score = keywordScore

    if (candidate.paragraphIndex === 0) {
      score += 4
    }

    if (candidate.localIndex === 0) {
      score += 3
    }

    if (candidate.localIndex > 0 && candidate.localIndex < 3) {
      score += 1.5
    }

    if (wordCount >= 10 && wordCount <= 28) {
      score += 3
    } else if (wordCount >= 6 && wordCount <= 36) {
      score += 1
    } else {
      score -= 2
    }

    if (candidate.text.includes(':')) {
      score += 0.5
    }

    if (candidate.text.includes('?')) {
      score -= 1
    }

    score += uniqueKeywords * 0.35

    return {
      ...candidate,
      score,
    }
  })

  const selected = scoredCandidates
    .sort((left, right) => right.score - left.score)
    .slice(0, targetSentenceCount)
    .sort((left, right) => left.index - right.index)
    .map(candidate => candidate.text)

  const summary = selected.join(' ')
  const originalWords = countWords(normalizedText)
  const summaryWords = countWords(summary)

  return {
    summary,
    bulletPoints: selected,
    keywords,
    stats: {
      originalWords,
      summaryWords,
      originalSentences: sentenceCount,
      summarySentences: selected.length,
      compressionRatio: originalWords > 0 ? Math.max(0, Math.round((1 - summaryWords / originalWords) * 100)) : 0,
      readingTimeMinutes: Math.max(1, Math.ceil(originalWords / 200)),
    },
  }
}
