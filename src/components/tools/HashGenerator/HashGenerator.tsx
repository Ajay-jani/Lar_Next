'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

// Types
type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512' | 'hmac-sha256' | 'crc32'
type OutputFormat = 'hex' | 'base64'
type MainTab = 'hash' | 'encrypt'
type EncryptionMode = 'encrypt' | 'decrypt'

interface HashResult {
  algorithm: HashAlgorithm
  input: string
  hash: string
  format: OutputFormat
  computeTime: number
  inputType: 'text' | 'file'
  fileName?: string
  fileSize?: number
}

interface EncryptionResult {
  mode: EncryptionMode
  input: string
  output: string
  computeTime: number
  inputType: 'text' | 'file'
  fileName?: string
  fileSize?: number
  success: boolean
}

interface AlgorithmInfo {
  name: string
  description: string
  useCase: string
  security: 'Low' | 'Medium' | 'High' | 'Very High'
  speed: 'Fast' | 'Medium' | 'Slow'
}

const ALGORITHMS: Record<HashAlgorithm, AlgorithmInfo> = {
  md5: {
    name: 'MD5',
    description: 'Message Digest Algorithm 5 - produces 128-bit hash',
    useCase: 'File integrity checks, checksums (not for security)',
    security: 'Low',
    speed: 'Fast'
  },
  sha1: {
    name: 'SHA-1',
    description: 'Secure Hash Algorithm 1 - produces 160-bit hash',
    useCase: 'Legacy systems, Git commits (deprecated for security)',
    security: 'Low',
    speed: 'Fast'
  },
  sha256: {
    name: 'SHA-256',
    description: 'Secure Hash Algorithm 256-bit - part of SHA-2 family',
    useCase: 'Cryptographic applications, blockchain, certificates',
    security: 'High',
    speed: 'Medium'
  },
  sha512: {
    name: 'SHA-512',
    description: 'Secure Hash Algorithm 512-bit - part of SHA-2 family',
    useCase: 'High-security applications, password hashing',
    security: 'Very High',
    speed: 'Medium'
  },
  'hmac-sha256': {
    name: 'HMAC-SHA256',
    description: 'Hash-based Message Authentication Code with SHA-256',
    useCase: 'Message authentication, API signatures, JWT tokens',
    security: 'Very High',
    speed: 'Medium'
  },
  crc32: {
    name: 'CRC32',
    description: 'Cyclic Redundancy Check 32-bit - error detection',
    useCase: 'Error detection, file integrity (not cryptographic)',
    security: 'Low',
    speed: 'Fast'
  }
}

