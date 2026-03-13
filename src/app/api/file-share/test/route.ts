import { NextResponse } from 'next/server'
import { fileStore } from '@/lib/file-store'

export async function GET() {
  try {
    // Test the file store
    const testId = 'test-123'
    const testData = {
      id: testId,
      name: 'test.txt',
      size: 100,
      type: 'text/plain',
      path: '/tmp/test.txt',
      expiresAt: new Date(Date.now() + 60000), // 1 minute from now
      downloadCount: 0,
      maxDownloads: 10
    }
    
    // Set test data
    await fileStore.set(testId, testData)
    
    // Get it back
    const retrieved = await fileStore.get(testId)
    
    // Clean up
    await fileStore.delete(testId)
    
    return NextResponse.json({
      success: true,
      message: 'File store test passed',
      testData: {
        stored: testData,
        retrieved: retrieved,
        storeSize: await fileStore.size()
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      storeSize: await fileStore.size()
    }, { status: 500 })
  }
}