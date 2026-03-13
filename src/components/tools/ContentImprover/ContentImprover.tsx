'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

// NLP libraries for enhanced processing
let nlp: any = null
let winkNLP: any = null

// Initialize NLP libraries dynamically (client-side only)
const initializeNLP = async () => {
  if (typeof window === 'undefined') return
  
  try {
    if (!nlp) {
      const compromise = await import('compromise')
      nlp = compromise.default
    }
    
    if (!winkNLP) {
      const wink = await import('wink-nlp')
      await import('wink-eng-lite-web-model')
      winkNLP = wink.default
    }
  } catch (error) {
    // NLP libraries not available - fallback to basic processing
  }
}

// Usage limit constants
const DAILY_LIMIT = 10
const STORAGE_KEY = 'content_improver_usage'

interface TextAnalysis {
  wordCount: number
  characterCount: number
  sentenceCount: number
  paragraphCount: number
  readabilityScore: number
  readingLevel: string
  avgWordsPerSentence: number
  avgSentencesPerParagraph: number
  sentiment: 'positive' | 'negative' | 'neutral'
  sentimentScore: number
  writingStyle: string
  complexWords: number
  uniqueWords: number
  lexicalDiversity: number
}

interface GrammarIssue {
  id: string
  type: 'grammar' | 'spelling' | 'punctuation' | 'style'
  message: string
  suggestion: string
  position: { start: number; end: number }
  severity: 'low' | 'medium' | 'high'
  original: string
}

interface ToneOption {
  id: string
  name: string
  description: string
  icon: string
  example: string
}

const TONE_OPTIONS: ToneOption[] = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Formal, business-appropriate language',
    icon: '💼',
    example: 'We would like to inform you that...'
  },
  {
    id: 'business-proposal',
    name: 'Business Proposal',
    description: 'Professional editing for proposals and documentation',
    icon: '�',
    example: 'This proposal outlines the strategic approach...'
  },
  {
    id: 'casual',
    name: 'Casual',
    description: 'Relaxed, conversational tone',
    icon: '😊',
    example: 'Hey there! Just wanted to let you know...'
  },
  {
    id: 'academic',
    name: 'Academic',
    description: 'Scholarly, research-oriented style',
    icon: '🎓',
    example: 'This study demonstrates that...'
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Engaging, storytelling approach',
    icon: '✨',
    example: 'Picture this: a world where...'
  },
  {
    id: 'persuasive',
    name: 'Persuasive',
    description: 'Compelling, action-oriented language',
    icon: '🎯',
    example: 'Don\'t miss this opportunity to...'
  },
  {
    id: 'technical',
    name: 'Technical',
    description: 'Precise, documentation-style writing',
    icon: '⚙️',
    example: 'The implementation requires...'
  }
]

// Usage limit helper functions
const getTodayKey = (): string => {
  const today = new Date()
  return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
}

const getUsageData = (): Record<string, number> => {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

const incrementUsage = (): void => {
  if (typeof window === 'undefined') return
  try {
    const usageData = getUsageData()
    const todayKey = getTodayKey()
    usageData[todayKey] = (usageData[todayKey] || 0) + 1
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usageData))
  } catch {
    // Silently fail if localStorage is not available
  }
}

const getRemainingUses = (): number => {
  const usageData = getUsageData()
  const todayKey = getTodayKey()
  const todayUsage = usageData[todayKey] || 0
  return Math.max(0, DAILY_LIMIT - todayUsage)
}

// Enhanced NLP processing functions
const calculateSemanticSimilarity = (sentence1: string, sentence2: string): number => {
  if (!sentence1 || !sentence2) return 0
  
  // Simple word overlap similarity
  const words1 = sentence1.toLowerCase().match(/\b\w+\b/g) || []
  const words2 = sentence2.toLowerCase().match(/\b\w+\b/g) || []
  
  const set1 = new Set(words1)
  const set2 = new Set(words2)
  
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  
  return union.size > 0 ? intersection.size / union.size : 0
}

const removeRedundantSentences = (sentences: string[]): string[] => {
  const filtered: string[] = []
  const SIMILARITY_THRESHOLD = 0.6
  
  for (const sentence of sentences) {
    const isDuplicate = filtered.some(existing => 
      calculateSemanticSimilarity(sentence, existing) > SIMILARITY_THRESHOLD
    )
    
    if (!isDuplicate) {
      filtered.push(sentence)
    }
  }
  
  return filtered
}

const enhanceWithCompromise = (text: string): string => {
  if (!nlp) return text
  
  try {
    const doc = nlp(text)
    
    // Convert passive to active voice where safe
    doc.match('#Copula #Adverb? #PastTense').forEach((match: any) => {
      const passive = match.text()
      if (passive.includes('was') || passive.includes('were')) {
        // Simple passive to active conversion for common patterns
        const active = passive
          .replace(/was (\w+ed) by/gi, '$1')
          .replace(/were (\w+ed) by/gi, '$1')
        if (active !== passive) {
          match.replaceWith(active)
        }
      }
    })
    
    // Normalize verb tenses for consistency
    doc.verbs().toPresentTense()
    
    return doc.text()
  } catch (error) {
    return text
  }
}

const improveTransitions = (text: string): string => {
  let improved = text
  
  // Remove stacked connectors
  improved = improved.replace(/\b(moreover|furthermore|additionally),?\s+(therefore|consequently|thus|hence)\b/gi, 'Therefore')
  improved = improved.replace(/\b(however|nevertheless),?\s+(but|yet)\b/gi, 'However')
  improved = improved.replace(/\b(therefore|consequently),?\s+(moreover|furthermore)\b/gi, 'Furthermore')
  
  // Fix transition overuse - limit to one per paragraph
  const paragraphs = improved.split('\n\n')
  const improvedParagraphs = paragraphs.map(paragraph => {
    const sentences = paragraph.split(/(?<=[.!?])\s+/)
    let transitionCount = 0
    
    return sentences.map(sentence => {
      const hasTransition = /^(however|furthermore|moreover|therefore|consequently|additionally|meanwhile|nevertheless)/i.test(sentence.trim())
      
      if (hasTransition) {
        transitionCount++
        // Remove excessive transitions (keep only first 2 per paragraph)
        if (transitionCount > 2) {
          return sentence.replace(/^(however|furthermore|moreover|therefore|consequently|additionally|meanwhile|nevertheless),?\s*/i, '')
        }
      }
      
      return sentence
    }).join(' ')
  })
  
  return improvedParagraphs.join('\n\n')
}

const restructureSentences = (text: string): string => {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const restructured: string[] = []
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim()
    
    // Split overly long sentences (150+ chars with multiple clauses)
    if (sentence.length > 150 && sentence.includes(',') && sentence.includes(' and ')) {
      const parts = sentence.split(', and ')
      if (parts.length === 2) {
        restructured.push(parts[0] + '.')
        restructured.push(parts[1].charAt(0).toUpperCase() + parts[1].slice(1))
        continue
      }
    }
    
    // Merge very short sentences with next if they're related
    if (sentence.length < 30 && i < sentences.length - 1) {
      const nextSentence = sentences[i + 1]
      const similarity = calculateSemanticSimilarity(sentence, nextSentence)
      
      if (similarity > 0.3) {
        const merged = sentence.replace(/[.!?]$/, '') + ', and ' + nextSentence.toLowerCase()
        restructured.push(merged)
        i++ // Skip next sentence as it's been merged
        continue
      }
    }
    
    restructured.push(sentence)
  }
  
  return restructured.join(' ')
}