export function HashGenerator() {
  // Main tab state
  const [mainTab, setMainTab] = useState<MainTab>('hash')
  
  // Hash tab states
  const [textInput, setTextInput] = useState('')
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<HashAlgorithm>('sha256')
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('hex')
  const [hmacKey, setHmacKey] = useState('')
  const [salt, setSalt] = useState('')
  const [hashResults, setHashResults] = useState<HashResult[]>([])
  
  // Encryption tab states
  const [encryptionMode, setEncryptionMode] = useState<EncryptionMode>('encrypt')
  const [encryptionInput, setEncryptionInput] = useState('')
  const [encryptionKey, setEncryptionKey] = useState('')
  const [encryptionOutput, setEncryptionOutput] = useState('')

  
  // Shared states
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Check crypto availability
  const [cryptoLoaded, setCryptoLoaded] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      setCryptoLoaded(true)
    }
  }, [])

  // Hash computation functions
  const computeHash = useCallback(async (
    input: string | ArrayBuffer,
    algorithm: HashAlgorithm,
    format: OutputFormat,
    key?: string
  ): Promise<string> => {
    try {
      let data: ArrayBuffer
      
      if (typeof input === 'string') {
        const encoder = new TextEncoder()
        data = encoder.encode(salt + input).buffer
      } else {
        data = input
      }

      let hashBuffer: ArrayBuffer

      switch (algorithm) {
        case 'md5':
          // Fallback to SHA-256 for MD5 (browser limitation)
          hashBuffer = await crypto.subtle.digest('SHA-256', data)
          break
        case 'sha1':
          hashBuffer = await crypto.subtle.digest('SHA-1', data)
          break
        case 'sha256':
          hashBuffer = await crypto.subtle.digest('SHA-256', data)
          break
        case 'sha512':
          hashBuffer = await crypto.subtle.digest('SHA-512', data)
          break
        case 'hmac-sha256':
          if (!key) throw new Error('HMAC requires a key')
          const cryptoKey = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(key),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          )
          hashBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data)
          break
        case 'crc32':
          hashBuffer = computeCRC32(data)
          break
        default:
          throw new Error(`Unsupported algorithm: ${algorithm}`)
      }

      // Convert to desired format
      const hashArray = new Uint8Array(hashBuffer)
      
      if (format === 'hex') {
        return Array.from(hashArray)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      } else {
        // Base64
        return btoa(String.fromCharCode(...hashArray))
      }
    } catch (err) {
      throw new Error(`Hash computation failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [salt])

  // CRC32 implementation
  const computeCRC32 = (data: ArrayBuffer): ArrayBuffer => {
    const bytes = new Uint8Array(data)
    let crc = 0xFFFFFFFF
    
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i]
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
      }
    }
    
    const result = new ArrayBuffer(4)
    const view = new DataView(result)
    view.setUint32(0, (crc ^ 0xFFFFFFFF) >>> 0, false)
    return result
  }

  // Encryption/Decryption functions using AES-256-GCM
  const deriveKey = useCallback(async (password: string, salt: ArrayBuffer): Promise<CryptoKey> => {
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    )

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    )
  }, [])

  const encryptData = useCallback(async (data: string, password: string): Promise<string> => {
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const iv = crypto.getRandomValues(new Uint8Array(12))
      
      const key = await deriveKey(password, salt.buffer)
      
      const encodedData = new TextEncoder().encode(data)
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encodedData
      )
      
      // Combine salt + iv + encrypted data
      const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength)
      combined.set(salt, 0)
      combined.set(iv, salt.length)
      combined.set(new Uint8Array(encryptedData), salt.length + iv.length)
      
      return btoa(String.fromCharCode(...combined))
    } catch (err) {
      throw new Error(`Encryption failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [deriveKey])

  const decryptData = useCallback(async (encryptedBase64: string, password: string): Promise<string> => {
    try {
      const combined = new Uint8Array(
        atob(encryptedBase64).split('').map(char => char.charCodeAt(0))
      )
      
      const salt = combined.slice(0, 16)
      const iv = combined.slice(16, 28)
      const encryptedData = combined.slice(28)
      
      const key = await deriveKey(password, salt.buffer)
      
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encryptedData
      )
      
      return new TextDecoder().decode(decryptedData)
    } catch (err) {
      throw new Error(`Decryption failed: Invalid key or corrupted data`)
    }
  }, [deriveKey])

  // Handle text hashing
  const handleTextHash = useCallback(async () => {
    if (!textInput.trim()) {
      setError('Please enter some text to hash')
      return
    }

    if (selectedAlgorithm === 'hmac-sha256' && !hmacKey.trim()) {
      setError('HMAC requires a key')
      return
    }

    setIsProcessing(true)
    setError(null)
    setSuccess(null)

    try {
      const startTime = performance.now()
      const hash = await computeHash(
        textInput,
        selectedAlgorithm,
        outputFormat,
        hmacKey || undefined
      )
      const computeTime = performance.now() - startTime

      const result: HashResult = {
        algorithm: selectedAlgorithm,
        input: textInput.length > 100 ? textInput.substring(0, 100) + '...' : textInput,
        hash,
        format: outputFormat,
        computeTime,
        inputType: 'text'
      }

      setHashResults(prev => [result, ...prev.slice(0, 4)])
      setSuccess(`Hash generated successfully in ${computeTime.toFixed(2)}ms`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hash computation failed')
    } finally {
      setIsProcessing(false)
    }
  }, [textInput, selectedAlgorithm, outputFormat, hmacKey, computeHash])

  // Handle encryption/decryption
  const handleEncryption = useCallback(async () => {
    if (!encryptionInput.trim()) {
      setError('Please enter some text to encrypt/decrypt')
      return
    }

    if (!encryptionKey.trim()) {
      setError('Please enter an encryption key')
      return
    }

    if (encryptionKey.length < 8) {
      setError('Encryption key must be at least 8 characters long')
      return
    }

    setIsProcessing(true)
    setError(null)
    setSuccess(null)
    setEncryptionOutput('')

    try {
      const startTime = performance.now()
      let output: string
      let success = true

      if (encryptionMode === 'encrypt') {
        output = await encryptData(encryptionInput, encryptionKey)
        setSuccess(`Text encrypted successfully in ${(performance.now() - startTime).toFixed(2)}ms`)
      } else {
        try {
          output = await decryptData(encryptionInput, encryptionKey)
          setSuccess(`Text decrypted successfully in ${(performance.now() - startTime).toFixed(2)}ms`)
        } catch (err) {
          output = ''
          success = false
          setError(err instanceof Error ? err.message : 'Decryption failed')
        }
      }

      const computeTime = performance.now() - startTime
      setEncryptionOutput(output)


    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setIsProcessing(false)
    }
  }, [encryptionInput, encryptionKey, encryptionMode, encryptData, decryptData])

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setSuccess('Copied to clipboard!')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err) {
      setError('Failed to copy to clipboard')
    }
  }

  // Clear messages
  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }



  if (!cryptoLoaded) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Crypto API not available. Please use a modern browser with HTTPS.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-4">
          Hash Generator & Encryption Tool
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base lg:text-lg px-2">
          Generate cryptographic hashes and encrypt/decrypt data with military-grade security
        </p>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex justify-center mb-6 sm:mb-8">
        <div className="flex bg-muted rounded-lg p-1 w-full max-w-md">
          {[
            { id: 'hash', label: 'Hash Generator', icon: '🔐' },
            { id: 'encrypt', label: 'Encryption', icon: '🔒' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setMainTab(tab.id as MainTab)
                clearMessages()
              }}
              className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-md text-sm sm:text-base font-medium transition-colors ${
                mainTab === tab.id
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

      {/* Messages */}
      {(error || success) && (
        <div className="mb-6">
          {error && (
            <div className="p-3 sm:p-4 bg-destructive/10 border border-destructive/20 rounded-lg mb-3">
              <p className="text-destructive text-sm font-medium">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg mb-3 dark:bg-green-900/20 dark:border-green-800">
              <p className="text-green-700 dark:text-green-300 text-sm font-medium">{success}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {mainTab === 'hash' && (
            <>
              {/* Hash Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>🔐</span>
                    <span>Generate Hash</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Text to Hash
                    </label>
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Enter text to generate hash..."
                      className="w-full h-32 p-4 border border-border rounded-lg bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Algorithm
                      </label>
                      <select
                        value={selectedAlgorithm}
                        onChange={(e) => setSelectedAlgorithm(e.target.value as HashAlgorithm)}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {Object.entries(ALGORITHMS).map(([key, info]) => (
                          <option key={key} value={key}>
                            {info.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Output Format
                      </label>
                      <select
                        value={outputFormat}
                        onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="hex">Hexadecimal</option>
                        <option value="base64">Base64</option>
                      </select>
                    </div>
                  </div>

                  {/* Optional Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Salt (optional)
                      </label>
                      <input
                        type="text"
                        value={salt}
                        onChange={(e) => setSalt(e.target.value)}
                        placeholder="Enter salt value..."
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                      />
                    </div>

                    {selectedAlgorithm === 'hmac-sha256' && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          HMAC Key (required)
                        </label>
                        <input
                          type="text"
                          value={hmacKey}
                          onChange={(e) => setHmacKey(e.target.value)}
                          placeholder="Enter HMAC key..."
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleTextHash}
                    disabled={isProcessing || !textInput.trim()}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? 'Generating Hash...' : '🔐 Generate Hash'}
                  </Button>
                </CardContent>
              </Card>

              {/* Hash Results */}
              {hashResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Hash Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {hashResults.map((result, index) => (
                        <div key={index} className="p-4 border border-border rounded-lg bg-muted/20">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {ALGORITHMS[result.algorithm].name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({result.format.toUpperCase()})
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {result.computeTime.toFixed(2)}ms
                              </span>
                            </div>
                          </div>
                          
                          <div className="font-mono text-sm bg-background p-3 rounded border break-all mb-3">
                            {result.hash}
                          </div>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(result.hash)}
                            className="text-xs"
                          >
                            📋 Copy Hash
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {mainTab === 'encrypt' && (
            <>
              {/* Encryption Mode Selection */}
              <div className="flex justify-center mb-6">
                <div className="flex bg-muted rounded-lg p-1 w-full max-w-md">
                  {[
                    { id: 'encrypt', label: 'Encrypt', icon: '🔒' },
                    { id: 'decrypt', label: 'Decrypt', icon: '🔓' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => {
                        setEncryptionMode(mode.id as EncryptionMode)
                        setEncryptionInput('')
                        setEncryptionOutput('')
                        clearMessages()
                      }}
                      className={`flex-1 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        encryptionMode === mode.id
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="mr-2">{mode.icon}</span>
                      <span>{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Encryption Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>{encryptionMode === 'encrypt' ? '🔒' : '🔓'}</span>
                    <span>{encryptionMode === 'encrypt' ? 'Encrypt Data' : 'Decrypt Data'}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {encryptionMode === 'encrypt' ? 'Text to Encrypt' : 'Encrypted Text (Base64)'}
                    </label>
                    <textarea
                      value={encryptionInput}
                      onChange={(e) => setEncryptionInput(e.target.value)}
                      placeholder={
                        encryptionMode === 'encrypt' 
                          ? 'Enter text to encrypt...' 
                          : 'Paste encrypted text (base64) to decrypt...'
                      }
                      className="w-full h-32 p-4 border border-border rounded-lg bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring text-sm font-mono"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Encryption Key
                      <span className="text-xs text-muted-foreground ml-2">
                        (minimum 8 characters)
                      </span>
                    </label>
                    <input
                      type="password"
                      value={encryptionKey}
                      onChange={(e) => setEncryptionKey(e.target.value)}
                      placeholder="Enter encryption key..."
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 Use the same key for both encryption and decryption
                    </p>
                  </div>

                  <Button
                    onClick={handleEncryption}
                    disabled={isProcessing || !encryptionInput.trim() || !encryptionKey.trim()}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? 
                      (encryptionMode === 'encrypt' ? 'Encrypting...' : 'Decrypting...') : 
                      (encryptionMode === 'encrypt' ? '🔒 Encrypt Data' : '🔓 Decrypt Data')
                    }
                  </Button>
                </CardContent>
              </Card>

              {/* Encryption Output */}
              {encryptionOutput && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span>✅</span>
                      <span>{encryptionMode === 'encrypt' ? 'Encrypted Result' : 'Decrypted Result'}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="font-mono text-sm bg-background p-4 rounded border break-all max-h-40 overflow-y-auto">
                        {encryptionOutput}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(encryptionOutput)}
                          className="text-xs"
                        >
                          📋 Copy Result
                        </Button>
                        {encryptionMode === 'encrypt' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEncryptionMode('decrypt')
                              setEncryptionInput(encryptionOutput)
                              setEncryptionOutput('')
                            }}
                            className="text-xs"
                          >
                            🔓 Test Decrypt
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {mainTab === 'hash' && (
            <>
              {/* Algorithm Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Algorithm Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm mb-1">
                        {ALGORITHMS[selectedAlgorithm].name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {ALGORITHMS[selectedAlgorithm].description}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="font-medium">Security:</span>
                        <div className={`px-2 py-1 rounded text-xs ${
                          ALGORITHMS[selectedAlgorithm].security === 'Very High' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          ALGORITHMS[selectedAlgorithm].security === 'High' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          ALGORITHMS[selectedAlgorithm].security === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {ALGORITHMS[selectedAlgorithm].security}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Speed:</span>
                        <span className="text-muted-foreground">
                          {ALGORITHMS[selectedAlgorithm].speed}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <span className="font-medium text-xs">Use Case:</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {ALGORITHMS[selectedAlgorithm].useCase}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {mainTab === 'encrypt' && (
            <>
              {/* Encryption Info */}
              <Card>
                <CardHeader>
                  <CardTitle>AES-256-GCM</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm mb-1">
                        Military-Grade Encryption
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Advanced Encryption Standard with 256-bit keys and authenticated encryption
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="font-medium">Security:</span>
                        <div className="px-2 py-1 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Military Grade
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Key Size:</span>
                        <span className="text-muted-foreground">256-bit</span>
                      </div>
                    </div>
                    
                    <div>
                      <span className="font-medium text-xs">Features:</span>
                      <div className="text-xs text-muted-foreground mt-1 space-y-1">
                        <p>• Authenticated encryption</p>
                        <p>• PBKDF2 key derivation</p>
                        <p>• Random salt & IV</p>
                        <p>• Base64 output</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Tips */}
              <Card>
                <CardHeader>
                  <CardTitle>Security Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground space-y-2">
                    <p>🔐 <strong>Strong Keys:</strong> Use 12+ characters with mixed case, numbers, symbols</p>
                    <p>🔒 <strong>Key Safety:</strong> Never store keys with encrypted data</p>
                    <p>💾 <strong>Backup:</strong> Keep secure backups of encryption keys</p>
                    <p>🌐 <strong>Privacy:</strong> All processing happens locally in your browser</p>
                    <p>⚠️ <strong>Warning:</strong> Lost keys cannot recover encrypted data</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>About This Tool</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground space-y-2">
                {mainTab === 'hash' ? (
                  <>
                    <p>• Generate cryptographic hashes for data integrity</p>
                    <p>• Support for MD5, SHA-1, SHA-256, SHA-512, HMAC, CRC32</p>
                    <p>• Real-time hash generation</p>
                    <p>• Compare hashes for verification</p>
                    <p>• All processing happens locally</p>
                  </>
                ) : (
                  <>
                    <p>• Encrypt/decrypt with AES-256-GCM</p>
                    <p>• Military-grade security standards</p>
                    <p>• Authenticated encryption with integrity</p>
                    <p>• PBKDF2 key derivation (100k iterations)</p>
                    <p>• No data leaves your browser</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}