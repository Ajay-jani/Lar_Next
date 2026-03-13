import React from 'react';
import { QRGenerator } from '@/components/tools/QRGenerator'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'QR Code Generator - Create Custom QR Codes | UtilityHub',
  description: 'Generate beautiful, customizable QR codes with advanced styling options. Support for URLs, text, WiFi, contact info and more.',
  keywords: 'QR code generator, create QR code, custom QR code, QR code maker, barcode generator, free QR generator'
}

export default function QRGeneratorPage() {
  return <QRGenerator />
}