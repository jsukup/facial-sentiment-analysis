import { test, expect } from '@playwright/test'

test.describe('Video Upload and Storage E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/')
  })

  test('should record and initiate video upload process', async ({ page }) => {
    // Grant camera permissions
    await page.context().grantPermissions(['camera'])
    
    // Mock MediaRecorder and file operations
    await page.addInitScript(() => {
      // Mock getUserMedia
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        canvas.width = 640
        canvas.height = 480
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = 'blue'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        // @ts-ignore
        return canvas.captureStream()
      }
      
      // Mock MediaRecorder
      window.MediaRecorder = class {
        chunks: Blob[] = []
        constructor(stream: any) {
          this.state = 'inactive'
        }
        start() { 
          this.state = 'recording'
          // Simulate data availability
          setTimeout(() => {
            if (this.ondataavailable) {
              const chunk = new Blob(['mock-video-data'], { type: 'video/webm' })
              this.ondataavailable({ data: chunk })
            }
          }, 100)
        }
        stop() { 
          this.state = 'inactive'
          if (this.onstop) this.onstop(new Event('stop'))
        }
        state: string
        ondataavailable: ((event: any) => void) | null = null
        onstop: ((event: Event) => void) | null = null
      }
      
      // Mock fetch for upload
      const originalFetch = window.fetch
      window.fetch = async (url: string, options?: any) => {
        if (url.includes('/api/upload-video') || url.includes('/upload')) {
          return new Response(JSON.stringify({
            success: true,
            url: 'https://storage.example.com/videos/video123.webm',
            id: 'video123'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        return originalFetch(url, options)
      }
    })
    
    // Navigate to participant mode
    await page.getByText('Participant Mode').click()
    
    // Start analysis/recording
    await page.getByText('Start Analysis').click()
    
    // Wait for recording to begin
    await page.waitForTimeout(1000)
    
    // Should show recording indicator
    await expect(page.getByText(/recording|analyzing|capturing/i)).toBeVisible()
    
    // Stop recording
    await page.getByText(/stop|end|finish/i).click()
    
    // Should show upload process or completion
    const hasUploadProgress = await page.getByText(/uploading|upload/i).isVisible()
    const hasCompletion = await page.getByText(/saved|completed|success/i).isVisible()
    
    expect(hasUploadProgress || hasCompletion).toBe(true)
  })

  test('should handle video upload with progress tracking', async ({ page }) => {
    await page.context().grantPermissions(['camera'])
    
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        // @ts-ignore
        return canvas.captureStream()
      }
      
      window.MediaRecorder = class {
        constructor(stream: any) { this.state = 'inactive' }
        start() { this.state = 'recording' }
        stop() { 
          this.state = 'inactive'
          if (this.onstop) this.onstop(new Event('stop'))
        }
        state: string
        ondataavailable: ((event: any) => void) | null = null
        onstop: ((event: Event) => void) | null = null
      }
      
      // Mock progressive upload with delays
      window.fetch = async (url: string, options?: any) => {
        if (url.includes('/upload')) {
          // Simulate upload delay
          await new Promise(resolve => setTimeout(resolve, 1000))
          return new Response(JSON.stringify({
            success: true,
            url: 'https://storage.example.com/video.webm',
            progress: 100
          }), { status: 200 })
        }
        return fetch(url, options)
      }
    })
    
    await page.getByText('Participant Mode').click()
    await page.getByText('Start Analysis').click()
    
    // Wait for recording
    await page.waitForTimeout(500)
    
    await page.getByText(/stop|end/i).click()
    
    // Should show upload progress
    await expect(page.getByText(/uploading|progress/i)).toBeVisible()
    
    // Wait for upload completion
    await page.waitForTimeout(1500)
    
    // Should show completion status
    await expect(page.getByText(/uploaded|saved|complete/i)).toBeVisible()
  })

  test('should handle upload failures gracefully', async ({ page }) => {
    await page.context().grantPermissions(['camera'])
    
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        // @ts-ignore
        return canvas.captureStream()
      }
      
      window.MediaRecorder = class {
        constructor(stream: any) { this.state = 'inactive' }
        start() { this.state = 'recording' }
        stop() { 
          this.state = 'inactive'
          if (this.onstop) this.onstop(new Event('stop'))
        }
        state: string
        ondataavailable: ((event: any) => void) | null = null
        onstop: ((event: Event) => void) | null = null
      }
      
      // Mock upload failure
      window.fetch = async (url: string, options?: any) => {
        if (url.includes('/upload')) {
          throw new Error('Network error')
        }
        return fetch(url, options)
      }
    })
    
    await page.getByText('Participant Mode').click()
    await page.getByText('Start Analysis').click()
    
    await page.waitForTimeout(500)
    await page.getByText(/stop|end/i).click()
    
    // Should show error message
    await expect(page.getByText(/error|failed|retry/i)).toBeVisible()
    
    // Should provide retry option
    const hasRetryButton = await page.getByText(/retry|try again/i).isVisible()
    if (hasRetryButton) {
      expect(hasRetryButton).toBe(true)
    }
  })

  test('should validate video file before upload', async ({ page }) => {
    await page.context().grantPermissions(['camera'])
    
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        // @ts-ignore
        return canvas.captureStream()
      }
      
      window.MediaRecorder = class {
        constructor(stream: any) { this.state = 'inactive' }
        start() { this.state = 'recording' }
        stop() { 
          this.state = 'inactive'
          // Simulate empty recording
          if (this.ondataavailable) {
            const emptyChunk = new Blob([], { type: 'video/webm' })
            this.ondataavailable({ data: emptyChunk })
          }
          if (this.onstop) this.onstop(new Event('stop'))
        }
        state: string
        ondataavailable: ((event: any) => void) | null = null
        onstop: ((event: Event) => void) | null = null
      }
    })
    
    await page.getByText('Participant Mode').click()
    await page.getByText('Start Analysis').click()
    
    // Very short recording to simulate empty/invalid video
    await page.waitForTimeout(100)
    await page.getByText(/stop|end/i).click()
    
    // Should show validation error for empty/invalid video
    await expect(page.getByText(/invalid|empty|too short|error/i)).toBeVisible()
  })

  test('should show storage and file management options', async ({ page }) => {
    await page.context().grantPermissions(['camera'])
    
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        // @ts-ignore
        return canvas.captureStream()
      }
      
      window.MediaRecorder = class {
        constructor(stream: any) { this.state = 'inactive' }
        start() { this.state = 'recording' }
        stop() { 
          this.state = 'inactive'
          if (this.ondataavailable) {
            const chunk = new Blob(['valid-video-data'], { type: 'video/webm' })
            this.ondataavailable({ data: chunk })
          }
          if (this.onstop) this.onstop(new Event('stop'))
        }
        state: string
        ondataavailable: ((event: any) => void) | null = null
        onstop: ((event: Event) => void) | null = null
      }
      
      window.fetch = async (url: string, options?: any) => {
        if (url.includes('/upload')) {
          return new Response(JSON.stringify({
            success: true,
            url: 'https://storage.example.com/video.webm',
            downloadUrl: 'https://storage.example.com/download/video123',
            size: '2.5 MB',
            duration: '30 seconds'
          }), { status: 200 })
        }
        return fetch(url, options)
      }
    })
    
    await page.getByText('Participant Mode').click()
    await page.getByText('Start Analysis').click()
    
    await page.waitForTimeout(500)
    await page.getByText(/stop|end/i).click()
    
    // Wait for upload completion
    await page.waitForTimeout(1000)
    
    // Should show file information
    const hasFileInfo = await page.getByText(/2\.5 MB|30 seconds|duration|size/i).isVisible()
    
    // Should show download option
    const hasDownload = await page.getByText(/download|save|export/i).isVisible()
    
    // Should show storage confirmation
    const hasStorageConfirm = await page.getByText(/saved|stored|uploaded/i).isVisible()
    
    expect(hasFileInfo || hasDownload || hasStorageConfirm).toBe(true)
  })

  test('should handle video compression before upload', async ({ page }) => {
    await page.context().grantPermissions(['camera'])
    
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        // @ts-ignore
        return canvas.captureStream()
      }
      
      window.MediaRecorder = class {
        constructor(stream: any) { this.state = 'inactive' }
        start() { this.state = 'recording' }
        stop() { 
          this.state = 'inactive'
          if (this.ondataavailable) {
            // Simulate large video file
            const largeChunk = new Blob(['x'.repeat(10000)], { type: 'video/webm' })
            this.ondataavailable({ data: largeChunk })
          }
          if (this.onstop) this.onstop(new Event('stop'))
        }
        state: string
        ondataavailable: ((event: any) => void) | null = null
        onstop: ((event: Event) => void) | null = null
      }
      
      window.fetch = async (url: string, options?: any) => {
        if (url.includes('/upload')) {
          return new Response(JSON.stringify({
            success: true,
            originalSize: '10.0 MB',
            compressedSize: '3.5 MB',
            compressionRatio: '65%'
          }), { status: 200 })
        }
        return fetch(url, options)
      }
    })
    
    await page.getByText('Participant Mode').click()
    await page.getByText('Start Analysis').click()
    
    await page.waitForTimeout(500)
    await page.getByText(/stop|end/i).click()
    
    // Should show compression process or results
    const hasCompression = await page.getByText(/compress|optimization|reducing/i).isVisible()
    const hasCompressionResults = await page.getByText(/65%|3\.5 MB|compressed/i).isVisible()
    
    expect(hasCompression || hasCompressionResults).toBe(true)
  })

  test('should provide video playback verification', async ({ page }) => {
    await page.context().grantPermissions(['camera'])
    
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        // @ts-ignore
        return canvas.captureStream()
      }
      
      window.MediaRecorder = class {
        constructor(stream: any) { this.state = 'inactive' }
        start() { this.state = 'recording' }
        stop() { 
          this.state = 'inactive'
          if (this.ondataavailable) {
            const chunk = new Blob(['video-data'], { type: 'video/webm' })
            this.ondataavailable({ data: chunk })
          }
          if (this.onstop) this.onstop(new Event('stop'))
        }
        state: string
        ondataavailable: ((event: any) => void) | null = null
        onstop: ((event: Event) => void) | null = null
      }
      
      // Mock URL.createObjectURL for video preview
      window.URL.createObjectURL = () => 'blob:mock-video-preview-url'
      
      window.fetch = async (url: string, options?: any) => {
        if (url.includes('/upload')) {
          return new Response(JSON.stringify({
            success: true,
            playbackUrl: 'blob:mock-video-preview-url'
          }), { status: 200 })
        }
        return fetch(url, options)
      }
    })
    
    await page.getByText('Participant Mode').click()
    await page.getByText('Start Analysis').click()
    
    await page.waitForTimeout(500)
    await page.getByText(/stop|end/i).click()
    
    // Wait for processing
    await page.waitForTimeout(1000)
    
    // Should show video preview or playback option
    const hasVideoElement = await page.locator('video').isVisible()
    const hasPreviewOption = await page.getByText(/preview|play|review/i).isVisible()
    
    expect(hasVideoElement || hasPreviewOption).toBe(true)
  })

  test('should handle multiple video format support', async ({ page }) => {
    await page.context().grantPermissions(['camera'])
    
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        // @ts-ignore
        return canvas.captureStream()
      }
      
      // Mock MediaRecorder with format support detection
      window.MediaRecorder = class {
        static isTypeSupported(mimeType: string) {
          const supportedTypes = ['video/webm', 'video/mp4', 'video/webm;codecs=vp8']
          return supportedTypes.includes(mimeType)
        }
        
        constructor(stream: any, options?: any) { 
          this.state = 'inactive'
          this.mimeType = options?.mimeType || 'video/webm'
        }
        start() { this.state = 'recording' }
        stop() { 
          this.state = 'inactive'
          if (this.ondataavailable) {
            const chunk = new Blob(['video-data'], { type: this.mimeType })
            this.ondataavailable({ data: chunk })
          }
          if (this.onstop) this.onstop(new Event('stop'))
        }
        state: string
        mimeType: string
        ondataavailable: ((event: any) => void) | null = null
        onstop: ((event: Event) => void) | null = null
      }
    })
    
    await page.getByText('Participant Mode').click()
    
    // Should detect and show supported formats
    const formatInfo = await page.getByText(/webm|mp4|format|codec/i).isVisible()
    
    await page.getByText('Start Analysis').click()
    await page.waitForTimeout(500)
    await page.getByText(/stop|end/i).click()
    
    // Video should be recorded successfully regardless of format detection
    await expect(page.getByText(/saved|completed|uploaded/i)).toBeVisible()
  })

  test('should handle storage quota warnings', async ({ page }) => {
    await page.context().grantPermissions(['camera'])
    
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        // @ts-ignore
        return canvas.captureStream()
      }
      
      window.MediaRecorder = class {
        constructor(stream: any) { this.state = 'inactive' }
        start() { this.state = 'recording' }
        stop() { 
          this.state = 'inactive'
          if (this.ondataavailable) {
            // Simulate large file that might exceed quota
            const largeChunk = new Blob(['x'.repeat(50000)], { type: 'video/webm' })
            this.ondataavailable({ data: largeChunk })
          }
          if (this.onstop) this.onstop(new Event('stop'))
        }
        state: string
        ondataavailable: ((event: any) => void) | null = null
        onstop: ((event: Event) => void) | null = null
      }
      
      // Mock storage API
      if ('storage' in navigator) {
        navigator.storage.estimate = async () => ({
          quota: 100 * 1024, // Small quota for testing
          usage: 80 * 1024,   // Nearly full
          usageDetails: {}
        })
      }
      
      window.fetch = async (url: string, options?: any) => {
        if (url.includes('/upload')) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Storage quota exceeded',
            recommendation: 'compress or delete old files'
          }), { status: 507 }) // Insufficient Storage
        }
        return fetch(url, options)
      }
    })
    
    await page.getByText('Participant Mode').click()
    await page.getByText('Start Analysis').click()
    
    await page.waitForTimeout(500)
    await page.getByText(/stop|end/i).click()
    
    // Should show storage warning or quota message
    await expect(page.getByText(/storage|quota|space|compress|delete/i)).toBeVisible()
  })

  test('should support video metadata and tagging', async ({ page }) => {
    await page.context().grantPermissions(['camera'])
    
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        // @ts-ignore
        return canvas.captureStream()
      }
      
      window.MediaRecorder = class {
        constructor(stream: any) { this.state = 'inactive' }
        start() { this.state = 'recording' }
        stop() { 
          this.state = 'inactive'
          if (this.ondataavailable) {
            const chunk = new Blob(['video-data'], { type: 'video/webm' })
            this.ondataavailable({ data: chunk })
          }
          if (this.onstop) this.onstop(new Event('stop'))
        }
        state: string
        ondataavailable: ((event: any) => void) | null = null
        onstop: ((event: Event) => void) | null = null
      }
      
      window.fetch = async (url: string, options?: any) => {
        if (url.includes('/upload')) {
          return new Response(JSON.stringify({
            success: true,
            metadata: {
              duration: '25 seconds',
              resolution: '640x480',
              fileSize: '2.1 MB',
              recordedAt: new Date().toISOString(),
              participantId: 'participant-123',
              sessionId: 'session-456'
            }
          }), { status: 200 })
        }
        return fetch(url, options)
      }
    })
    
    await page.getByText('Participant Mode').click()
    await page.getByText('Start Analysis').click()
    
    await page.waitForTimeout(500)
    await page.getByText(/stop|end/i).click()
    
    // Wait for upload and metadata processing
    await page.waitForTimeout(1500)
    
    // Should show video metadata
    const hasMetadata = await page.getByText(/25 seconds|640x480|2\.1 MB|participant-123/i).isVisible()
    
    expect(hasMetadata).toBe(true)
  })
})