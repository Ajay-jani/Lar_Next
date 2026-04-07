import { HashGenerator } from '@/components/tools/HashGenerator'

export default function HashGeneratorPage() {
  return <HashGenerator />
}

export const metadata = {
  title: 'Hash Generator & Encryption Tool - SHA-256, AES-256',
  description: 'Generate cryptographic hashes and encrypt/decrypt data with AES-256. Support for SHA-1, SHA-256, SHA-512, HMAC-SHA256, CRC32, and military-grade encryption.',
  keywords: 'hash generator, encryption, AES-256, SHA-256, SHA-512, HMAC, CRC32, cryptographic hash, file encryption, text encryption, decrypt',
}
