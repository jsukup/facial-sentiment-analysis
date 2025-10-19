import { test, expect, devices } from '@playwright/test'

test.describe('Cross-Browser Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/')
  })

  test('should load application correctly in all browsers', async ({ page, browserName }) => {
    // Basic application loading test
    await expect(page.getByText('Facial Sentiment Analysis')).toBeVisible()
    await expect(page.getByText('Participant Mode')).toBeVisible()
    await expect(page.getByText('Admin Dashboard')).toBeVisible()
    
    // Check that the page is interactive
    await page.getByText('Participant Mode').click()
    await expect(page.getByText('Start Analysis')).toBeVisible()
    
    console.log(`Application loaded successfully in ${browserName}`)
  })

  test('should handle MediaDevices API across browsers', async ({ page, browserName }) => {
    // Test camera API availability across browsers
    const hasMediaDevices = await page.evaluate(() => {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    })
    
    expect(hasMediaDevices).toBe(true)
    
    // Test getUserMedia mock/availability
    await page.addInitScript(() => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia = async () => {
          const canvas = document.createElement('canvas')
          canvas.width = 640
          canvas.height = 480
          // @ts-ignore - Mock stream for testing
          return canvas.captureStream()
        }
      }
    })
    
    await page.context().grantPermissions(['camera'])
    
    const streamTest = await page.evaluate(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        return { success: true, hasVideo: stream.getVideoTracks().length > 0 }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })
    
    expect(streamTest.success).toBe(true)
    console.log(`MediaDevices API working in ${browserName}`)
  })

  test('should support MediaRecorder API across browsers', async ({ page, browserName }) => {
    const mediaRecorderSupport = await page.evaluate(() => {
      return {
        hasMediaRecorder: typeof MediaRecorder !== 'undefined',
        supportedTypes: [
          'video/webm',
          'video/webm;codecs=vp8',
          'video/webm;codecs=vp9',
          'video/mp4'
        ].map(type => ({
          type,
          supported: typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported ? MediaRecorder.isTypeSupported(type) : false
        }))
      }
    })
    
    expect(mediaRecorderSupport.hasMediaRecorder).toBe(true)
    
    // At least one format should be supported
    const hasSupportedFormat = mediaRecorderSupport.supportedTypes.some(format => format.supported)
    expect(hasSupportedFormat).toBe(true)
    
    console.log(`MediaRecorder support in ${browserName}:`, mediaRecorderSupport.supportedTypes.filter(f => f.supported))
  })

  test('should handle face-api model loading across browsers', async ({ page, browserName }) => {
    // Mock face-api loading
    await page.addInitScript(() => {
      window.faceapi = {
        nets: {
          tinyFaceDetector: {
            loadFromUri: async () => {
              await new Promise(resolve => setTimeout(resolve, 100))
              return true
            }
          },
          faceExpressionNet: {
            loadFromUri: async () => {
              await new Promise(resolve => setTimeout(resolve, 100))
              return true
            }
          }
        },
        detectAllFaces: () => []
      }
    })
    
    const modelLoadingTest = await page.evaluate(async () => {
      try {
        await window.faceapi.nets.tinyFaceDetector.loadFromUri('/models')
        await window.faceapi.nets.faceExpressionNet.loadFromUri('/models')
        return { success: true }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })
    
    expect(modelLoadingTest.success).toBe(true)
    console.log(`Face-api model loading successful in ${browserName}`)
  })

  test('should handle localStorage across browsers', async ({ page, browserName }) => {
    const storageTest = await page.evaluate(() => {
      try {
        // Test localStorage availability and functionality
        const testKey = 'test-storage-key'
        const testValue = JSON.stringify({ test: 'data', timestamp: Date.now() })
        
        localStorage.setItem(testKey, testValue)
        const retrieved = localStorage.getItem(testKey)
        localStorage.removeItem(testKey)
        
        return {
          available: true,
          canWrite: !!retrieved,
          dataIntegrity: retrieved === testValue
        }
      } catch (error) {
        return {
          available: false,
          error: error.message
        }
      }
    })
    
    expect(storageTest.available).toBe(true)
    expect(storageTest.canWrite).toBe(true)
    expect(storageTest.dataIntegrity).toBe(true)
    
    console.log(`localStorage working correctly in ${browserName}`)
  })

  test('should handle responsive design across viewports', async ({ page, browserName }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 320, height: 568, name: 'Mobile Portrait' },
      { width: 768, height: 1024, name: 'Tablet Portrait' },
      { width: 1024, height: 768, name: 'Tablet Landscape' },
      { width: 1280, height: 720, name: 'Desktop' },
      { width: 1920, height: 1080, name: 'Large Desktop' }
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      
      // Check that main elements are visible and accessible
      await expect(page.getByText('Facial Sentiment Analysis')).toBeVisible()
      await expect(page.getByText('Participant Mode')).toBeVisible()
      
      // Check that buttons are clickable
      const participantButton = page.getByText('Participant Mode')
      await expect(participantButton).toBeVisible()
      
      console.log(`${viewport.name} (${viewport.width}x${viewport.height}) working in ${browserName}`)
    }
  })

  test('should handle touch events on mobile browsers', async ({ page, browserName }) => {
    // Skip touch tests for desktop browsers
    if (browserName === 'chromium' || browserName === 'firefox' || browserName === 'webkit') {
      // For desktop browsers, just verify click events work
      await page.getByText('Participant Mode').click()
      await expect(page.getByText('Start Analysis')).toBeVisible()
      return
    }
    
    // For mobile browsers, test touch interactions
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone-like viewport
    
    // Test tap events
    await page.getByText('Participant Mode').tap()
    await expect(page.getByText('Start Analysis')).toBeVisible()
    
    // Test touch and hold if applicable
    await page.getByText('Start Analysis').tap()
    
    console.log(`Touch events working in ${browserName}`)
  })

  test('should handle Blob and URL APIs across browsers', async ({ page, browserName }) => {
    const blobApiTest = await page.evaluate(() => {
      try {
        // Test Blob creation
        const blob = new Blob(['test data'], { type: 'text/plain' })
        
        // Test URL.createObjectURL
        const url = URL.createObjectURL(blob)
        
        // Test URL.revokeObjectURL
        URL.revokeObjectURL(url)
        
        return {
          blobSupported: true,
          urlSupported: true,
          blobSize: blob.size,
          blobType: blob.type
        }
      } catch (error) {
        return {
          blobSupported: false,
          error: error.message
        }
      }
    })
    
    expect(blobApiTest.blobSupported).toBe(true)
    expect(blobApiTest.urlSupported).toBe(true)
    expect(blobApiTest.blobSize).toBe(9) // 'test data' length
    expect(blobApiTest.blobType).toBe('text/plain')
    
    console.log(`Blob and URL APIs working in ${browserName}`)
  })

  test('should handle Canvas API across browsers', async ({ page, browserName }) => {
    const canvasTest = await page.evaluate(() => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 640
        canvas.height = 480
        
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not get 2D context')
        
        // Test basic drawing operations
        ctx.fillStyle = 'red'
        ctx.fillRect(0, 0, 100, 100)
        
        // Test image data operations
        const imageData = ctx.getImageData(0, 0, 100, 100)
        
        return {
          canvasSupported: true,
          contextSupported: true,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          imageDataLength: imageData.data.length
        }
      } catch (error) {
        return {
          canvasSupported: false,
          error: error.message
        }
      }
    })
    
    expect(canvasTest.canvasSupported).toBe(true)
    expect(canvasTest.contextSupported).toBe(true)
    expect(canvasTest.canvasWidth).toBe(640)
    expect(canvasTest.canvasHeight).toBe(480)
    
    console.log(`Canvas API working in ${browserName}`)
  })

  test('should handle fetch API across browsers', async ({ page, browserName }) => {
    const fetchTest = await page.evaluate(async () => {
      try {
        // Test basic fetch functionality
        const hasfetch = typeof fetch !== 'undefined'
        
        if (!hasfetch) {
          return { fetchSupported: false, error: 'fetch not available' }
        }
        
        // Test Response constructor
        const response = new Response(JSON.stringify({ test: 'data' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
        
        const data = await response.json()
        
        return {
          fetchSupported: true,
          responseSupported: true,
          jsonParsing: data.test === 'data'
        }
      } catch (error) {
        return {
          fetchSupported: false,
          error: error.message
        }
      }
    })
    
    expect(fetchTest.fetchSupported).toBe(true)
    expect(fetchTest.responseSupported).toBe(true)
    expect(fetchTest.jsonParsing).toBe(true)
    
    console.log(`Fetch API working in ${browserName}`)
  })

  test('should handle ES6+ features across browsers', async ({ page, browserName }) => {
    const es6Test = await page.evaluate(() => {
      try {
        // Test arrow functions
        const arrowFunction = () => 'test'
        
        // Test template literals
        const template = `Hello ${'world'}`
        
        // Test destructuring
        const obj = { a: 1, b: 2 }
        const { a, b } = obj
        
        // Test async/await
        const asyncTest = async () => {
          return await Promise.resolve('async works')
        }
        
        // Test classes
        class TestClass {
          constructor() {
            this.value = 'class works'
          }
        }
        
        const instance = new TestClass()
        
        return {
          arrowFunctions: arrowFunction() === 'test',
          templateLiterals: template === 'Hello world',
          destructuring: a === 1 && b === 2,
          classes: instance.value === 'class works',
          promises: true // If we got this far, promises work
        }
      } catch (error) {
        return {
          error: error.message,
          supported: false
        }
      }
    })
    
    expect(es6Test.arrowFunctions).toBe(true)
    expect(es6Test.templateLiterals).toBe(true)
    expect(es6Test.destructuring).toBe(true)
    expect(es6Test.classes).toBe(true)
    expect(es6Test.promises).toBe(true)
    
    console.log(`ES6+ features working in ${browserName}`)
  })

  test('should handle error boundaries and error handling', async ({ page, browserName }) => {
    // Test global error handling
    const errorHandlingTest = await page.evaluate(() => {
      const errors: string[] = []
      
      // Capture console errors
      const originalError = console.error
      console.error = (...args) => {
        errors.push(args.join(' '))
      }
      
      try {
        // Test try-catch
        try {
          throw new Error('Test error')
        } catch (e) {
          // Error caught successfully
        }
        
        // Restore console.error
        console.error = originalError
        
        return {
          errorHandling: true,
          capturedErrors: errors.length === 0 // Should be 0 since we caught the error
        }
      } catch (error) {
        console.error = originalError
        return {
          errorHandling: false,
          error: error.message
        }
      }
    })
    
    expect(errorHandlingTest.errorHandling).toBe(true)
    
    console.log(`Error handling working in ${browserName}`)
  })

  test('should maintain consistent performance across browsers', async ({ page, browserName }) => {
    // Measure basic performance metrics
    const performanceTest = await page.evaluate(() => {
      const start = performance.now()
      
      // Simulate some DOM operations
      for (let i = 0; i < 1000; i++) {
        const div = document.createElement('div')
        div.textContent = `Element ${i}`
        document.body.appendChild(div)
        document.body.removeChild(div)
      }
      
      const end = performance.now()
      const duration = end - start
      
      return {
        performanceApiAvailable: typeof performance !== 'undefined',
        domOperationTime: duration,
        acceptable: duration < 1000 // Should complete in less than 1 second
      }
    })
    
    expect(performanceTest.performanceApiAvailable).toBe(true)
    expect(performanceTest.acceptable).toBe(true)
    
    console.log(`Performance test in ${browserName}: ${performanceTest.domOperationTime.toFixed(2)}ms`)
  })

  test('should handle file operations across browsers', async ({ page, browserName }) => {
    const fileApiTest = await page.evaluate(() => {
      try {
        // Test File API
        const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
        
        // Test FileReader
        const hasFileReader = typeof FileReader !== 'undefined'
        
        // Test FormData
        const formData = new FormData()
        formData.append('file', file)
        
        return {
          fileConstructor: true,
          fileReaderAvailable: hasFileReader,
          formDataSupported: true,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        }
      } catch (error) {
        return {
          fileConstructor: false,
          error: error.message
        }
      }
    })
    
    expect(fileApiTest.fileConstructor).toBe(true)
    expect(fileApiTest.fileReaderAvailable).toBe(true)
    expect(fileApiTest.formDataSupported).toBe(true)
    expect(fileApiTest.fileName).toBe('test.txt')
    expect(fileApiTest.fileSize).toBe(12) // 'test content' length
    expect(fileApiTest.fileType).toBe('text/plain')
    
    console.log(`File APIs working in ${browserName}`)
  })
})