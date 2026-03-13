import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface ComingSoonProps {
  toolName: string
  description?: string
}

export default function ComingSoon({ toolName, description }: ComingSoonProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto text-center">
        <CardHeader>
          <CardTitle className="text-3xl text-primary">{toolName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-6xl">🚧</div>
          
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Coming Soon</h2>
            <p className="text-text-secondary">
              {description || `We're working hard to bring you this amazing tool. It will be available soon with powerful features and an intuitive interface.`}
            </p>
          </div>

          <div className="bg-surface-secondary p-4 rounded-lg">
            <h3 className="font-semibold text-text-primary mb-2">What to expect:</h3>
            <ul className="text-sm text-text-secondary space-y-1">
              <li>• Fast and reliable processing</li>
              <li>• User-friendly interface</li>
              <li>• Secure file handling</li>
              <li>• Multiple format support</li>
            </ul>
          </div>

          <div className="text-sm text-text-muted">
            <p>Check back soon for updates!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}