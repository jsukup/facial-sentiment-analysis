import { Page, expect } from '@playwright/test'

/**
 * Test helper utilities for Facial Sentiment Analysis E2E tests
 * Based on TESTING_CHECKLIST.md requirements
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Mock MediaDevices for webcam testing
   */
  async mockWebcamAccess(grant: boolean = true) {
    if (grant) {
      await this.page.context().grantPermissions(['camera'])
    } else {
      await this.page.context().grantPermissions([])
    }

    await this.page.addInitScript(() => {
      // Mock getUserMedia
      navigator.mediaDevices.getUserMedia = async (constraints: any) => {
        if (!constraints?.video) {
          throw new Error('Camera access denied')
        }
        
        const canvas = document.createElement('canvas')
        canvas.width = 640
        canvas.height = 480
        const ctx = canvas.getContext('2d')!
        
        // Create a simple blue frame for testing
        ctx.fillStyle = 'blue'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = 'white'
        ctx.font = '20px Arial'
        ctx.fillText('Test Video Stream', 200, 240)
        
        // @ts-ignore - Mock stream for testing
        return canvas.captureStream(30)
      }

      // Mock MediaRecorder
      window.MediaRecorder = class MockMediaRecorder {
        constructor(stream: any, options?: any) {
          this.state = 'inactive'
          this.stream = stream
        }
        
        start(timeslice?: number) { 
          this.state = 'recording'
          if (this.onstart) this.onstart(new Event('start'))
        }
        
        stop() { 
          this.state = 'inactive'
          if (this.onstop) this.onstop(new Event('stop'))
          if (this.ondataavailable) {
            this.ondataavailable({ 
              data: new Blob(['test-video-data'], { type: 'video/webm' })
            })
          }
        }
        
        pause() { this.state = 'paused' }
        resume() { this.state = 'recording' }
        
        state: string
        stream: any
        onstart: ((event: Event) => void) | null = null
        onstop: ((event: Event) => void) | null = null
        ondataavailable: ((event: any) => void) | null = null
        onerror: ((event: Event) => void) | null = null
      }
    })
  }

  /**
   * Mock face-api.js for facial detection testing
   */
  async mockFaceApi(emotionOverrides?: Record<string, number>) {
    const defaultEmotions = {
      neutral: 0.3,
      happy: 0.4,
      sad: 0.1,
      angry: 0.05,
      fearful: 0.05,
      disgusted: 0.05,
      surprised: 0.05
    }

    const emotions = { ...defaultEmotions, ...emotionOverrides }

    await this.page.addInitScript((emotions) => {
      // Mock face-api.js completely
      window.faceapi = {
        detectAllFaces: () => [{
          expressions: emotions,
          detection: {
            box: { x: 100, y: 100, width: 200, height: 200 },
            score: 0.9
          }
        }],
        detectSingleFace: (element: any, options?: any) => {
          return {
            withFaceExpressions: () => Promise.resolve({
              expressions: emotions,
              detection: {
                box: { x: 100, y: 100, width: 200, height: 200 },
                score: 0.9
              }
            })
          }
        },
        nets: {
          tinyFaceDetector: { 
            loadFromUri: async () => {
              console.log('Mock: tinyFaceDetector.loadFromUri called')
              // Ensure isLoaded is true after loading
              window.faceapi.nets.tinyFaceDetector.isLoaded = true
              return Promise.resolve()
            },
            isLoaded: false  // Start as false, will be set to true after loadFromUri
          },
          faceExpressionNet: { 
            loadFromUri: async () => {
              console.log('Mock: faceExpressionNet.loadFromUri called')
              // Ensure isLoaded is true after loading
              window.faceapi.nets.faceExpressionNet.isLoaded = true
              return Promise.resolve()
            },
            isLoaded: false  // Start as false, will be set to true after loadFromUri
          },
          faceLandmark68Net: { 
            loadFromUri: async () => {
              console.log('Mock: faceLandmark68Net.loadFromUri called')
              window.faceapi.nets.faceLandmark68Net.isLoaded = true
              return Promise.resolve()
            },
            isLoaded: false
          },
          faceRecognitionNet: { 
            loadFromUri: async () => {
              console.log('Mock: faceRecognitionNet.loadFromUri called')
              window.faceapi.nets.faceRecognitionNet.isLoaded = true
              return Promise.resolve()
            },
            isLoaded: false
          }
        },
        TinyFaceDetectorOptions: function(options?: any) { 
          return { inputSize: 416, scoreThreshold: 0.5 }
        }
      }
      
    }, emotions)
    
    // Mock face-api model loading from CDN
    await this.page.route('**/model/**', async route => {
      // Return empty successful response for all model files
      await route.fulfill({
        status: 200,
        contentType: 'application/octet-stream',
        body: Buffer.from('mock-model-data')
      })
    })
  }

  /**
   * Mock face-api.js with no face detected
   */
  async mockNoFaceDetected() {
    await this.page.addInitScript(() => {
      window.faceapi = {
        detectAllFaces: () => [], // No faces detected
        detectSingleFace: (element: any, options?: any) => {
          return {
            withFaceExpressions: () => Promise.resolve(null) // No face detected
          }
        },
        nets: {
          tinyFaceDetector: { 
            loadFromUri: async () => {
              window.faceapi.nets.tinyFaceDetector.isLoaded = true
              return Promise.resolve()
            },
            isLoaded: false
          },
          faceExpressionNet: { 
            loadFromUri: async () => {
              window.faceapi.nets.faceExpressionNet.isLoaded = true
              return Promise.resolve()
            },
            isLoaded: false
          },
          faceLandmark68Net: { 
            loadFromUri: async () => {
              window.faceapi.nets.faceLandmark68Net.isLoaded = true
              return Promise.resolve()
            },
            isLoaded: false
          },
          faceRecognitionNet: { 
            loadFromUri: async () => {
              window.faceapi.nets.faceRecognitionNet.isLoaded = true
              return Promise.resolve()
            },
            isLoaded: false
          }
        },
        TinyFaceDetectorOptions: function() { return {} }
      }
    })
    
    // Mock face-api model loading from CDN
    await this.page.route('**/model/**', async route => {
      // Return empty successful response for all model files
      await route.fulfill({
        status: 200,
        contentType: 'application/octet-stream',
        body: Buffer.from('mock-model-data')
      })
    })
  }

  /**
   * Fill demographic form with test data
   */
  async fillDemographicForm(data: {
    age?: string
    gender?: string
    race?: string
    ethnicity?: string
    nationality?: string
  } = {}) {
    const defaultData = {
      age: '25-34',
      gender: 'male',
      race: 'asian',
      ethnicity: 'Not Hispanic or Latino',
      nationality: 'United States'
    }

    const formData = { ...defaultData, ...data }

    // Wait for form to be visible
    await this.page.waitForSelector('[role="dialog"]', { timeout: 10000 })

    // Fill age select (Radix UI Select) - wait for each to close before opening next
    const ageSelect = this.page.locator('#age')
    await ageSelect.click()
    await this.page.getByRole('option', { name: formData.age, exact: true }).click()
    await this.page.waitForTimeout(300) // Wait for dropdown to close

    // Fill gender select - use exact value match from DemographicForm options
    const genderSelect = this.page.locator('#gender')
    await genderSelect.click()
    // Map lowercase to exact option text from DemographicForm
    const genderMap: { [key: string]: string } = {
      'male': 'Male',
      'female': 'Female',
      'non-binary': 'Non-binary',
      'other': 'Other',
      'prefer-not-to-say': 'Prefer not to say'
    }
    const genderOption = genderMap[formData.gender.toLowerCase()] || formData.gender
    await this.page.getByRole('option', { name: genderOption, exact: true }).click()
    await this.page.waitForTimeout(300) // Wait for dropdown to close

    // Fill race select - use exact value match from DemographicForm options
    const raceSelect = this.page.locator('#race')
    await raceSelect.click()
    // Map lowercase to exact option text from DemographicForm
    const raceMap: { [key: string]: string } = {
      'asian': 'Asian',
      'black': 'Black or African American',
      'white': 'White or Caucasian',
      'hispanic': 'Hispanic or Latino',
      'native-american': 'Native American or Alaska Native',
      'pacific-islander': 'Native Hawaiian or Pacific Islander',
      'multiracial': 'Multiracial',
      'other': 'Other',
      'prefer-not-to-say': 'Prefer not to say'
    }
    const raceOption = raceMap[formData.race.toLowerCase()] || formData.race
    await this.page.getByRole('option', { name: raceOption, exact: true }).click()
    await this.page.waitForTimeout(300) // Wait for dropdown to close

    // Fill ethnicity input
    const ethnicityField = this.page.locator('#ethnicity')
    await ethnicityField.fill(formData.ethnicity)

    // Fill nationality input (required field)
    const nationalityField = this.page.locator('#nationality')
    await nationalityField.fill(formData.nationality)

    // Wait a moment for all fields to be filled
    await this.page.waitForTimeout(500)
  }

  /**
   * Admin login helper
   */
  async loginAsAdmin(credentials = { email: 'john@expectedx.com', password: 'admin' }) {
    await this.page.goto('/')
    await this.page.getByText('Admin Dashboard').click()
    
    // Wait for the login form to appear
    await this.page.waitForSelector('input[type="email"], input[name="email"], #email', { timeout: 5000 })
    
    const emailField = this.page.locator('input[type="email"], input[name="email"], #email').first()
    const passwordField = this.page.locator('input[type="password"], input[name="password"], #password').first()
    
    await emailField.fill(credentials.email)
    await passwordField.fill(credentials.password)
    await this.page.getByRole('button', { name: /login|sign in/i }).click()
  }

  /**
   * Wait for video element to be ready
   */
  async waitForVideoReady() {
    // In test environment, just wait a bit for the webcam to initialize
    // The mock stream should resolve quickly
    await this.page.waitForTimeout(1000)
    
    // Check that we're on the webcam setup page
    await expect(this.page.getByText(/position yourself/i)).toBeVisible()
  }

  /**
   * Mock network request for API testing
   */
  async mockApiResponse(endpoint: string, response: any, status = 200) {
    await this.page.route(`**${endpoint}`, async route => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      })
    })
  }

  /**
   * Mock network failure for error testing
   */
  async mockNetworkFailure(endpoint: string) {
    await this.page.route(`**${endpoint}`, async route => {
      await route.abort('failed')
    })
  }

  /**
   * Measure performance metrics
   */
  async measurePerformance() {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')
      const fcp = paint.find(entry => entry.name === 'first-contentful-paint')
      const lcp = paint.find(entry => entry.name === 'largest-contentful-paint')
      
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstContentfulPaint: fcp?.startTime || 0,
        largestContentfulPaint: lcp?.startTime || 0,
        memoryUsage: (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        } : null
      }
    })
    
    return metrics
  }

  /**
   * Check for console errors
   */
  async getConsoleErrors() {
    const errors: string[] = []
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    this.page.on('pageerror', error => {
      errors.push(error.message)
    })
    
    return errors
  }

  /**
   * Wait for element to be visible with timeout
   */
  async waitForElementWithText(text: string | RegExp, timeout = 5000) {
    await this.page.waitForSelector(`text=${text}`, { timeout })
  }

  /**
   * Take screenshot with timestamp
   */
  async takeTimestampedScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    })
  }

  /**
   * Handle experiment instructions modal
   */
  async acceptExperimentInstructions() {
    // Look for experiment instructions modal
    const instructionsModal = this.page.locator('[role="dialog"]', { hasText: /instruction|experiment|video/i })
    
    if (await instructionsModal.isVisible()) {
      // Click the Ready button in the modal
      await this.page.getByRole('button', { name: /ready|start|begin|continue/i }).last().click()
      
      // Wait for modal to close
      await expect(instructionsModal).not.toBeVisible()
    }
  }

  /**
   * Check privacy modal acceptance
   */
  async acceptPrivacyModal() {
    // Look for privacy modal
    const privacyModal = this.page.locator('[role="dialog"]', { hasText: /privacy|consent|terms/i })
    
    if (await privacyModal.isVisible()) {
      // Scroll to bottom if needed
      const scrollContainer = privacyModal.locator('[data-radix-scroll-area-viewport], .scroll-container').first()
      if (await scrollContainer.isVisible()) {
        await scrollContainer.evaluate(el => {
          el.scrollTop = el.scrollHeight
        })
      }
      
      // Accept privacy terms
      await this.page.getByRole('button', { name: /accept|agree|continue/i }).click()
      
      // Wait for modal to close
      await expect(privacyModal).not.toBeVisible()
    }
  }

  /**
   * Verify sentiment analysis data display
   */
  async verifySentimentDisplay() {
    // Check for sentiment emotion labels
    const emotions = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']
    
    for (const emotion of emotions) {
      const emotionElement = this.page.getByText(new RegExp(emotion, 'i'))
      await expect(emotionElement).toBeVisible()
    }
    
    // Check for percentage or confidence values
    await expect(this.page.locator('[data-testid*="sentiment"], [class*="sentiment"], text=/\\d+%/')).toBeVisible()
  }

  /**
   * Simulate Big Buck Bunny video playback
   */
  async mockExperimentVideo() {
    await this.page.addInitScript(() => {
      // Mock video element behavior
      const originalCreateElement = document.createElement
      document.createElement = function(tagName: string) {
        const element = originalCreateElement.call(this, tagName)
        
        if (tagName.toLowerCase() === 'video') {
          const video = element as HTMLVideoElement
          
          // Mock video properties
          Object.defineProperties(video, {
            duration: { value: 596, writable: false }, // Big Buck Bunny duration ~10 minutes
            currentTime: { value: 0, writable: true },
            readyState: { value: 4, writable: false }, // HAVE_ENOUGH_DATA
            videoWidth: { value: 1920, writable: false },
            videoHeight: { value: 1080, writable: false }
          })
          
          // Mock video methods
          video.play = async () => {
            video.dispatchEvent(new Event('play'))
            video.dispatchEvent(new Event('playing'))
            return Promise.resolve()
          }
          
          video.pause = () => {
            video.dispatchEvent(new Event('pause'))
          }
          
          video.load = () => {
            video.dispatchEvent(new Event('loadstart'))
            video.dispatchEvent(new Event('loadedmetadata'))
            video.dispatchEvent(new Event('loadeddata'))
            video.dispatchEvent(new Event('canplay'))
            video.dispatchEvent(new Event('canplaythrough'))
          }
        }
        
        return element
      }
    })
  }
}

/**
 * Database validation helpers (for manual verification)
 */
export const DatabaseQueries = {
  /**
   * SQL query to check latest demographic entry
   */
  checkLatestDemographics: `
    SELECT * FROM user_demographics 
    ORDER BY created_at DESC LIMIT 1;
  `,
  
  /**
   * SQL query to check sentiment data
   */
  checkSentimentData: `
    SELECT uid, created_at, 
           jsonb_array_length(sentiment_data) as datapoint_count,
           sentiment_data->0 as first_datapoint
    FROM user_sentiment 
    ORDER BY created_at DESC LIMIT 1;
  `,
  
  /**
   * SQL query to check video upload
   */
  checkVideoUpload: `
    SELECT * FROM user_webcapture 
    ORDER BY created_at DESC LIMIT 1;
  `
}

/**
 * Performance thresholds based on testing checklist
 */
export const PerformanceThresholds = {
  pageLoadTime: 3000, // 3 seconds
  faceDetectionInterval: 500, // 500ms
  bundleSize: 1600000, // 1.6MB
  memoryLeakThreshold: 50 * 1024 * 1024, // 50MB increase
  lcpTarget: 2900 // 2.9s Largest Contentful Paint
}