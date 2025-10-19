import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Sentiment Analysis Workflow Integration', () => {
  let mockMediaStream: any
  let mockMediaRecorder: any
  let mockVideoElement: any
  let sentimentDataCollector: any[]
  
  beforeEach(() => {
    // Reset sentiment data collector
    sentimentDataCollector = []
    
    // Mock MediaStream
    mockMediaStream = {
      getTracks: vi.fn(() => [
        {
          stop: vi.fn(),
          kind: 'video',
          label: 'Mock Camera',
          readyState: 'live'
        }
      ]),
      active: true
    }
    
    // Mock MediaRecorder
    mockMediaRecorder = {
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      state: 'inactive',
      stream: mockMediaStream,
      ondataavailable: null,
      onstop: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }
    
    global.MediaRecorder = vi.fn(() => mockMediaRecorder) as any
    
    // Mock getUserMedia
    navigator.mediaDevices = {
      ...navigator.mediaDevices,
      getUserMedia: vi.fn().mockResolvedValue(mockMediaStream)
    }
    
    // Mock video element
    mockVideoElement = {
      srcObject: null,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      currentTime: 0,
      duration: 10,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      width: 640,
      height: 480
    }
    
    // Mock face-api
    global.faceapi = {
      detectAllFaces: vi.fn().mockReturnValue([{
        expressions: {
          neutral: 0.4,
          happy: 0.3,
          sad: 0.1,
          angry: 0.1,
          fearful: 0.05,
          disgusted: 0.03,
          surprised: 0.02
        }
      }]),
      nets: {
        tinyFaceDetector: { loadFromUri: vi.fn().mockResolvedValue(true) },
        faceExpressionNet: { loadFromUri: vi.fn().mockResolvedValue(true) }
      },
      TinyFaceDetectorOptions: vi.fn()
    }
    
    // Mock canvas for face detection
    global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn()
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  it('should initialize camera stream successfully', async () => {
    const initializeCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        mockVideoElement.srcObject = stream
        await mockVideoElement.play()
        return { success: true, stream }
      } catch (error) {
        return { success: false, error }
      }
    }

    const result = await initializeCamera()
    
    expect(result.success).toBe(true)
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true })
    expect(mockVideoElement.srcObject).toBe(mockMediaStream)
    expect(mockVideoElement.play).toHaveBeenCalled()
  })

  it('should load face-api models successfully', async () => {
    const loadModels = async () => {
      try {
        await Promise.all([
          global.faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          global.faceapi.nets.faceExpressionNet.loadFromUri('/models')
        ])
        return { success: true }
      } catch (error) {
        return { success: false, error }
      }
    }

    const result = await loadModels()
    
    expect(result.success).toBe(true)
    expect(global.faceapi.nets.tinyFaceDetector.loadFromUri).toHaveBeenCalledWith('/models')
    expect(global.faceapi.nets.faceExpressionNet.loadFromUri).toHaveBeenCalledWith('/models')
  })

  it('should detect faces and extract sentiment data', async () => {
    const detectSentiment = async () => {
      // Simulate face detection on video frame
      const detections = await global.faceapi.detectAllFaces(mockVideoElement)
      
      if (detections.length > 0) {
        const expressions = detections[0].expressions
        const timestamp = Date.now()
        
        return {
          timestamp,
          expressions,
          faceCount: detections.length
        }
      }
      
      return null
    }

    const sentimentData = await detectSentiment()
    
    expect(sentimentData).not.toBeNull()
    expect(sentimentData).toHaveProperty('timestamp')
    expect(sentimentData).toHaveProperty('expressions')
    expect(sentimentData).toHaveProperty('faceCount')
    expect(sentimentData!.faceCount).toBe(1)
    
    // Validate expression structure
    const expressions = sentimentData!.expressions
    expect(expressions).toHaveProperty('neutral')
    expect(expressions).toHaveProperty('happy')
    expect(expressions).toHaveProperty('sad')
    expect(expressions).toHaveProperty('angry')
    expect(expressions).toHaveProperty('fearful')
    expect(expressions).toHaveProperty('disgusted')
    expect(expressions).toHaveProperty('surprised')
  })

  it('should handle continuous sentiment analysis with data collection', async () => {
    const startContinuousAnalysis = () => {
      const analysisInterval = setInterval(async () => {
        const detections = await global.faceapi.detectAllFaces(mockVideoElement)
        
        if (detections.length > 0) {
          const sentimentData = {
            timestamp: Date.now(),
            expressions: detections[0].expressions
          }
          sentimentDataCollector.push(sentimentData)
        }
      }, 100) // 10 FPS analysis
      
      return analysisInterval
    }

    const intervalId = startContinuousAnalysis()
    
    // Let it run for a short time
    await new Promise(resolve => setTimeout(resolve, 350))
    
    clearInterval(intervalId)
    
    // Should have collected multiple data points
    expect(sentimentDataCollector.length).toBeGreaterThan(0)
    expect(sentimentDataCollector.length).toBeLessThanOrEqual(4) // Max 4 samples in 350ms at 100ms intervals
    
    // Validate data structure
    sentimentDataCollector.forEach(data => {
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('expressions')
      expect(typeof data.timestamp).toBe('number')
      expect(typeof data.expressions).toBe('object')
    })
  })

  it('should record video while analyzing sentiment', async () => {
    const startRecording = () => {
      const recorder = new MediaRecorder(mockMediaStream)
      const chunks: Blob[] = []
      
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        return blob
      }
      
      recorder.start()
      return recorder
    }

    const recorder = startRecording()
    
    expect(global.MediaRecorder).toHaveBeenCalledWith(mockMediaStream)
    expect(recorder.start).toHaveBeenCalled()
    
    // Simulate recording for a short time
    await new Promise(resolve => setTimeout(resolve, 100))
    
    recorder.stop()
    expect(recorder.stop).toHaveBeenCalled()
  })

  it('should handle memory management during long analysis sessions', async () => {
    const MAX_DATA_POINTS = 1000
    let longTermDataCollector: any[] = []
    
    const addDataWithMemoryManagement = (newData: any) => {
      longTermDataCollector.push(newData)
      
      // Prevent memory leaks by limiting data points
      if (longTermDataCollector.length > MAX_DATA_POINTS) {
        longTermDataCollector = longTermDataCollector.slice(-MAX_DATA_POINTS)
      }
      
      return longTermDataCollector.length
    }

    // Simulate adding many data points
    for (let i = 0; i < 1005; i++) {
      const mockData = {
        timestamp: Date.now() + i,
        expressions: {
          neutral: 0.5 + (i % 10) * 0.05,
          happy: 0.3,
          sad: 0.1,
          angry: 0.05,
          fearful: 0.02,
          disgusted: 0.02,
          surprised: 0.01
        }
      }
      
      addDataWithMemoryManagement(mockData)
    }

    // Should be limited to MAX_DATA_POINTS
    expect(longTermDataCollector.length).toBe(MAX_DATA_POINTS)
    
    // Should contain the most recent data
    const lastItem = longTermDataCollector[longTermDataCollector.length - 1]
    expect(lastItem.timestamp).toBe(Date.now() + 1004)
  })

  it('should handle analysis errors gracefully', async () => {
    // Mock face detection failure
    global.faceapi.detectAllFaces = vi.fn().mockRejectedValue(new Error('Detection failed'))
    
    const robustSentimentAnalysis = async () => {
      try {
        const detections = await global.faceapi.detectAllFaces(mockVideoElement)
        return { success: true, data: detections }
      } catch (error) {
        console.warn('Face detection failed:', error)
        return { success: false, error: error.message }
      }
    }

    const result = await robustSentimentAnalysis()
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('Detection failed')
    
    // Should not crash the application
    expect(() => robustSentimentAnalysis()).not.toThrow()
  })

  it('should export sentiment data in correct format', async () => {
    // Add some test data
    const testData = [
      {
        timestamp: Date.now(),
        expressions: { neutral: 0.6, happy: 0.2, sad: 0.1, angry: 0.05, fearful: 0.02, disgusted: 0.02, surprised: 0.01 }
      },
      {
        timestamp: Date.now() + 1000,
        expressions: { neutral: 0.3, happy: 0.5, sad: 0.1, angry: 0.05, fearful: 0.02, disgusted: 0.02, surprised: 0.01 }
      }
    ]

    const exportToCSV = (data: any[]) => {
      const headers = ['timestamp', 'neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']
      const csvRows = [headers.join(',')]
      
      data.forEach(item => {
        const row = [
          item.timestamp,
          item.expressions.neutral,
          item.expressions.happy,
          item.expressions.sad,
          item.expressions.angry,
          item.expressions.fearful,
          item.expressions.disgusted,
          item.expressions.surprised
        ]
        csvRows.push(row.join(','))
      })
      
      return csvRows.join('\n')
    }

    const exportToJSON = (data: any[]) => {
      return JSON.stringify({
        exportDate: new Date().toISOString(),
        dataPoints: data.length,
        data: data
      }, null, 2)
    }

    const csvData = exportToCSV(testData)
    const jsonData = exportToJSON(testData)
    
    // Validate CSV format
    expect(csvData).toContain('timestamp,neutral,happy,sad,angry,fearful,disgusted,surprised')
    expect(csvData.split('\n').length).toBe(3) // Header + 2 data rows
    
    // Validate JSON format
    const parsedJson = JSON.parse(jsonData)
    expect(parsedJson).toHaveProperty('exportDate')
    expect(parsedJson).toHaveProperty('dataPoints')
    expect(parsedJson).toHaveProperty('data')
    expect(parsedJson.dataPoints).toBe(2)
    expect(parsedJson.data).toHaveLength(2)
  })

  it('should cleanup resources properly on analysis stop', async () => {
    const cleanup = () => {
      // Stop media recorder if active
      if (mockMediaRecorder && mockMediaRecorder.state !== 'inactive') {
        mockMediaRecorder.stop()
      }
      
      // Stop camera stream
      if (mockMediaStream) {
        mockMediaStream.getTracks().forEach((track: any) => track.stop())
      }
      
      // Clear video element
      if (mockVideoElement) {
        mockVideoElement.srcObject = null
      }
      
      // Clear data collectors
      sentimentDataCollector.length = 0
      
      return true
    }

    // Start some resources
    mockMediaRecorder.state = 'recording'
    mockVideoElement.srcObject = mockMediaStream
    sentimentDataCollector.push({ test: 'data' })
    
    const cleanupResult = cleanup()
    
    expect(cleanupResult).toBe(true)
    expect(mockMediaRecorder.stop).toHaveBeenCalled()
    expect(mockMediaStream.getTracks).toHaveBeenCalled()
    expect(mockVideoElement.srcObject).toBeNull()
    expect(sentimentDataCollector.length).toBe(0)
  })

  it('should handle real-time emotion classification', async () => {
    const classifyDominantEmotion = (expressions: any) => {
      const emotions = Object.entries(expressions)
      const dominant = emotions.reduce((prev, current) => 
        prev[1] > current[1] ? prev : current
      )
      
      return {
        emotion: dominant[0],
        confidence: dominant[1]
      }
    }

    const testExpressions = {
      neutral: 0.1,
      happy: 0.7,
      sad: 0.1,
      angry: 0.05,
      fearful: 0.02,
      disgusted: 0.02,
      surprised: 0.01
    }

    const classification = classifyDominantEmotion(testExpressions)
    
    expect(classification.emotion).toBe('happy')
    expect(classification.confidence).toBe(0.7)
    expect(classification.confidence).toBeGreaterThan(0.5) // High confidence threshold
  })

  it('should handle analysis rate limiting for performance', async () => {
    let lastAnalysisTime = 0
    const ANALYSIS_THROTTLE_MS = 200 // Limit to 5 FPS
    
    const throttledAnalysis = async () => {
      const now = Date.now()
      
      if (now - lastAnalysisTime < ANALYSIS_THROTTLE_MS) {
        return { skipped: true, reason: 'throttled' }
      }
      
      lastAnalysisTime = now
      
      // Perform actual analysis
      const detections = await global.faceapi.detectAllFaces(mockVideoElement)
      return { skipped: false, detections }
    }

    // Try rapid analysis calls
    const results = []
    for (let i = 0; i < 5; i++) {
      results.push(await throttledAnalysis())
      await new Promise(resolve => setTimeout(resolve, 50)) // 50ms between calls
    }

    // Most calls should be throttled
    const skippedCount = results.filter(r => r.skipped).length
    const processedCount = results.filter(r => !r.skipped).length
    
    expect(skippedCount).toBeGreaterThan(processedCount)
    expect(processedCount).toBeLessThanOrEqual(2) // Should process at most 2 in 250ms with 200ms throttle
  })
})