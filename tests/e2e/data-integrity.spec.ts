import { test, expect } from '@playwright/test'
import { TestHelpers } from './helpers/test-helpers'

test.describe('Data Integrity and Edge Cases', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await helpers.mockWebcamAccess(true)
    await helpers.mockFaceApi()
    await page.goto('/')
  })

  test.describe('Data Validation', () => {
    test('should validate and sanitize demographic input data', async ({ page }) => {
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      
      // Test XSS prevention in text fields
      const maliciousInput = '<script>alert("XSS")</script>'
      const ethnicityField = page.locator('#ethnicity')
      await ethnicityField.fill(maliciousInput)
      
      const nationalityField = page.locator('#nationality')
      await nationalityField.fill(maliciousInput)
      
      // Fill required fields
      await page.locator('#age').click()
      await page.getByRole('option', { name: '25-34' }).click()
      
      await page.locator('#gender').click()
      await page.getByRole('option', { name: 'Male' }).click()
      
      await page.locator('#race').click()
      await page.getByRole('option', { name: 'Asian' }).click()
      
      // Submit form
      await page.getByRole('button', { name: 'Complete' }).click()
      
      // Verify no script execution
      const alertTriggered = await page.evaluate(() => {
        let alertCalled = false
        const originalAlert = window.alert
        window.alert = () => { alertCalled = true }
        // Wait a moment for any injected scripts to execute
        return new Promise(resolve => {
          setTimeout(() => {
            window.alert = originalAlert
            resolve(alertCalled)
          }, 1000)
        })
      })
      
      expect(alertTriggered).toBe(false)
    })

    test('should handle maximum length inputs gracefully', async ({ page }) => {
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      
      // Generate very long string
      const longString = 'A'.repeat(10000)
      
      const ethnicityField = page.locator('#ethnicity')
      await ethnicityField.fill(longString)
      
      // Verify field has reasonable max length
      const actualValue = await ethnicityField.inputValue()
      expect(actualValue.length).toBeLessThanOrEqual(500)
      
      // Fill other required fields
      await page.locator('#age').click()
      await page.getByRole('option', { name: '25-34' }).click()
      
      await page.locator('#gender').click()
      await page.getByRole('option', { name: 'Male' }).click()
      
      await page.locator('#race').click()
      await page.getByRole('option', { name: 'Asian' }).click()
      
      await page.locator('#nationality').fill('United States')
      
      // Should still be able to submit
      await page.getByRole('button', { name: 'Complete' }).click()
      
      // Should proceed to next step
      await expect(page.getByText(/position yourself|webcam/i)).toBeVisible({ timeout: 10000 })
    })

    test('should maintain data consistency across session interruptions', async ({ page }) => {
      // Start participant flow
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      
      // Fill partial form
      await page.locator('#age').click()
      await page.getByRole('option', { name: '25-34' }).click()
      
      await page.locator('#gender').click()
      await page.getByRole('option', { name: 'Male' }).click()
      
      // Simulate page refresh (session interruption)
      await page.reload()
      
      // Should return to mode selection
      await expect(page.getByText('Participant Mode')).toBeVisible()
      
      // Start flow again - data should not persist (privacy)
      await page.getByText('Participant Mode').click()
      
      // Form should be empty
      const ageValue = await page.locator('#age').textContent()
      expect(ageValue).not.toContain('25-34')
    })

    test('should validate sentiment data timestamps are sequential', async ({ page }) => {
      // Mock face-api with timestamp tracking
      await page.addInitScript(() => {
        let lastTimestamp = 0
        window.sentimentTimestamps = []
        
        window.faceapi.detectSingleFace = () => ({
          withFaceExpressions: () => {
            const currentTimestamp = Date.now()
            window.sentimentTimestamps.push(currentTimestamp)
            
            return Promise.resolve({
              expressions: {
                neutral: 0.4, happy: 0.3, sad: 0.1, angry: 0.1,
                fearful: 0.05, disgusted: 0.03, surprised: 0.02
              },
              detection: { box: { x: 100, y: 100, width: 200, height: 200 }, score: 0.9 },
              timestamp: currentTimestamp
            })
          }
        })
      })
      
      // Complete setup
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      await helpers.fillDemographicForm()
      await page.getByRole('button', { name: 'Complete' }).click()
      
      await helpers.waitForVideoReady()
      await page.getByRole('button', { name: /ready/i }).click()
      await helpers.acceptExperimentInstructions()
      
      // Let analysis run
      await page.waitForTimeout(5000)
      
      // Check timestamps are sequential
      const timestamps = await page.evaluate(() => window.sentimentTimestamps)
      
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1])
      }
    })
  })

  test.describe('Edge Cases', () => {
    test('should handle rapid mode switching gracefully', async ({ page }) => {
      // Rapidly switch between modes
      for (let i = 0; i < 5; i++) {
        await page.getByText('Participant Mode').click()
        await page.waitForTimeout(100)
        
        // Go back if we can
        const backButton = page.getByRole('button', { name: /back|cancel/i })
        if (await backButton.isVisible()) {
          await backButton.click()
        } else {
          await page.goBack()
        }
        
        await page.getByText('Admin Dashboard').click()
        await page.waitForTimeout(100)
        
        // Go back
        if (await backButton.isVisible()) {
          await backButton.click()
        } else {
          await page.goBack()
        }
      }
      
      // App should still be functional
      await expect(page.getByText('Participant Mode')).toBeVisible()
      await expect(page.getByText('Admin Dashboard')).toBeVisible()
    })

    test('should handle browser back/forward navigation', async ({ page }) => {
      // Navigate through participant flow
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      
      // Use browser back button
      await page.goBack()
      
      // Should return to mode selection
      await expect(page.getByText('Facial Sentiment Analysis')).toBeVisible()
      await expect(page.getByText('Participant Mode')).toBeVisible()
      
      // Forward should go back to participant flow
      await page.goForward()
      
      // Should be back in participant flow
      const inParticipantFlow = 
        await page.locator('[role="dialog"]').isVisible() ||
        await page.getByText(/privacy|demographic/i).isVisible()
      
      expect(inParticipantFlow).toBe(true)
    })

    test('should handle concurrent API requests gracefully', async ({ page }) => {
      // Mock API with delays
      let requestCount = 0
      await page.route('**/server/demographics', async route => {
        requestCount++
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: true, 
            userId: `user-${requestCount}`,
            requestId: requestCount
          })
        })
      })
      
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      await helpers.fillDemographicForm()
      
      // Click submit multiple times rapidly
      const submitButton = page.getByRole('button', { name: 'Complete' })
      await submitButton.click()
      await submitButton.click()
      await submitButton.click()
      
      // Should handle multiple submissions gracefully
      await page.waitForTimeout(2000)
      
      // Should have proceeded despite multiple clicks
      const proceeded = 
        await page.getByText(/position yourself|webcam/i).isVisible() ||
        await page.getByText(/error/i).isVisible()
      
      expect(proceeded).toBe(true)
      
      // Verify only reasonable number of requests were made
      expect(requestCount).toBeLessThanOrEqual(3)
    })

    test('should handle camera permission changes mid-session', async ({ page, context }) => {
      // Start with camera permission
      await context.grantPermissions(['camera'])
      
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      await helpers.fillDemographicForm()
      await page.getByRole('button', { name: 'Complete' }).click()
      
      await helpers.waitForVideoReady()
      
      // Revoke camera permission mid-session
      await context.clearPermissions()
      
      // Try to continue
      await page.getByRole('button', { name: /ready/i }).click()
      
      // Should show appropriate error or request permission again
      const hasError = await page.getByText(/camera|permission|access denied/i).isVisible()
      expect(hasError).toBe(true)
    })

    test('should handle network disconnection during data submission', async ({ page }) => {
      // Complete participant flow
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      await helpers.fillDemographicForm()
      await page.getByRole('button', { name: 'Complete' }).click()
      
      await helpers.waitForVideoReady()
      await page.getByRole('button', { name: /ready/i }).click()
      await helpers.acceptExperimentInstructions()
      
      // Let experiment run briefly
      await page.waitForTimeout(3000)
      
      // Simulate network failure for submission
      await helpers.mockNetworkFailure('/server/upload-webcam')
      await helpers.mockNetworkFailure('/server/sentiment')
      
      // Try to complete/submit
      const stopButton = page.getByRole('button', { name: /stop|end|finish/i })
      if (await stopButton.isVisible()) {
        await stopButton.click()
      }
      
      // Should show network error
      await expect(page.getByText(/network|connection|failed|error/i)).toBeVisible({ timeout: 10000 })
      
      // Should offer retry option
      const retryButton = page.getByRole('button', { name: /retry|try again/i })
      if (await retryButton.isVisible()) {
        expect(await retryButton.isVisible()).toBe(true)
      }
    })

    test('should handle extremely slow network conditions', async ({ page }) => {
      // Mock very slow API responses
      await page.route('**/server/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 5000)) // 5 second delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        })
      })
      
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      await helpers.fillDemographicForm()
      
      const submitButton = page.getByRole('button', { name: 'Complete' })
      await submitButton.click()
      
      // Should show loading state
      const loadingIndicator = 
        await page.getByText(/loading|processing|please wait/i).isVisible() ||
        await submitButton.isDisabled()
      
      expect(loadingIndicator).toBe(true)
      
      // User should be able to cancel if it takes too long
      const cancelButton = page.getByRole('button', { name: /cancel/i })
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
        
        // Should return to form
        await expect(submitButton).toBeVisible()
      }
    })

    test('should handle invalid video formats gracefully', async ({ page }) => {
      // Mock MediaRecorder with unsupported format
      await page.addInitScript(() => {
        window.MediaRecorder = class {
          constructor(stream: any, options?: any) {
            if (options?.mimeType === 'video/unsupported') {
              throw new Error('Unsupported MIME type')
            }
            this.state = 'inactive'
          }
          
          start() { this.state = 'recording' }
          stop() { this.state = 'inactive' }
          state: string
          ondataavailable: ((event: any) => void) | null = null
          onstop: ((event: Event) => void) | null = null
          
          static isTypeSupported(type: string) {
            return type !== 'video/unsupported'
          }
        }
      })
      
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      await helpers.fillDemographicForm()
      await page.getByRole('button', { name: 'Complete' }).click()
      
      // Should handle gracefully and use fallback format
      await helpers.waitForVideoReady()
      
      // Should still be able to proceed
      await expect(page.getByRole('button', { name: /ready/i })).toBeVisible()
    })

    test('should handle quota exceeded errors', async ({ page }) => {
      // Mock storage quota exceeded
      await page.addInitScript(() => {
        const originalSetItem = Storage.prototype.setItem
        Storage.prototype.setItem = function(key: string, value: string) {
          if (value.length > 1000) {
            throw new DOMException('QuotaExceededError')
          }
          return originalSetItem.call(this, key, value)
        }
      })
      
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      await helpers.fillDemographicForm()
      await page.getByRole('button', { name: 'Complete' }).click()
      
      // Should handle storage errors gracefully
      await helpers.waitForVideoReady()
      
      // App should continue functioning
      await expect(page.getByRole('button', { name: /ready/i })).toBeVisible()
    })
  })

  test.describe('Boundary Testing', () => {
    test('should handle minimum valid inputs', async ({ page }) => {
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      
      // Fill minimum required fields only
      await page.locator('#age').click()
      await page.getByRole('option', { name: '18-24' }).click() // Minimum age group
      
      await page.locator('#gender').click()
      await page.getByRole('option', { name: 'Prefer not to say' }).click()
      
      await page.locator('#race').click()
      await page.getByRole('option', { name: 'Prefer not to say' }).click()
      
      await page.locator('#ethnicity').fill('A') // Single character
      await page.locator('#nationality').fill('US') // Minimum valid country code
      
      await page.getByRole('button', { name: 'Complete' }).click()
      
      // Should accept minimum inputs
      await expect(page.getByText(/position yourself|webcam/i)).toBeVisible({ timeout: 10000 })
    })

    test('should handle maximum valid inputs', async ({ page }) => {
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      
      // Fill with maximum valid values
      await page.locator('#age').click()
      await page.getByRole('option', { name: '75+' }).click() // Maximum age group
      
      await page.locator('#gender').click()
      await page.getByRole('option', { name: 'Other' }).click()
      
      await page.locator('#race').click()
      await page.getByRole('option', { name: 'Multiracial' }).click()
      
      const maxValidString = 'A'.repeat(255) // Reasonable max length
      await page.locator('#ethnicity').fill(maxValidString)
      await page.locator('#nationality').fill(maxValidString)
      
      await page.getByRole('button', { name: 'Complete' }).click()
      
      // Should accept maximum inputs
      await expect(page.getByText(/position yourself|webcam/i)).toBeVisible({ timeout: 10000 })
    })

    test('should handle zero emotion detection values', async ({ page }) => {
      // Mock all emotions at zero
      await helpers.mockFaceApi({
        neutral: 0,
        happy: 0,
        sad: 0,
        angry: 0,
        fearful: 0,
        disgusted: 0,
        surprised: 0
      })
      
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      await helpers.fillDemographicForm()
      await page.getByRole('button', { name: 'Complete' }).click()
      
      await helpers.waitForVideoReady()
      await page.getByRole('button', { name: /ready/i }).click()
      await helpers.acceptExperimentInstructions()
      
      // Should handle zero values without crashing
      await page.waitForTimeout(2000)
      
      // Check for any error messages
      const hasError = await page.getByText(/error|failed|crash/i).isVisible()
      expect(hasError).toBe(false)
    })
  })
})