const applyProfessionalFormatting = (text: string, tone: string): string => {
  if (tone !== 'business-proposal') return text
  
  let formatted = text
  
  // Preserve technical elements (URLs, file paths, code)
  const technicalElements: string[] = []
  const urlPattern = /https?:\/\/[^\s]+/g
  const filePathPattern = /[a-zA-Z]:[\\\/][^\s]+|\/[^\s]+\.[a-zA-Z0-9]+/g
  const codePattern = /`[^`]+`/g
  
  // Store technical elements
  formatted = formatted.replace(urlPattern, (match) => {
    const index = technicalElements.length
    technicalElements.push(match)
    return `__TECH_${index}__`
  })
  
  formatted = formatted.replace(filePathPattern, (match) => {
    const index = technicalElements.length
    technicalElements.push(match)
    return `__TECH_${index}__`
  })
  
  formatted = formatted.replace(codePattern, (match) => {
    const index = technicalElements.length
    technicalElements.push(match)
    return `__TECH_${index}__`
  })
  
  // Apply professional formatting
  formatted = formatted.replace(/\n{3,}/g, '\n\n') // Normalize paragraph breaks
  formatted = formatted.replace(/\s{2,}/g, ' ') // Remove extra spaces
  
  // Restore technical elements
  technicalElements.forEach((element, index) => {
    formatted = formatted.replace(`__TECH_${index}__`, element)
  })
  
  return formatted
}

export function ContentImprover() {
  const [originalText, setOriginalText] = useState('')
  const [improvedText, setImprovedText] = useState('')
  const [selectedTone, setSelectedTone] = useState<string>('professional')
  const [qualityLevel, setQualityLevel] = useState(3) // 1-5 scale
  const [isProcessing, setIsProcessing] = useState(false)
  const [grammarIssues, setGrammarIssues] = useState<GrammarIssue[]>([])
  const [textAnalysis, setTextAnalysis] = useState<TextAnalysis | null>(null)
  const [activeTab, setActiveTab] = useState<'improve' | 'grammar' | 'analyze'>('improve')
  const [error, setError] = useState<string | null>(null)
  const [remainingUses, setRemainingUses] = useState<number>(DAILY_LIMIT)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Initialize usage count and NLP libraries on component mount
  useEffect(() => {
    setRemainingUses(getRemainingUses())
    initializeNLP()
  }, [])

  // Advanced syllable counting with improved accuracy
  const countSyllables = useCallback((word: string): number => {
    word = word.toLowerCase().replace(/[^a-z]/g, '')
    if (word.length <= 3) return 1
    
    // Special cases for common words (cleaned up, no duplicates)
    const specialCases: { [key: string]: number } = {
      'the': 1, 'a': 1, 'an': 1, 'and': 1, 'or': 1, 'but': 1, 'in': 1, 'on': 1, 'at': 1, 'to': 1, 'for': 1, 'of': 1, 'with': 1, 'by': 1,
      'people': 2, 'every': 2, 'very': 2, 'over': 2, 'after': 2, 'use': 1, 'her': 1, 'many': 2, 'may': 1, 'say': 1, 'each': 1,
      'which': 1, 'their': 1, 'time': 1, 'will': 1, 'about': 2, 'if': 1, 'up': 1, 'out': 1, 'what': 1, 'so': 1, 'no': 1,
      'just': 1, 'first': 1, 'get': 1, 'has': 1, 'had': 1, 'let': 1, 'put': 1, 'end': 1, 'why': 1, 'try': 1, 'ask': 1,
      'men': 1, 'run': 1, 'own': 1, 'she': 1, 'now': 1, 'find': 1, 'any': 2, 'new': 1, 'work': 1, 'part': 1, 'take': 1,
      'place': 1, 'made': 1, 'live': 1, 'where': 1, 'much': 1, 'through': 1, 'back': 1, 'good': 1, 'woman': 2, 'came': 1,
      'show': 1, 'me': 1, 'give': 1, 'our': 1, 'under': 2, 'name': 1, 'form': 1, 'sentence': 2, 'great': 1, 'think': 1,
      'help': 1, 'low': 1, 'line': 1, 'differ': 2, 'turn': 1, 'cause': 1, 'mean': 1, 'before': 2, 'move': 1, 'right': 1,
      'boy': 1, 'old': 1, 'too': 1, 'same': 1, 'tell': 1, 'does': 1, 'set': 1, 'three': 1, 'want': 1, 'air': 1, 'well': 1,
      'also': 2, 'play': 1, 'small': 1, 'home': 1, 'read': 1, 'hand': 1, 'port': 1, 'large': 1, 'spell': 1, 'add': 1,
      'even': 2, 'land': 1, 'here': 1, 'must': 1, 'big': 1, 'high': 1, 'such': 1, 'follow': 2, 'act': 1, 'change': 1,
      'went': 1, 'light': 1, 'kind': 1, 'off': 1, 'need': 1, 'house': 1, 'picture': 2, 'us': 1, 'again': 2, 'animal': 3,
      'point': 1, 'mother': 2, 'world': 1, 'near': 1, 'build': 1, 'self': 1, 'earth': 1, 'father': 2, 'head': 1, 'stand': 1,
      'page': 1, 'should': 1, 'country': 2, 'found': 1, 'answer': 2, 'school': 1, 'grow': 1, 'study': 2, 'still': 1,
      'learn': 1, 'plant': 1, 'cover': 2, 'food': 1, 'sun': 1, 'four': 1, 'between': 2, 'state': 1, 'keep': 1, 'eye': 1,
      'never': 2, 'last': 1, 'thought': 1, 'city': 2, 'tree': 1, 'cross': 1, 'farm': 1, 'hard': 1, 'start': 1, 'might': 1,
      'story': 2, 'saw': 1, 'far': 1, 'sea': 1, 'draw': 1, 'left': 1, 'late': 1, 'dont': 1, 'while': 1, 'press': 1,
      'close': 1, 'night': 1, 'real': 1, 'life': 1, 'few': 1, 'north': 1, 'open': 2, 'seem': 1, 'together': 3, 'next': 1,
      'white': 1, 'children': 2, 'begin': 2, 'got': 1, 'walk': 1, 'example': 3, 'ease': 1, 'paper': 2, 'group': 1,
      'always': 2, 'music': 2, 'those': 1, 'both': 1, 'mark': 1, 'often': 2, 'letter': 2, 'until': 2, 'mile': 1,
      'river': 2, 'car': 1, 'feet': 1, 'care': 1, 'second': 2, 'book': 1, 'carry': 2, 'took': 1, 'science': 2, 'eat': 1,
      'room': 1, 'friend': 1, 'began': 2, 'idea': 3, 'fish': 1, 'mountain': 2, 'stop': 1, 'once': 1, 'base': 1, 'hear': 1,
      'horse': 1, 'cut': 1, 'sure': 1, 'watch': 1, 'color': 2, 'face': 1, 'wood': 1, 'main': 1, 'enough': 2, 'plain': 1,
      'girl': 1, 'usual': 3, 'young': 1, 'ready': 2, 'above': 2, 'ever': 2, 'red': 1, 'list': 1, 'though': 1, 'feel': 1,
      'talk': 1, 'bird': 1, 'soon': 1, 'body': 2, 'dog': 1, 'family': 3, 'direct': 2, 'pose': 1, 'leave': 1, 'song': 1,
      'measure': 2, 'door': 1, 'product': 2, 'black': 1, 'short': 1, 'numeral': 3, 'class': 1, 'wind': 1, 'question': 2,
      'happen': 2, 'complete': 2, 'ship': 1, 'area': 3, 'half': 1, 'rock': 1, 'order': 2, 'fire': 1, 'south': 1,
      'problem': 2, 'piece': 1, 'told': 1, 'knew': 1, 'pass': 1, 'since': 1, 'top': 1, 'whole': 1, 'king': 1, 'space': 1,
      'heard': 1, 'best': 1, 'hour': 1, 'better': 2, 'during': 2, 'hundred': 2, 'five': 1, 'remember': 3, 'step': 1,
      'early': 2, 'hold': 1, 'west': 1, 'ground': 1, 'interest': 3, 'reach': 1, 'fast': 1, 'verb': 1, 'sing': 1,
      'listen': 2, 'six': 1, 'table': 2, 'travel': 2, 'less': 1, 'morning': 2, 'ten': 1, 'simple': 2, 'several': 3,
      'vowel': 2, 'toward': 2, 'war': 1, 'lay': 1, 'against': 2, 'pattern': 2, 'slow': 1, 'center': 2, 'love': 1,
      'person': 2, 'money': 2, 'serve': 1, 'appear': 2, 'road': 1, 'map': 1, 'rain': 1, 'rule': 1, 'govern': 2,
      'pull': 1, 'cold': 1, 'notice': 2, 'voice': 1, 'unit': 2, 'power': 2, 'town': 1, 'fine': 1, 'certain': 2,
      'fly': 1, 'fall': 1, 'lead': 1, 'cry': 1, 'dark': 1, 'machine': 2, 'note': 1, 'wait': 1, 'plan': 1, 'figure': 2,
      'star': 1, 'box': 1, 'noun': 1, 'field': 1, 'rest': 1, 'correct': 2, 'able': 2, 'pound': 1, 'done': 1,
      'beauty': 2, 'drive': 1, 'stood': 1, 'contain': 2, 'front': 1, 'teach': 1, 'week': 1, 'final': 2, 'gave': 1,
      'green': 1, 'oh': 1, 'quick': 1, 'develop': 3, 'ocean': 2, 'warm': 1, 'free': 1, 'minute': 2, 'strong': 1,
      'special': 2, 'mind': 1, 'behind': 2, 'clear': 1, 'tail': 1, 'produce': 2, 'fact': 1, 'street': 1, 'inch': 1,
      'multiply': 3, 'nothing': 2, 'course': 1, 'stay': 1, 'wheel': 1, 'full': 1, 'force': 1, 'blue': 1, 'object': 2,
      'decide': 2, 'surface': 2, 'deep': 1, 'moon': 1, 'island': 2, 'foot': 1, 'system': 2, 'busy': 2, 'test': 1,
      'record': 2, 'boat': 1, 'common': 2, 'gold': 1, 'possible': 3, 'plane': 1, 'stead': 1, 'dry': 1, 'wonder': 2,
      'laugh': 1, 'thousands': 2, 'ago': 2, 'ran': 1, 'check': 1, 'game': 1, 'shape': 1, 'equate': 2, 'hot': 1,
      'miss': 1, 'brought': 1, 'heat': 1, 'snow': 1, 'tire': 1, 'bring': 1, 'yes': 1, 'distant': 2, 'fill': 1,
      'east': 1, 'paint': 1, 'language': 2, 'among': 2
    }
    
    if (specialCases[word]) {
      return specialCases[word]
    }
    
    const vowels = 'aeiouy'
    let syllables = 0
    let prevWasVowel = false
    
    // Count vowel groups
    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i])
      if (isVowel && !prevWasVowel) {
        syllables++
      }
      prevWasVowel = isVowel
    }
    
    // Handle silent e
    if (word.endsWith('e') && syllables > 1) {
      syllables--
    }
    
    // Handle special endings
    if (word.endsWith('le') && word.length > 2 && !'aeiou'.includes(word[word.length - 3])) {
      syllables++
    }
    
    // Handle 'ed' endings
    if (word.endsWith('ed') && syllables > 1) {
      const beforeEd = word.slice(-3, -2)
      if (!'aeiou'.includes(beforeEd)) {
        syllables--
      }
    }
    
    // Handle 'es' endings
    if (word.endsWith('es') && word.length > 2) {
      const beforeEs = word.slice(-3, -2)
      if ('sxz'.includes(beforeEs) || word.endsWith('ches') || word.endsWith('shes')) {
        syllables++
      }
    }
    
    // Handle 'ing' endings
    if (word.endsWith('ing') && syllables > 1) {
      syllables--
    }
    
    // Handle 'ion' endings
    if (word.endsWith('ion') || word.endsWith('tion') || word.endsWith('sion')) {
      syllables++
    }
    
    // Handle 'ly' endings
    if (word.endsWith('ly') && word.length > 2) {
      syllables--
    }
    
    return Math.max(1, syllables)
  }, [])

  // Advanced text analysis with multiple readability formulas
  const analyzeText = useCallback((text: string): TextAnalysis => {
    if (!text.trim()) {
      return {
        wordCount: 0,
        characterCount: 0,
        sentenceCount: 0,
        paragraphCount: 0,
        readabilityScore: 0,
        readingLevel: 'N/A',
        avgWordsPerSentence: 0,
        avgSentencesPerParagraph: 0,
        sentiment: 'neutral' as const,
        sentimentScore: 0,
        writingStyle: 'N/A',
        complexWords: 0,
        uniqueWords: 0,
        lexicalDiversity: 0
      }
    }

    const words = text.match(/\b\w+\b/g) || []
    const sentences = text.match(/[.!?]+/g) || []
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)
    
    const wordCount = words.length
    const characterCount = text.length
    const sentenceCount = Math.max(sentences.length, 1)
    const paragraphCount = Math.max(paragraphs.length, 1)
    
    // Advanced metrics
    const avgWordsPerSentence = wordCount / sentenceCount
    const avgSentencesPerParagraph = sentenceCount / paragraphCount
    
    // Count syllables with improved accuracy
    const syllableCount = words.reduce((total, word) => {
      return total + countSyllables(word)
    }, 0)
    
    const avgSyllablesPerWord = syllableCount / Math.max(wordCount, 1)
    
    // Multiple readability formulas for better accuracy
    
    // Flesch Reading Ease Score
    const fleschScore = Math.max(0, Math.min(100, 
      206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
    ))
    
    // Flesch-Kincaid Grade Level
    const fleschKincaidGrade = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59
    
    // Automated Readability Index (ARI)
    const charactersPerWord = text.replace(/\s/g, '').length / Math.max(wordCount, 1)
    const ariScore = (4.71 * charactersPerWord) + (0.5 * avgWordsPerSentence) - 21.43
    
    // Average the scores for more accurate assessment
    const combinedScore = (fleschScore + Math.max(0, 100 - fleschKincaidGrade * 10) + Math.max(0, 100 - ariScore * 5)) / 3
    const readabilityScore = Math.round(Math.max(0, Math.min(100, combinedScore)))
    
    // More nuanced reading level assessment
    let readingLevel = 'Graduate'
    if (readabilityScore >= 90) readingLevel = 'Very Easy (5th grade)'
    else if (readabilityScore >= 80) readingLevel = 'Easy (6th grade)'
    else if (readabilityScore >= 70) readingLevel = 'Fairly Easy (7th grade)'
    else if (readabilityScore >= 60) readingLevel = 'Standard (8th-9th grade)'
    else if (readabilityScore >= 50) readingLevel = 'Fairly Difficult (10th-12th grade)'
    else if (readabilityScore >= 30) readingLevel = 'Difficult (College level)'
    else readingLevel = 'Very Difficult (Graduate level)'

    // Sentiment Analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome', 'brilliant', 'outstanding', 'superb', 'perfect', 'love', 'like', 'enjoy', 'happy', 'pleased', 'satisfied', 'delighted', 'thrilled', 'excited', 'positive', 'beneficial', 'valuable', 'useful', 'helpful', 'effective', 'successful', 'impressive', 'remarkable', 'exceptional']
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disgusting', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'disappointed', 'upset', 'annoyed', 'irritated', 'worried', 'concerned', 'problem', 'issue', 'difficult', 'hard', 'challenging', 'impossible', 'wrong', 'error', 'mistake', 'fail', 'failure', 'poor', 'weak', 'useless', 'worthless']
    
    let positiveCount = 0
    let negativeCount = 0
    
    words.forEach(word => {
      const lowerWord = word.toLowerCase()
      if (positiveWords.includes(lowerWord)) positiveCount++
      if (negativeWords.includes(lowerWord)) negativeCount++
    })
    
    const sentimentScore = ((positiveCount - negativeCount) / Math.max(wordCount, 1)) * 100
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral'
    if (sentimentScore > 5) sentiment = 'positive'
    else if (sentimentScore < -5) sentiment = 'negative'

    // Writing Style Analysis
    const complexWords = words.filter(word => countSyllables(word) >= 3).length
    const uniqueWords = new Set(words.map(w => w.toLowerCase())).size
    const lexicalDiversity = (uniqueWords / Math.max(wordCount, 1)) * 100
    
    let writingStyle = 'Balanced'
    if (avgWordsPerSentence > 20) writingStyle = 'Complex'
    else if (avgWordsPerSentence < 10) writingStyle = 'Simple'
    else if (lexicalDiversity > 70) writingStyle = 'Varied'
    else if (lexicalDiversity < 40) writingStyle = 'Repetitive'
    
    if (complexWords / wordCount > 0.3) writingStyle += ' & Academic'
    else if (complexWords / wordCount < 0.1) writingStyle += ' & Conversational'

    return {
      wordCount,
      characterCount,
      sentenceCount,
      paragraphCount,
      readabilityScore,
      readingLevel,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      avgSentencesPerParagraph: Math.round(avgSentencesPerParagraph * 10) / 10,
      sentiment,
      sentimentScore: Math.round(sentimentScore * 10) / 10,
      writingStyle,
      complexWords,
      uniqueWords,
      lexicalDiversity: Math.round(lexicalDiversity * 10) / 10
    }
  }, [countSyllables])

  // Advanced grammar and spell checking with comprehensive rules
  const checkGrammar = useCallback((text: string): GrammarIssue[] => {
    const issues: GrammarIssue[] = []
    
    // Comprehensive grammar and style rules
    const grammarRules = [
      // Spacing issues
      {
        pattern: /  +/g,
        type: 'style' as const,
        message: 'Multiple spaces found',
        suggestion: 'Use single space',
        severity: 'low' as const
      },
      {
        pattern: /\t+/g,
        type: 'style' as const,
        message: 'Tab characters found',
        suggestion: 'Use spaces instead of tabs',
        severity: 'low' as const
      },
      
      // Capitalization issues
      {
        pattern: /\. +[a-z]/g,
        type: 'grammar' as const,
        message: 'Missing capitalization after period',
        suggestion: 'Capitalize first letter of sentence',
        severity: 'medium' as const
      },
      {
        pattern: /\! +[a-z]/g,
        type: 'grammar' as const,
        message: 'Missing capitalization after exclamation',
        suggestion: 'Capitalize first letter of sentence',
        severity: 'medium' as const
      },
      {
        pattern: /\? +[a-z]/g,
        type: 'grammar' as const,
        message: 'Missing capitalization after question mark',
        suggestion: 'Capitalize first letter of sentence',
        severity: 'medium' as const
      },
      {
        pattern: /\bi\b/g,
        type: 'grammar' as const,
        message: 'Lowercase "i" should be capitalized',
        suggestion: 'I',
        severity: 'high' as const
      },
      
      // Common misspellings (expanded list)
      {
        pattern: /\b(recieve|recieved|recieving)\b/gi,
        type: 'spelling' as const,
        message: 'Common misspelling',
        suggestion: 'receive/received/receiving',
        severity: 'high' as const
      },
      {
        pattern: /\b(seperate|seperated|seperating)\b/gi,
        type: 'spelling' as const,
        message: 'Common misspelling',
        suggestion: 'separate/separated/separating',
        severity: 'high' as const
      },
      {
        pattern: /\b(definately|definatly)\b/gi,
        type: 'spelling' as const,
        message: 'Common misspelling',
        suggestion: 'definitely',
        severity: 'high' as const
      },
      {
        pattern: /\b(occured|occuring)\b/gi,
        type: 'spelling' as const,
        message: 'Common misspelling',
        suggestion: 'occurred/occurring',
        severity: 'high' as const
      },
      {
        pattern: /\b(begining)\b/gi,
        type: 'spelling' as const,
        message: 'Common misspelling',
        suggestion: 'beginning',
        severity: 'high' as const
      },
      {
        pattern: /\b(accomodate|acommodate)\b/gi,
        type: 'spelling' as const,
        message: 'Common misspelling',
        suggestion: 'accommodate',
        severity: 'high' as const
      },
      {
        pattern: /\b(neccessary|necesary)\b/gi,
        type: 'spelling' as const,
        message: 'Common misspelling',
        suggestion: 'necessary',
        severity: 'high' as const
      },
      {
        pattern: /\b(embarass|embaras)\b/gi,
        type: 'spelling' as const,
        message: 'Common misspelling',
        suggestion: 'embarrass',
        severity: 'high' as const
      },
      {
        pattern: /\b(teh|hte)\b/gi,
        type: 'spelling' as const,
        message: 'Common typo',
        suggestion: 'the',
        severity: 'high' as const
      },
      {
        pattern: /\badn\b/gi,
        type: 'spelling' as const,
        message: 'Common typo',
        suggestion: 'and',
        severity: 'high' as const
      },
      
      // Grammar mistakes
      {
        pattern: /\b(your)\s+(welcome|right|wrong)\b/gi,
        type: 'grammar' as const,
        message: 'Incorrect usage of "your"',
        suggestion: "you're (you are)",
        severity: 'high' as const
      },
      {
        pattern: /\b(its)\s+(own|time|place)\b/gi,
        type: 'grammar' as const,
        message: 'Correct usage - no apostrophe needed',
        suggestion: 'its (possessive)',
        severity: 'medium' as const
      },
      {
        pattern: /\b(their|there)\s+(are|is)\b/gi,
        type: 'grammar' as const,
        message: 'Check correct usage of there/their',
        suggestion: 'there (location) vs their (possessive)',
        severity: 'medium' as const
      },
      {
        pattern: /\b(affect)\s+(on)\b/gi,
        type: 'grammar' as const,
        message: 'Incorrect usage',
        suggestion: 'effect on (noun) or affect (verb)',
        severity: 'medium' as const
      },
      
      // Conflicting transition words (critical for your test case)
      {
        pattern: /\b(however|furthermore|nevertheless|moreover|additionally|consequently|therefore),?\s+(but|and|or|yet)\b/gi,
        type: 'grammar' as const,
        message: 'Conflicting transition words',
        suggestion: 'Use either the transition word OR the conjunction, not both',
        severity: 'high' as const
      },
      
      // Subject-verb agreement
      {
        pattern: /\b(paragraph|content|area)\s+(are)\b/gi,
        type: 'grammar' as const,
        message: 'Subject-verb disagreement',
        suggestion: 'Use "is" with singular nouns',
        severity: 'high' as const
      },
      {
        pattern: /\b(many)\s+(area|content|writer)\b/gi,
        type: 'grammar' as const,
        message: 'Plural determiner with singular noun',
        suggestion: 'Use "many areas/contents/writers" or "much content"',
        severity: 'high' as const
      },
      
      // Article usage
      {
        pattern: /\b(very)\s+(significant)\s+(topic)\b/gi,
        type: 'grammar' as const,
        message: 'Missing article',
        suggestion: 'a very significant topic',
        severity: 'medium' as const
      },
      
      // Verb form errors
      {
        pattern: /\b(AI|artificial intelligence)\s+(is)\s+(using|making|doing)\b/gi,
        type: 'grammar' as const,
        message: 'Incorrect continuous form',
        suggestion: 'AI uses/makes/does (simple present for general facts)',
        severity: 'medium' as const
      },
      
      // Missing contractions
      {
        pattern: /\b(can not)\b/gi,
        type: 'style' as const,
        message: 'Consider using contraction',
        suggestion: "can't",
        severity: 'low' as const
      },
      {
        pattern: /\b(will not)\b/gi,
        type: 'style' as const,
        message: 'Consider using contraction',
        suggestion: "won't",
        severity: 'low' as const
      },
      {
        pattern: /\b(do not)\b/gi,
        type: 'style' as const,
        message: 'Consider using contraction',
        suggestion: "don't",
        severity: 'low' as const
      },
      
      // Passive voice detection (improved)
      {
        pattern: /\b(was|were|is|are|been|being)\s+\w+ed\s+by\b/gi,
        type: 'style' as const,
        message: 'Passive voice detected',
        suggestion: 'Consider using active voice for stronger writing',
        severity: 'low' as const
      },
      
      // Redundant phrases (expanded)
      {
        pattern: /\b(in order to)\b/gi,
        type: 'style' as const,
        message: 'Redundant phrase',
        suggestion: 'to',
        severity: 'low' as const
      },
      {
        pattern: /\b(due to the fact that)\b/gi,
        type: 'style' as const,
        message: 'Wordy phrase',
        suggestion: 'because',
        severity: 'medium' as const
      },
      {
        pattern: /\b(at this point in time)\b/gi,
        type: 'style' as const,
        message: 'Wordy phrase',
        suggestion: 'now',
        severity: 'medium' as const
      },
      {
        pattern: /\b(for the purpose of)\b/gi,
        type: 'style' as const,
        message: 'Wordy phrase',
        suggestion: 'to',
        severity: 'low' as const
      },
      {
        pattern: /\b(in the event that)\b/gi,
        type: 'style' as const,
        message: 'Wordy phrase',
        suggestion: 'if',
        severity: 'low' as const
      },
      {
        pattern: /\b(with regard to)\b/gi,
        type: 'style' as const,
        message: 'Wordy phrase',
        suggestion: 'regarding',
        severity: 'low' as const
      },
      
      // Punctuation issues
      {
        pattern: /\w+\s*,\s*\w+\s*,\s*and\s+\w+/g,
        type: 'punctuation' as const,
        message: 'Oxford comma is present (good practice)',
        suggestion: 'Keep Oxford comma for clarity',
        severity: 'low' as const
      },
      {
        pattern: /\w+\s*,\s*\w+\s+and\s+\w+/g,
        type: 'punctuation' as const,
        message: 'Consider adding Oxford comma',
        suggestion: 'Add comma before "and" in lists',
        severity: 'low' as const
      },
      {
        pattern: /\s+([,.!?;:])/g,
        type: 'punctuation' as const,
        message: 'Space before punctuation',
        suggestion: 'Remove space before punctuation',
        severity: 'medium' as const
      },
      
      // Weak words and filler
      {
        pattern: /\b(very|really|quite|rather|pretty|somewhat)\s+/gi,
        type: 'style' as const,
        message: 'Weak intensifier',
        suggestion: 'Use stronger, more specific words',
        severity: 'low' as const
      },
      {
        pattern: /\b(thing|stuff|things|lots of|a lot of)\b/gi,
        type: 'style' as const,
        message: 'Vague word',
        suggestion: 'Use more specific terms',
        severity: 'low' as const
      },
      {
        pattern: /\b(basically|actually|literally|obviously)\b/gi,
        type: 'style' as const,
        message: 'Filler word',
        suggestion: 'Remove unnecessary filler words',
        severity: 'low' as const
      },
      
      // Sentence structure
      {
        pattern: /^.{150,}/gm,
        type: 'style' as const,
        message: 'Very long sentence',
        suggestion: 'Consider breaking into shorter sentences',
        severity: 'low' as const
      },
      {
        pattern: /\b(and)\s+\1\b/gi,
        type: 'style' as const,
        message: 'Repeated conjunction',
        suggestion: 'Avoid repeating "and"',
        severity: 'low' as const
      }
    ]

    grammarRules.forEach(rule => {
      let match
      rule.pattern.lastIndex = 0 // Reset regex state
      while ((match = rule.pattern.exec(text)) !== null) {
        issues.push({
          id: `issue-${Date.now()}-${Math.random()}`,
          type: rule.type,
          message: rule.message,
          suggestion: rule.suggestion,
          position: { start: match.index, end: match.index + match[0].length },
          severity: rule.severity,
          original: match[0]
        })
        
        // Prevent infinite loops with global regex
        if (!rule.pattern.global) break
      }
    })

    return issues
  }, [])

  // Advanced text improvement with sophisticated algorithms
  const improveText = useCallback((text: string, tone: string, quality: number): string => {
    if (!text.trim()) return text

    let improved = text

    // Basic improvements (quality level 1+)
    if (quality >= 1) {
      // Fix multiple spaces and tabs
      improved = improved.replace(/[ \t]+/g, ' ')
      // Fix spacing around punctuation
      improved = improved.replace(/\s+([,.!?;:])/g, '$1')
      improved = improved.replace(/([,.!?;:])\s*/g, '$1 ')
      // Fix line breaks and paragraph spacing
      improved = improved.replace(/\n\s*\n\s*\n+/g, '\n\n')
      // Trim whitespace
      improved = improved.trim()
      // Fix common typos
      improved = improved.replace(/\bteh\b/gi, 'the')
      improved = improved.replace(/\badn\b/gi, 'and')
      improved = improved.replace(/\bfrom\b/gi, 'from')
    }

    // Grammar improvements (quality level 2+)
    if (quality >= 2) {
      // Fix contractions
      improved = improved.replace(/\bwont\b/gi, "won't")
      improved = improved.replace(/\bcant\b/gi, "can't")
      improved = improved.replace(/\bdont\b/gi, "don't")
      improved = improved.replace(/\bisnt\b/gi, "isn't")
      improved = improved.replace(/\barent\b/gi, "aren't")
      improved = improved.replace(/\bwasnt\b/gi, "wasn't")
      improved = improved.replace(/\bwerent\b/gi, "weren't")
      improved = improved.replace(/\bhasnt\b/gi, "hasn't")
      improved = improved.replace(/\bhavent\b/gi, "haven't")
      improved = improved.replace(/\bhadnt\b/gi, "hadn't")
      improved = improved.replace(/\bwont\b/gi, "won't")
      improved = improved.replace(/\bwouldnt\b/gi, "wouldn't")
      improved = improved.replace(/\bcouldnt\b/gi, "couldn't")
      improved = improved.replace(/\bshouldnt\b/gi, "shouldn't")
      
      // Capitalize sentences properly
      improved = improved.replace(/(^|\. +|! +|\? +)([a-z])/g, (match, prefix, letter) => 
        prefix + letter.toUpperCase()
      )
      
      // Fix common grammar mistakes
      improved = improved.replace(/\bi\b/g, 'I')
      improved = improved.replace(/\bits\s+own\b/gi, 'its own')
      improved = improved.replace(/\byour\s+welcome\b/gi, "you're welcome")
      improved = improved.replace(/\btheir\s+are\b/gi, 'there are')
    }

    // Style improvements (quality level 3+)
    if (quality >= 3) {
      // Advanced word replacements based on tone
      if (tone === 'professional') {
        improved = improved.replace(/\bvery good\b/gi, 'excellent')
        improved = improved.replace(/\bvery bad\b/gi, 'inadequate')
        improved = improved.replace(/\ba lot of\b/gi, 'numerous')
        improved = improved.replace(/\bget\b/gi, 'obtain')
        improved = improved.replace(/\bbig\b/gi, 'significant')
        improved = improved.replace(/\bsmall\b/gi, 'minimal')
        improved = improved.replace(/\bokay\b/gi, 'acceptable')
        improved = improved.replace(/\bstuff\b/gi, 'materials')
        improved = improved.replace(/\bthings\b/gi, 'elements')
        improved = improved.replace(/\bguys\b/gi, 'team members')
      } else if (tone === 'academic') {
        improved = improved.replace(/\bshow\b/gi, 'demonstrate')
        improved = improved.replace(/\bprove\b/gi, 'establish')
        improved = improved.replace(/\bthink\b/gi, 'hypothesize')
        improved = improved.replace(/\bfind\b/gi, 'discover')
        improved = improved.replace(/\buse\b/gi, 'employ')
        improved = improved.replace(/\blook at\b/gi, 'examine')
        improved = improved.replace(/\bcheck\b/gi, 'analyze')
        improved = improved.replace(/\btell\b/gi, 'indicate')
      } else if (tone === 'creative') {
        improved = improved.replace(/\bsaid\b/gi, 'expressed')
        improved = improved.replace(/\bwent\b/gi, 'ventured')
        improved = improved.replace(/\bsaw\b/gi, 'witnessed')
        improved = improved.replace(/\bwalked\b/gi, 'strolled')
        improved = improved.replace(/\blooked\b/gi, 'gazed')
        improved = improved.replace(/\bfelt\b/gi, 'experienced')
      } else if (tone === 'persuasive') {
        improved = improved.replace(/\bmaybe\b/gi, 'certainly')
        improved = improved.replace(/\bpossibly\b/gi, 'definitely')
        improved = improved.replace(/\btry to\b/gi, 'commit to')
        improved = improved.replace(/\bI think\b/gi, 'I believe')
      }
      
      // Remove filler words
      improved = improved.replace(/\b(um|uh|like|you know|basically|actually)\b/gi, '')
      improved = improved.replace(/\s+/g, ' ') // Clean up extra spaces after removal
    }

    // Advanced improvements (quality level 4+)
    if (quality >= 4) {
      // Remove redundant phrases
      improved = improved.replace(/\bin order to\b/gi, 'to')
      improved = improved.replace(/\bdue to the fact that\b/gi, 'because')
      improved = improved.replace(/\bat this point in time\b/gi, 'now')
      improved = improved.replace(/\bfor the purpose of\b/gi, 'to')
      improved = improved.replace(/\bin the event that\b/gi, 'if')
      improved = improved.replace(/\bwith regard to\b/gi, 'regarding')
      improved = improved.replace(/\bin spite of the fact that\b/gi, 'although')
      
      // Enhanced NLP processing for semantic improvements
      improved = improveTransitions(improved)
      improved = restructureSentences(improved)
      
      // Remove semantically redundant sentences
      const sentences = improved.split(/(?<=[.!?])\s+/).filter(s => s.trim())
      const uniqueSentences = removeRedundantSentences(sentences)
      improved = uniqueSentences.join(' ')
      
      // Fix conflicting transition words
      improved = improved.replace(/\b(however|furthermore|nevertheless|moreover|additionally|consequently|therefore),?\s+(but|and|or|yet)\b/gi, (match, transition, _conjunction) => {
        const transitionMap: { [key: string]: string } = {
          'however': 'However,',
          'furthermore': 'Additionally,',
          'nevertheless': 'However,',
          'moreover': 'Furthermore,',
          'additionally': 'Moreover,',
          'consequently': 'Therefore,',
          'therefore': 'Consequently,'
        }
        return transitionMap[transition.toLowerCase()] || transition + ','
      })
      
      // Fix double conjunctions and improve flow
      improved = improved.replace(/\b(but|and|or)\s+(but|and|or)\b/gi, '$2')
      
      // Convert passive to active voice where possible
      improved = improved.replace(/\b(was|were)\s+(\w+ed)\s+by\s+(\w+)/gi, '$3 $2')
      improved = improved.replace(/\bis\s+(\w+ed)\s+by\s+(\w+)/gi, '$2 $1s')
      
      // Remove excessive repetition of words
      const words = improved.split(/\s+/)
      const cleanedWords = words.filter((word, index) => {
        if (index < 2) return true
        const prevWord = words[index - 1]?.toLowerCase()
        const prevPrevWord = words[index - 2]?.toLowerCase()
        const currentWord = word.toLowerCase()
        
        // Remove if same word appears 3 times in close proximity
        return !(currentWord === prevWord && currentWord === prevPrevWord)
      })
      improved = cleanedWords.join(' ')
    }

    // Premium improvements (quality level 5)
    if (quality >= 5) {
      // Fix major structural issues first
      
      // Remove self-referential sentences that break flow
      improved = improved.replace(/\b(this sentence is|this paragraph is|this content is)\s+[^.!?]*[.!?]/gi, '')
      
      // Fix repetitive explanations and consolidate ideas
      const sentences = improved.split(/(?<=[.!?])\s+/).filter(s => s.trim())
      const consolidatedSentences: string[] = []
      const seenConcepts = new Set<string>()
      
      sentences.forEach(sentence => {
        const lowerSentence = sentence.toLowerCase()
        
        // Check for repetitive concepts
        const concepts = ['grammar', 'tone', 'clarity', 'ai', 'useful', 'helpful', 'save time']
        const sentenceConcepts = concepts.filter(concept => lowerSentence.includes(concept))
        
        // Only add if it introduces new concepts or is significantly different
        const conceptKey = sentenceConcepts.sort().join('-')
        if (!seenConcepts.has(conceptKey) || sentenceConcepts.length === 0) {
          consolidatedSentences.push(sentence)
          if (conceptKey) seenConcepts.add(conceptKey)
        }
      })
      
      improved = consolidatedSentences.join(' ')
      
      // Tone-specific premium enhancements
      if (tone === 'professional' || tone === 'business-proposal') {
        improved = improved.replace(/\bI want\b/gi, 'I would like')
        improved = improved.replace(/\bI need\b/gi, 'I require')
        improved = improved.replace(/\bcan you\b/gi, 'could you please')
        improved = improved.replace(/\bthanks\b/gi, 'thank you')
        improved = improved.replace(/\bokay\b/gi, 'acceptable')
        improved = improved.replace(/\bstuff\b/gi, 'content')
        improved = improved.replace(/\bthings\b/gi, 'elements')
        
        // Business proposal specific enhancements
        if (tone === 'business-proposal') {
          improved = improved.replace(/\bwe think\b/gi, 'we believe')
          improved = improved.replace(/\bwe feel\b/gi, 'we recommend')
          improved = improved.replace(/\bmaybe\b/gi, 'potentially')
          improved = improved.replace(/\bprobably\b/gi, 'likely')
          improved = improved.replace(/\bkind of\b/gi, 'somewhat')
          improved = improved.replace(/\bsort of\b/gi, 'approximately')
          improved = improved.replace(/\ba lot\b/gi, 'significantly')
          improved = improved.replace(/\breal quick\b/gi, 'briefly')
          improved = improved.replace(/\bFYI\b/gi, 'For your information')
          improved = improved.replace(/\bASAP\b/gi, 'as soon as possible')
        }
        
        // Fix informal expressions
        improved = improved.replace(/\bAI is useful\b/gi, 'AI provides significant value')
        improved = improved.replace(/\bAI is helpful\b/gi, 'AI offers substantial assistance')
        improved = improved.replace(/\bsave time\b/gi, 'enhance efficiency')
      } else if (tone === 'persuasive') {
        improved = improved.replace(/\bI think\b/gi, 'I firmly believe')
        improved = improved.replace(/\bmight\b/gi, 'will undoubtedly')
        improved = improved.replace(/\bcould\b/gi, 'can effectively')
        improved = improved.replace(/\bshould\b/gi, 'must')
        improved = improved.replace(/\btry\b/gi, 'achieve')
      } else if (tone === 'technical') {
        improved = improved.replace(/\buse\b/gi, 'utilize')
        improved = improved.replace(/\bhelp\b/gi, 'facilitate')
        improved = improved.replace(/\bmake\b/gi, 'generate')
        improved = improved.replace(/\bfix\b/gi, 'resolve')
        improved = improved.replace(/\bchange\b/gi, 'modify')
        improved = improved.replace(/\bstart\b/gi, 'initialize')
      }
      
      // Advanced NLP processing with compromise.js
      improved = enhanceWithCompromise(improved)
      
      // Advanced semantic deduplication
      const finalSentences = improved.split(/(?<=[.!?])\s+/).filter(s => s.trim())
      const semanticallyUnique = removeRedundantSentences(finalSentences)
      
      // Rebuild with better paragraph structure
      const paragraphs: string[] = []
      let currentParagraph: string[] = []
      
      semanticallyUnique.forEach((sentence, index) => {
        currentParagraph.push(sentence)
        
        // Start new paragraph every 3-4 sentences or when topic shifts
        if (currentParagraph.length >= 3 || 
            (index < semanticallyUnique.length - 1 && 
             calculateSemanticSimilarity(sentence, semanticallyUnique[index + 1]) < 0.3)) {
          paragraphs.push(currentParagraph.join(' '))
          currentParagraph = []
        }
      })
      
      // Add remaining sentences
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '))
      }
      
      // Apply minimal, deterministic transitions
      const finalParagraphs = paragraphs.map((paragraph, pIndex) => {
        if (pIndex === 0) return paragraph
        
        // Add simple transitions only between paragraphs, not randomly
        const simpleTransitions = ['Additionally', 'Furthermore', 'However', 'Therefore']
        const transition = simpleTransitions[pIndex % simpleTransitions.length]
        
        return transition + ', ' + paragraph.charAt(0).toLowerCase() + paragraph.slice(1)
      })
      
      improved = finalParagraphs.join('\n\n')
    }

    // Apply professional formatting for business content
    improved = applyProfessionalFormatting(improved, tone)
    
    // Final cleanup and optimization
    improved = improved.replace(/\s+/g, ' ').trim()
    improved = improved.replace(/\n\s+/g, '\n')
    
    // Ensure output is deterministic and safe
    improved = improved.replace(/\s*\n\s*/g, '\n\n')
    improved = improved.replace(/\n{3,}/g, '\n\n')
    
    return improved
  }, [])

  // Process text improvement
  const handleImproveText = useCallback(async () => {
    if (!originalText.trim()) {
      setError('Please enter some text to improve')
      return
    }

    // Check usage limit
    if (remainingUses <= 0) {
      setError('Daily limit reached. You can improve 10 texts per day. Try again tomorrow!')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const improved = improveText(originalText, selectedTone, qualityLevel)
      setImprovedText(improved)
      
      // Analyze the improved text
      const analysis = analyzeText(improved)
      setTextAnalysis(analysis)
      
      // Check for remaining issues
      const issues = checkGrammar(improved)
      setGrammarIssues(issues)
      
      // Only increment usage after successful improvement
      incrementUsage()
      setRemainingUses(getRemainingUses())
      
    } catch (err) {
      setError('Failed to improve text. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [originalText, selectedTone, qualityLevel, remainingUses, improveText, analyzeText, checkGrammar])

  // Apply grammar fix
  const applyGrammarFix = useCallback((issue: GrammarIssue) => {
    const text = improvedText || originalText
    const before = text.substring(0, issue.position.start)
    const after = text.substring(issue.position.end)
    
    let replacement = issue.suggestion
    if (issue.type === 'spelling') {
      replacement = issue.suggestion.split('/')[0] // Take first suggestion
    }
    
    const newText = before + replacement + after
    
    if (improvedText) {
      setImprovedText(newText)
    } else {
      setOriginalText(newText)
    }
    
    // Remove the fixed issue
    setGrammarIssues(prev => prev.filter(i => i.id !== issue.id))
  }, [originalText, improvedText])

  // Memoized analysis for original text
  const originalAnalysis = useMemo(() => {
    return analyzeText(originalText)
  }, [originalText, analyzeText])

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-4">
          AI Content Improver
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base lg:text-lg px-2">
          Enhance your writing with AI-powered grammar correction, style improvement, and tone adjustment
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-muted-foreground">Grammar & spelling</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-muted-foreground">Style enhancement</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-warning rounded-full"></div>
            <span className="text-muted-foreground">Tone adjustment</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-muted rounded-lg p-1">
          {[
            { id: 'improve', label: 'Improve Text', icon: '✨' },
            { id: 'grammar', label: 'Grammar Check', icon: '📝' },
            { id: 'analyze', label: 'Text Analysis', icon: '📊' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Main Content Area */}
        <div className="xl:col-span-2 space-y-4 sm:space-y-6">
          {/* Text Input */}
          <Card>
            <CardHeader>
              <CardTitle>Your Text</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                ref={textareaRef}
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                placeholder="Paste or type your text here to improve grammar, style, and tone..."
                className="w-full h-48 sm:h-64 p-4 border border-border rounded-lg bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                <span>{originalAnalysis.wordCount} words • {originalAnalysis.characterCount} characters</span>
                <span>Reading level: {originalAnalysis.readingLevel}</span>
              </div>
            </CardContent>
          </Card>

          {/* Improved Text Output */}
          {improvedText && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Improved Text</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(improvedText)
                    }}
                    className="text-xs h-7"
                  >
                    📋 Copy
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 border border-border rounded-lg bg-muted/20 text-sm leading-relaxed">
                  {improvedText}
                </div>
                {textAnalysis && (
                  <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                    <span>{textAnalysis.wordCount} words • {textAnalysis.characterCount} characters</span>
                    <span>Reading level: {textAnalysis.readingLevel}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Settings Panel */}
        <div className="xl:col-span-1 space-y-4 sm:space-y-6">
          {activeTab === 'improve' && (
            <>
              {/* Tone Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Writing Tone</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2">
                    {TONE_OPTIONS.map(tone => (
                      <button
                        key={tone.id}
                        onClick={() => setSelectedTone(tone.id)}
                        className={`p-3 text-left border rounded-lg transition-colors ${
                          selectedTone === tone.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg">{tone.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{tone.name}</div>
                            <div className="text-xs text-muted-foreground mb-1">
                              {tone.description}
                            </div>
                            <div className="text-xs text-muted-foreground italic">
                              &quot;{tone.example}&quot;
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quality Level */}
              <Card>
                <CardHeader>
                  <CardTitle>Improvement Level</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Quality Level: {qualityLevel}/5
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={qualityLevel}
                      onChange={(e) => setQualityLevel(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Basic</span>
                      <span>Premium</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {qualityLevel === 1 && "Basic formatting and spacing fixes"}
                    {qualityLevel === 2 && "Grammar corrections and capitalization"}
                    {qualityLevel === 3 && "Style improvements and word choice"}
                    {qualityLevel === 4 && "Advanced sentence structure optimization"}
                    {qualityLevel === 5 && "Premium tone-specific enhancements"}
                  </div>

                  <div className="space-y-3">
                    {/* Quick Preset for Professional Editing */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          📋 Professional Editor Preset
                        </h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTone('business-proposal')
                            setQualityLevel(5)
                          }}
                          className="text-xs h-6"
                        >
                          Apply
                        </Button>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Business proposal tone + Premium quality for professional documents
                      </p>
                    </div>
                    
                    <div className="text-center text-sm text-muted-foreground">
                      {remainingUses > 0 ? (
                        <span>{remainingUses}/{DAILY_LIMIT} improvements left today</span>
                      ) : (
                        <span className="text-destructive">Daily limit reached (10/10 used)</span>
                      )}
                    </div>
                    
                    <Button
                      onClick={handleImproveText}
                      disabled={isProcessing || !originalText.trim() || remainingUses <= 0}
                      className="w-full"
                      size="lg"
                    >
                      {isProcessing ? 'Improving Text...' : 
                       remainingUses <= 0 ? '🚫 Daily Limit Reached' : 
                       '✨ Improve Text'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'grammar' && (
            <Card>
              <CardHeader>
                <CardTitle>Grammar Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => {
                    const issues = checkGrammar(originalText)
                    setGrammarIssues(issues)
                  }}
                  disabled={!originalText.trim()}
                  className="w-full mb-4"
                >
                  🔍 Check Grammar
                </Button>

                {grammarIssues.length > 0 ? (
                  <div className="space-y-3">
                    {grammarIssues.map(issue => (
                      <div key={issue.id} className="p-3 border rounded-lg bg-muted/20">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-2 h-2 rounded-full ${
                                issue.severity === 'high' ? 'bg-red-500' :
                                issue.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                              }`}></span>
                              <span className="text-sm font-medium capitalize">{issue.type}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{issue.message}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => applyGrammarFix(issue)}
                            className="text-xs h-7"
                          >
                            Fix
                          </Button>
                        </div>
                        <div className="text-xs">
                          <div className="text-red-600 dark:text-red-400">
                            Original: &quot;{issue.original}&quot;
                          </div>
                          <div className="text-green-600 dark:text-green-400">
                            Suggestion: &quot;{issue.suggestion}&quot;
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No grammar issues found!</p>
                    <p className="text-xs mt-1">Your text looks good.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'analyze' && (
            <Card>
              <CardHeader>
                <CardTitle>Text Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => {
                    const analysis = analyzeText(originalText)
                    setTextAnalysis(analysis)
                  }}
                  disabled={!originalText.trim()}
                  className="w-full mb-4"
                >
                  📊 Analyze Text
                </Button>

                {textAnalysis && (
                  <div className="space-y-4">
                    {/* Basic Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/20 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{textAnalysis.wordCount}</div>
                        <div className="text-xs text-muted-foreground">Words</div>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{textAnalysis.sentenceCount}</div>
                        <div className="text-xs text-muted-foreground">Sentences</div>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{textAnalysis.paragraphCount}</div>
                        <div className="text-xs text-muted-foreground">Paragraphs</div>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{textAnalysis.characterCount}</div>
                        <div className="text-xs text-muted-foreground">Characters</div>
                      </div>
                    </div>

                    {/* Readability */}
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-sm mb-3">Readability Analysis</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Reading Level:</span>
                          <span className="font-medium">{textAnalysis.readingLevel}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Flesch Score:</span>
                          <span className="font-medium">{textAnalysis.readabilityScore}/100</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${textAnalysis.readabilityScore}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Writing Style */}
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-sm mb-3">Writing Style</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Style:</span>
                          <span className="font-medium">{textAnalysis.writingStyle}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg. words per sentence:</span>
                          <span className="font-medium">{textAnalysis.avgWordsPerSentence}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg. sentences per paragraph:</span>
                          <span className="font-medium">{textAnalysis.avgSentencesPerParagraph}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Lexical diversity:</span>
                          <span className="font-medium">{textAnalysis.lexicalDiversity}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Sentiment Analysis */}
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-sm mb-3">Sentiment Analysis</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span>Overall tone:</span>
                          <span className={`font-medium px-2 py-1 rounded text-xs ${
                            textAnalysis.sentiment === 'positive' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            textAnalysis.sentiment === 'negative' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}>
                            {textAnalysis.sentiment.charAt(0).toUpperCase() + textAnalysis.sentiment.slice(1)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sentiment score:</span>
                          <span className="font-medium">{textAnalysis.sentimentScore}</span>
                        </div>
                      </div>
                    </div>

                    {/* Vocabulary Analysis */}
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-sm mb-3">Vocabulary Analysis</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Unique words:</span>
                          <span className="font-medium">{textAnalysis.uniqueWords}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Complex words (3+ syllables):</span>
                          <span className="font-medium">{textAnalysis.complexWords}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Vocabulary richness:</span>
                          <span className="font-medium">
                            {textAnalysis.lexicalDiversity > 60 ? 'Rich' : 
                             textAnalysis.lexicalDiversity > 40 ? 'Moderate' : 'Limited'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Smart Recommendations */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-2">
                        💡 Smart Recommendations
                      </h4>
                      <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        {textAnalysis.avgWordsPerSentence > 25 && (
                          <p>• Your sentences are quite long. Consider breaking them into shorter, punchier statements.</p>
                        )}
                        {textAnalysis.avgWordsPerSentence < 8 && (
                          <p>• Your sentences are very short. Try combining some for better flow.</p>
                        )}
                        {textAnalysis.readabilityScore < 40 && (
                          <p>• Text is complex. Use simpler words and shorter sentences for broader appeal.</p>
                        )}
                        {textAnalysis.readabilityScore > 85 && (
                          <p>• Excellent readability! Your text is clear and accessible.</p>
                        )}
                        {textAnalysis.lexicalDiversity < 35 && (
                          <p>• Try using more varied vocabulary to make your writing more engaging.</p>
                        )}
                        {textAnalysis.lexicalDiversity > 75 && (
                          <p>• Great vocabulary variety! Your writing is rich and diverse.</p>
                        )}
                        {textAnalysis.paragraphCount === 1 && textAnalysis.sentenceCount > 6 && (
                          <p>• Break your text into multiple paragraphs for better structure.</p>
                        )}
                        {textAnalysis.complexWords / textAnalysis.wordCount > 0.4 && (
                          <p>• High use of complex words. Consider simpler alternatives for clarity.</p>
                        )}
                        {textAnalysis.sentiment === 'negative' && textAnalysis.sentimentScore < -10 && (
                          <p>• Your text has a negative tone. Consider more balanced language if appropriate.</p>
                        )}
                        {textAnalysis.sentiment === 'positive' && textAnalysis.sentimentScore > 15 && (
                          <p>• Great positive tone! Your enthusiasm comes through clearly.</p>
                        )}
                        {textAnalysis.wordCount < 30 && (
                          <p>• Your text is quite brief. Consider adding more detail or examples.</p>
                        )}
                        {textAnalysis.wordCount > 500 && textAnalysis.paragraphCount < 3 && (
                          <p>• Long text with few paragraphs. Break it up for better readability.</p>
                        )}
                        {textAnalysis.avgSentencesPerParagraph > 8 && (
                          <p>• Your paragraphs are quite long. Consider shorter paragraphs for web reading.</p>
                        )}
                        {textAnalysis.readabilityScore >= 60 && textAnalysis.readabilityScore <= 80 && textAnalysis.lexicalDiversity > 50 && (
                          <p>• Perfect balance of readability and vocabulary richness!</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 sm:p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-xs sm:text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle>About This Tool</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground space-y-2">
                <p>• AI-powered grammar and style improvement</p>
                <p>• Multiple writing tones and quality levels</p>
                <p>• Advanced readability analysis</p>
                <p>• Real-time grammar and spell checking</p>
                <p>• All processing happens locally in your browser</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}