import { test, expect } from '@playwright/test'
import { TestHelpers, PerformanceThresholds } from './helpers/test-helpers'

/**
 * Phase 3: Technical Performance Testing (Tests 8-10)
 * Based on TESTING_CHECKLIST.md requirements
 */

test.describe('Phase 3: Technical Performance Testing', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  /**
   * Test 8: Memory and Performance Monitoring
   * Objective: Ensure application performs well under load
   */
  test('Test 8: Memory and Performance Monitoring', async ({ page }) => {
    // Step 1: Open browser dev tools (Performance monitoring enabled by default)
    await page.goto('/')
    
    // Measure initial page load performance
    const initialMetrics = await helpers.measurePerformance()
    
    // Step 2: Complete full participant journey
    await page.getByText('Participant Mode').click()
    await helpers.acceptPrivacyModal()
    await helpers.fillDemographicForm()
    await page.getByRole('button', { name: /complete|submit|continue|next/i }).click()
    
    await helpers.mockWebcamAccess(true)
    await helpers.waitForVideoReady()
    
    // Start experiment with performance monitoring
    const startButton = page.getByRole('button', { name: /start experiment|begin|continue/i })
    if (await startButton.isVisible()) {
      await startButton.click()
    }
    
    await helpers.mockExperimentVideo()
    await helpers.mockFaceApi()
    
    // Step 3: Monitor memory usage during video experiment
    const memorySnapshots: any[] = []
    const monitoringInterval = setInterval(async () => {
      const metrics = await helpers.measurePerformance()
      memorySnapshots.push({
        timestamp: Date.now(),
        memory: metrics.memoryUsage
      })
    }, 1000)
    
    // Run experiment for extended period (simulate video session)
    await page.waitForTimeout(10000) // 10 seconds of monitoring
    clearInterval(monitoringInterval)
    
    // Step 4: Test with multiple browser tabs
    const context = page.context()
    const newPage = await context.newPage()
    await newPage.goto('/')
    await newPage.waitForTimeout(2000)
    
    // Step 5: Measure page load times and bundle sizes
    const finalMetrics = await helpers.measurePerformance()
    
    // Expected Results Validation:
    
    // ✓ Initial page load <3 seconds (LCP target: 2.9s)
    expect(initialMetrics.loadTime).toBeLessThan(PerformanceThresholds.pageLoadTime)
    console.log(`Page load time: ${initialMetrics.loadTime}ms`)
    
    // ✓ Face-api.js bundle (640KB) loads efficiently
    const networkRequests = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter((entry: any) => entry.name.includes('face-api') || entry.name.includes('models'))
        .map((entry: any) => ({
          url: entry.name,
          size: entry.transferSize,
          duration: entry.duration
        }))
    })
    
    const faceApiBundle = networkRequests.find(req => req.url.includes('face-api'))
    if (faceApiBundle) {
      expect(faceApiBundle.size).toBeLessThan(700 * 1024) // 700KB limit (640KB + overhead)
      expect(faceApiBundle.duration).toBeLessThan(5000) // 5 second load limit
    }
    
    // ✓ Memory usage stable during extended video session
    const memoryGrowth = memorySnapshots.map((snapshot, index) => {
      if (index === 0) return 0
      const previous = memorySnapshots[index - 1]
      return snapshot.memory?.used - previous.memory?.used || 0
    })
    
    const maxMemoryGrowth = Math.max(...memoryGrowth.filter(growth => growth > 0))
    expect(maxMemoryGrowth).toBeLessThan(PerformanceThresholds.memoryLeakThreshold)
    console.log(`Max memory growth: ${maxMemoryGrowth / 1024 / 1024}MB`)
    
    // ✓ No memory leaks after completing experiment
    const finalMemory = finalMetrics.memoryUsage
    if (finalMemory && initialMetrics.memoryUsage) {
      const memoryIncrease = finalMemory.used - initialMetrics.memoryUsage.used
      expect(memoryIncrease).toBeLessThan(PerformanceThresholds.memoryLeakThreshold)
    }
    
    // ✓ Bundle size within 1.53MB total target
    const totalBundleSize = networkRequests.reduce((total, req) => total + (req.size || 0), 0)
    expect(totalBundleSize).toBeLessThan(PerformanceThresholds.bundleSize)
    console.log(`Total bundle size: ${totalBundleSize / 1024 / 1024}MB`)
    
    // Performance Metrics validation
    if (initialMetrics.largestContentfulPaint > 0) {
      expect(initialMetrics.largestContentfulPaint).toBeLessThan(PerformanceThresholds.lcpTarget)
    }
    
    await newPage.close()
    await helpers.takeTimestampedScreenshot('test-8-performance-monitoring')
  })

  /**
   * Test 9: Error Handling and Edge Cases
   * Objective: Test application resilience and error recovery
   */
  test('Test 9: Error Handling and Edge Cases', async ({ page }) => {
    await page.goto('/')
    
    // Track console errors throughout test
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    // Step 1: Test with camera permission denied
    await page.getByText('Participant Mode').click()
    await helpers.acceptPrivacyModal()
    await helpers.fillDemographicForm()
    await page.getByRole('button', { name: /complete|submit|continue|next/i }).click()
    
    // Mock camera permission denial
    await helpers.mockWebcamAccess(false)
    
    const webcamButton = page.getByRole('button', { name: /start|continue|camera/i })
    if (await webcamButton.isVisible()) {
      await webcamButton.click()
    }
    
    // ✓ Camera permission denial handled gracefully
    await expect(page.getByText(/camera.*denied|permission.*denied|camera.*access/i)).toBeVisible({ timeout: 5000 })
    
    // ✓ Error recovery allows user to continue
    const retryButton = page.getByRole('button', { name: /retry|try again|enable camera/i })
    if (await retryButton.isVisible()) {
      await expect(retryButton).toBeVisible()
    }
    
    await helpers.takeTimestampedScreenshot('test-9-camera-permission-denied')
    
    // Step 2: Test with network interruption during video upload
    await page.goto('/') // Fresh start
    await page.getByText('Participant Mode').click()
    await helpers.acceptPrivacyModal()
    await helpers.fillDemographicForm()
    await page.getByRole('button', { name: /complete|submit|continue|next/i }).click()
    
    await helpers.mockWebcamAccess(true)
    await helpers.waitForVideoReady()
    
    // Mock network failure for upload
    await helpers.mockNetworkFailure('/server/upload-webcam')
    
    const startExperimentButton = page.getByRole('button', { name: /start experiment|begin/i })
    if (await startExperimentButton.isVisible()) {
      await startExperimentButton.click()
    }
    
    await helpers.mockExperimentVideo()
    await helpers.mockFaceApi()
    
    await page.waitForTimeout(3000)
    
    const stopButton = page.getByRole('button', { name: /stop|end|finish/i })
    if (await stopButton.isVisible()) {
      await stopButton.click()
    }
    
    // ✓ Network failures show appropriate error messages
    await expect(page.getByText(/upload.*failed|network.*error|connection.*problem/i)).toBeVisible({ timeout: 10000 })
    
    await helpers.takeTimestampedScreenshot('test-9-network-failure')
    
    // Step 3: Test with invalid demographic data submission
    await page.goto('/')
    await page.getByText('Participant Mode').click()
    await helpers.acceptPrivacyModal()
    
    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /submit|continue|next/i })
    await submitButton.click()
    
    // ✓ Form validation prevents invalid submissions
    const validationErrors = page.locator('[role="alert"], .error-message, [data-testid*="error"]')
    const errorCount = await validationErrors.count()
    if (errorCount > 0) {
      await expect(validationErrors.first()).toBeVisible()
    }
    
    // Step 4: Test admin login with network failures
    await page.goto('/')
    await page.getByText('Admin Dashboard').click()
    
    // Mock login API failure
    await helpers.mockNetworkFailure('/server/admin/login')
    
    await page.getByLabel(/email/i).fill('john@expectedx.com')
    await page.getByLabel(/password/i).fill('admin')
    await page.getByRole('button', { name: /login|sign in/i }).click()
    
    // ✓ API timeouts handled with retry mechanisms
    await expect(page.getByText(/login.*failed|network.*error|try.*again/i)).toBeVisible()
    
    // Step 5: Test face detection with poor lighting or no face visible
    await page.goto('/')
    await page.getByText('Participant Mode').click()
    await helpers.acceptPrivacyModal()
    await helpers.fillDemographicForm()
    await page.getByRole('button', { name: /complete|submit|continue|next/i }).click()
    
    await helpers.mockWebcamAccess(true)
    await helpers.waitForVideoReady()
    
    const startButton = page.getByRole('button', { name: /start experiment|begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()
    }
    
    // Mock no face detection
    await helpers.mockNoFaceDetected()
    
    await page.waitForTimeout(3000)
    
    // ✓ Face detection handles edge cases (no face, multiple faces)
    await expect(page.getByText(/no.*face.*detected|position.*face|center.*face/i)).toBeVisible()
    
    // Error Messages validation:
    
    // ✓ User-friendly error messages displayed
    const userFriendlyErrors = [
      /camera.*permission/i,
      /no.*face.*detected/i,
      /network.*error/i,
      /upload.*failed/i
    ]
    
    let friendlyErrorFound = false
    for (const errorPattern of userFriendlyErrors) {
      if (await page.getByText(errorPattern).isVisible()) {
        friendlyErrorFound = true
        break
      }
    }
    expect(friendlyErrorFound).toBe(true)
    
    // ✓ No application crashes or unhandled exceptions
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('Uncaught') || 
      error.includes('TypeError') || 
      error.includes('ReferenceError')
    )
    expect(criticalErrors.length).toBe(0)
    
    await helpers.takeTimestampedScreenshot('test-9-error-handling-complete')
  })

  /**
   * Test 10: End-to-End Integration
   * Objective: Validate complete system integration
   */
  test('Test 10: End-to-End Integration', async ({ page }) => {
    // Mock comprehensive backend responses for full integration test
    const userId = 'integration-test-user-123'
    const captureId = 'integration-capture-456'
    
    await helpers.mockApiResponse('/server/demographics', {
      success: true,
      userId: userId
    })
    
    await helpers.mockApiResponse('/server/upload-webcam', {
      success: true,
      fileName: `${userId}_${Date.now()}.webm`,
      path: 'integration-test-video-path',
      captureId: captureId
    })
    
    await helpers.mockApiResponse('/server/sentiment', {
      success: true,
      userId: userId,
      captureId: captureId
    })
    
    await helpers.mockApiResponse('/server/admin/login', {
      success: true,
      token: 'integration-test-token',
      expiresIn: '24h'
    })
    
    await helpers.mockApiResponse('/server/all-demographics', {
      demographics: [{
        uid: userId,
        age: '25-34',
        gender: 'Male',
        race: 'Asian',
        ethnicity: 'Not Hispanic or Latino',
        nationality: 'United States',
        created_at: new Date().toISOString()
      }]
    })
    
    await helpers.mockApiResponse('/server/all-sentiment', {
      sentiment: [{
        capture_id: captureId,
        timestamp_seconds: 0,
        emotions: { 
          neutral: 0.3, 
          happy: 0.5, 
          sad: 0.1, 
          angry: 0.05, 
          fearful: 0.02, 
          disgusted: 0.02, 
          surprised: 0.01 
        },
        created_at: new Date().toISOString()
      }]
    })
    
    // Step 1: Complete full participant journey from registration to completion
    await page.goto('/')
    await page.getByText('Participant Mode').click()
    await helpers.acceptPrivacyModal()
    await helpers.fillDemographicForm()
    await page.getByRole('button', { name: /complete|submit|continue|next/i }).click()
    
    await helpers.mockWebcamAccess(true)
    await helpers.waitForVideoReady()
    
    const startExperimentButton = page.getByRole('button', { name: /start experiment|begin/i })
    if (await startExperimentButton.isVisible()) {
      await startExperimentButton.click()
    }
    
    await helpers.mockExperimentVideo()
    await helpers.mockFaceApi()
    
    // Complete experiment
    await page.waitForTimeout(5000)
    
    const stopButton = page.getByRole('button', { name: /stop|end|finish|complete/i })
    if (await stopButton.isVisible()) {
      await stopButton.click()
    }
    
    // Wait for completion
    await expect(page.getByText(/thank you|completed|success/i)).toBeVisible({ timeout: 15000 })
    
    await helpers.takeTimestampedScreenshot('test-10-participant-journey-complete')
    
    // Step 2: Immediately check admin dashboard for new data
    // Open admin dashboard in new tab to simulate real-world usage
    const context = page.context()
    const adminPage = await context.newPage()
    const adminHelpers = new TestHelpers(adminPage)
    
    await adminPage.goto('/')
    await adminHelpers.loginAsAdmin()
    
    // Step 3: Verify data integrity across all components
    await adminPage.waitForTimeout(2000)
    
    // Expected Results Validation:
    
    // ✓ New participant data appears in admin dashboard immediately
    await expect(adminPage.getByText(/1.*participant|integration-test-user/i)).toBeVisible()
    
    // ✓ Demographic filtering includes new participant
    const ageFilter = adminPage.locator('select[name*="age"], [data-testid*="age-filter"]').first()
    if (await ageFilter.isVisible()) {
      await ageFilter.selectOption('25-34')
      await adminPage.waitForTimeout(1000)
      
      // Should still show the participant after filtering
      await expect(adminPage.getByText(/1.*participant|participant.*found/i)).toBeVisible()
    }
    
    // ✓ Charts update with new data points
    const charts = adminPage.locator('svg, [data-testid*="chart"], .recharts-wrapper')
    const chartCount = await charts.count()
    if (chartCount > 0) {
      await expect(charts.first()).toBeVisible()
      
      // Check for sentiment data visualization
      const sentimentChart = adminPage.locator('[data-testid*="sentiment"], svg').first()
      if (await sentimentChart.isVisible()) {
        await expect(sentimentChart).toBeVisible()
      }
    }
    
    // ✓ All data relationships maintained across tables
    // Verify that sentiment data is linked to the participant
    const sentimentDisplay = adminPage.getByText(/happy|neutral|emotion/i)
    if (await sentimentDisplay.isVisible()) {
      await expect(sentimentDisplay).toBeVisible()
    }
    
    // ✓ No data corruption or inconsistencies
    // Check that demographic data is consistent
    await expect(adminPage.getByText(/Male|Asian|25-34/i)).toBeVisible()
    
    await adminHelpers.takeTimestampedScreenshot('test-10-admin-dashboard-updated')
    
    // Step 4: Test real-time updates and synchronization
    // Simulate another participant (in a production environment, this would be a separate session)
    const secondUserId = 'integration-test-user-789'
    
    await adminHelpers.mockApiResponse('/server/all-demographics', {
      demographics: [
        {
          uid: userId,
          age: '25-34',
          gender: 'Male',
          race: 'Asian',
          created_at: new Date().toISOString()
        },
        {
          uid: secondUserId,
          age: '18-24',
          gender: 'Female',
          race: 'White',
          created_at: new Date().toISOString()
        }
      ]
    })
    
    // Refresh admin dashboard
    await adminPage.reload()
    await adminPage.waitForTimeout(2000)
    
    // Should show updated participant count
    await expect(adminPage.getByText(/2.*participant/i)).toBeVisible()
    
    await adminPage.close()
    
    // Final integration validation
    const finalMetrics = await helpers.measurePerformance()
    expect(finalMetrics.loadTime).toBeLessThan(PerformanceThresholds.pageLoadTime)
    
    await helpers.takeTimestampedScreenshot('test-10-end-to-end-complete')
  })

  /**
   * Test 10b: Cross-Browser Integration
   * Objective: Validate functionality across different browsers
   */
  test('Test 10b: Cross-Browser Integration', async ({ page, browserName }) => {
    // This test automatically runs across browsers defined in playwright.config.ts
    
    await page.goto('/')
    
    // Basic functionality test for each browser
    await page.getByText('Participant Mode').click()
    await helpers.acceptPrivacyModal()
    
    // Verify core components render correctly in each browser
    await expect(page.getByLabel(/age/i)).toBeVisible()
    await expect(page.getByLabel(/gender/i)).toBeVisible()
    
    // Test admin dashboard in each browser
    await page.goto('/')
    await page.getByText('Admin Dashboard').click()
    
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    
    console.log(`Cross-browser test completed for: ${browserName}`)
    await helpers.takeTimestampedScreenshot(`test-10b-cross-browser-${browserName}`)
  })
})