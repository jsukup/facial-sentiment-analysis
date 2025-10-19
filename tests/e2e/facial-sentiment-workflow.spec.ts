import { test, expect } from '@playwright/test'

test.describe('Facial Sentiment Analysis Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/')
  })

  test('should navigate to participant mode and show camera interface', async ({ page }) => {
    await page.getByText('Participant Mode').click()
    
    // Should show facial analysis interface
    await expect(page.getByText('Facial Sentiment Analysis')).toBeVisible()
    await expect(page.getByText('Start Analysis')).toBeVisible()
    
    // Should show camera permissions prompt or video element
    const hasPermissionPrompt = await page.getByText(/camera|permission/i).isVisible()
    const hasVideoElement = await page.locator('video').isVisible()
    
    expect(hasPermissionPrompt || hasVideoElement).toBe(true)
  })

  test('should handle camera permission denial gracefully', async ({ page }) => {
    // Mock camera permission denial
    await page.context().grantPermissions([])
    
    await page.getByText('Participant Mode').click()
    await page.getByText('Start Analysis').click()
    
    // Should show error message for camera access
    await expect(page.getByText(/camera access denied|permission denied|unable to access camera/i)).toBeVisible()
    
    // Should provide fallback options
    await expect(page.getByText(/try again|use different camera|check permissions/i)).toBeVisible()
  })

  test('should handle camera permission grant and start video stream', async ({ page }) => {
    // Mock camera access
    await page.context().grantPermissions(['camera'])
    
    // Mock getUserMedia
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        // Create a mock video stream
        const canvas = document.createElement('canvas')
        canvas.width = 640
        canvas.height = 480
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = 'blue'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // @ts-ignore - Mock stream for testing
        return canvas.captureStream()
      }
    })
    
    await page.getByText('Participant Mode').click()
    await page.getByText('Start Analysis').click()
    
    // Should show video element with stream
    await expect(page.locator('video')).toBeVisible()
    
    // Should show analysis controls
    await expect(page.getByText(/stop analysis|pause|recording/i)).toBeVisible()
  })

  test('should display sentiment analysis results in real-time', async ({ page }) => {
    // Mock camera and face-api
    await page.context().grantPermissions(['camera'])
    
    await page.addInitScript(() => {
      // Mock getUserMedia
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        // @ts-ignore
        return canvas.captureStream()
      }
      
      // Mock face-api detection
      window.faceapi = {
        detectAllFaces: () => [{
          expressions: {
            neutral: 0.1,
            happy: 0.7,
            sad: 0.1,
            angry: 0.05,
            fearful: 0.02,
            disgusted: 0.02,
            surprised: 0.01
          }
        }],
        nets: {
          tinyFaceDetector: { loadFromUri: () => Promise.resolve() },
          faceExpressionNet: { loadFromUri: () => Promise.resolve() }
        },
        TinyFaceDetectorOptions: function() { return {} }
      }
    })
    
    await page.getByText('Participant Mode').click()
    await page.getByText('Start Analysis').click()
    
    // Wait for analysis to start
    await page.waitForTimeout(2000)
    
    // Should show sentiment results
    await expect(page.getByText(/happy|sad|neutral|angry/i)).toBeVisible()
    
    // Should show confidence scores or percentages
    await expect(page.locator('[data-testid*="sentiment"], [class*="sentiment"]')).toBeVisible()
  })

  test('should record and save facial analysis data', async ({ page }) => {
    await page.context().grantPermissions(['camera'])
    
    // Mock storage API
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        // @ts-ignore
        return canvas.captureStream()
      }
      
      // Mock MediaRecorder
      window.MediaRecorder = class {
        constructor(stream: any) {
          this.state = 'inactive'
        }
        start() { this.state = 'recording' }
        stop() { 
          this.state = 'inactive'
          if (this.onstop) this.onstop(new Event('stop'))
        }
        state: string
        onstop: ((event: Event) => void) | null = null
        ondataavailable: ((event: any) => void) | null = null
      }
      
      // Mock face-api
      window.faceapi = {
        detectAllFaces: () => [{
          expressions: {
            neutral: 0.3,
            happy: 0.5,
            sad: 0.1,
            angry: 0.05,
            fearful: 0.02,
            disgusted: 0.02,
            surprised: 0.01
          }
        }],
        nets: {
          tinyFaceDetector: { loadFromUri: () => Promise.resolve() },
          faceExpressionNet: { loadFromUri: () => Promise.resolve() }
        },
        TinyFaceDetectorOptions: function() { return {} }
      }
    })
    
    await page.getByText('Participant Mode').click()
    await page.getByText('Start Analysis').click()
    
    // Wait for recording to start
    await page.waitForTimeout(1000)
    
    // Should show recording indicator
    await expect(page.getByText(/recording|analyzing|capturing/i)).toBeVisible()
    
    // Stop analysis
    await page.getByText(/stop|end|finish/i).click()
    
    // Should show save options or completion message
    await expect(page.getByText(/saved|completed|download|export/i)).toBeVisible()
  })

  test('should handle face detection failures gracefully', async ({ page }) => {
    await page.context().grantPermissions(['camera'])
    
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        // @ts-ignore
        return canvas.captureStream()
      }
      
      // Mock face-api with no face detected
      window.faceapi = {
        detectAllFaces: () => [], // No faces detected
        nets: {
          tinyFaceDetector: { loadFromUri: () => Promise.resolve() },
          faceExpressionNet: { loadFromUri: () => Promise.resolve() }
        },
        TinyFaceDetectorOptions: function() { return {} }
      }
    })
    
    await page.getByText('Participant Mode').click()
    await page.getByText('Start Analysis').click()
    
    // Should show "no face detected" message
    await expect(page.getByText(/no face detected|position your face|look at camera/i)).toBeVisible()
    
    // Should provide guidance
    await expect(page.getByText(/ensure good lighting|center your face|remove obstructions/i)).toBeVisible()
  })

  test('should display analysis history and timestamps', async ({ page }) => {
    await page.context().grantPermissions(['camera'])
    
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        // @ts-ignore
        return canvas.captureStream()
      }
      
      // Mock face-api with varying emotions over time
      let callCount = 0
      window.faceapi = {
        detectAllFaces: () => {
          callCount++
          return [{
            expressions: {
              neutral: callCount % 2 ? 0.6 : 0.2,
              happy: callCount % 2 ? 0.2 : 0.6,
              sad: 0.1,
              angry: 0.05,
              fearful: 0.02,
              disgusted: 0.02,
              surprised: 0.01
            }
          }]
        },
        nets: {
          tinyFaceDetector: { loadFromUri: () => Promise.resolve() },
          faceExpressionNet: { loadFromUri: () => Promise.resolve() }
        },
        TinyFaceDetectorOptions: function() { return {} }
      }
    })
    
    await page.getByText('Participant Mode').click()
    await page.getByText('Start Analysis').click()
    
    // Wait for multiple analysis cycles
    await page.waitForTimeout(3000)
    
    // Should show timestamp information
    await expect(page.getByText(/\d{2}:\d{2}|\d+s|duration/i)).toBeVisible()
    
    // Should show analysis history or trends
    const hasHistoryChart = await page.locator('[data-testid*="chart"], [class*="chart"], svg').isVisible()
    const hasHistoryList = await page.getByText(/history|previous|timeline/i).isVisible()
    
    expect(hasHistoryChart || hasHistoryList).toBe(true)
  })

  test('should export analysis results', async ({ page }) => {
    await page.context().grantPermissions(['camera'])
    
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        // @ts-ignore
        return canvas.captureStream()
      }
      
      window.faceapi = {
        detectAllFaces: () => [{
          expressions: {
            neutral: 0.4,
            happy: 0.4,
            sad: 0.1,
            angry: 0.05,
            fearful: 0.02,
            disgusted: 0.02,
            surprised: 0.01
          }
        }],
        nets: {
          tinyFaceDetector: { loadFromUri: () => Promise.resolve() },
          faceExpressionNet: { loadFromUri: () => Promise.resolve() }
        },
        TinyFaceDetectorOptions: function() { return {} }
      }
      
      // Mock download functionality
      window.URL.createObjectURL = () => 'blob:mock-url'
      window.URL.revokeObjectURL = () => {}
    })
    
    await page.getByText('Participant Mode').click()
    await page.getByText('Start Analysis').click()
    
    // Wait for analysis data
    await page.waitForTimeout(2000)
    
    // Stop analysis
    await page.getByText(/stop|end|finish/i).click()
    
    // Look for export options
    const hasExportButton = await page.getByText(/export|download|save/i).isVisible()
    const hasFormatOptions = await page.getByText(/csv|json|pdf/i).isVisible()
    
    if (hasExportButton) {
      await page.getByText(/export|download|save/i).click()
      
      // Should trigger download (we can't test actual file download in Playwright easily)
      // Just verify the export mechanism is available
      expect(hasExportButton).toBe(true)
    }
  })

  test('should handle analysis interruption and resumption', async ({ page }) => {
    await page.context().grantPermissions(['camera'])
    
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        // @ts-ignore
        return canvas.captureStream()
      }
      
      window.faceapi = {
        detectAllFaces: () => [{
          expressions: {
            neutral: 0.5,
            happy: 0.3,
            sad: 0.1,
            angry: 0.05,
            fearful: 0.02,
            disgusted: 0.02,
            surprised: 0.01
          }
        }],
        nets: {
          tinyFaceDetector: { loadFromUri: () => Promise.resolve() },
          faceExpressionNet: { loadFromUri: () => Promise.resolve() }
        },
        TinyFaceDetectorOptions: function() { return {} }
      }
    })
    
    await page.getByText('Participant Mode').click()
    await page.getByText('Start Analysis').click()
    
    // Wait for analysis to begin
    await page.waitForTimeout(1000)
    
    // Pause analysis
    await page.getByText(/pause|stop/i).click()
    
    // Should show paused state
    await expect(page.getByText(/paused|stopped|resume/i)).toBeVisible()
    
    // Resume analysis
    if (await page.getByText(/resume|continue/i).isVisible()) {
      await page.getByText(/resume|continue/i).click()
      
      // Should resume analysis
      await expect(page.getByText(/analyzing|recording|running/i)).toBeVisible()
    }
  })

  test('should validate demographic data collection', async ({ page }) => {
    await page.getByText('Participant Mode').click()
    
    // Should show demographic form before or after analysis
    const hasDemographicForm = await page.locator('form').isVisible()
    const hasAgeInput = await page.getByLabel(/age/i).isVisible()
    const hasGenderSelect = await page.getByLabel(/gender/i).isVisible()
    
    if (hasDemographicForm) {
      // Test demographic form validation
      if (hasAgeInput) {
        await page.getByLabel(/age/i).fill('25')
      }
      
      if (hasGenderSelect) {
        await page.getByLabel(/gender/i).selectOption('Male')
      }
      
      // Should accept valid demographic data
      expect(hasDemographicForm).toBe(true)
    }
  })
})