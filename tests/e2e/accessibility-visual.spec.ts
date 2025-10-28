import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'
import { TestHelpers } from './helpers/test-helpers'

test.describe('Accessibility and Visual Regression Tests', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    
    // Setup basic mocks
    await helpers.mockWebcamAccess(true)
    await helpers.mockFaceApi()
    
    // Navigate to application
    await page.goto('/')
    
    // Inject axe-core for accessibility testing
    await injectAxe(page)
  })

  test.describe('Accessibility Compliance', () => {
    test('Mode selection page should be accessible', async ({ page }) => {
      // Check accessibility of the landing page
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: {
          html: true
        }
      })
      
      // Check keyboard navigation
      await page.keyboard.press('Tab')
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBeTruthy()
      
      // Verify focus visible indicators
      await expect(page.locator(':focus')).toHaveCSS('outline-style', /solid|dotted|dashed/)
      
      // Check ARIA labels
      const participantButton = page.getByRole('button', { name: /participant mode/i })
      const adminButton = page.getByRole('button', { name: /admin dashboard/i })
      
      await expect(participantButton).toHaveAttribute('aria-label', /.+/)
      await expect(adminButton).toHaveAttribute('aria-label', /.+/)
    })

    test('Demographic form should be accessible', async ({ page }) => {
      await page.getByText('Participant Mode').click()
      
      // Wait for form to appear
      await page.waitForSelector('[role="dialog"]')
      
      // Check form accessibility
      await checkA11y(page, '[role="dialog"]', {
        detailedReport: true
      })
      
      // Verify form labels
      const ageSelect = page.locator('#age')
      const ageLabel = page.locator('label[for="age"]')
      await expect(ageLabel).toBeVisible()
      await expect(ageLabel).toHaveText(/age/i)
      
      // Check required field indicators
      const requiredFields = page.locator('[required], [aria-required="true"]')
      const requiredCount = await requiredFields.count()
      expect(requiredCount).toBeGreaterThan(0)
      
      // Verify error messages are associated with fields
      await page.getByRole('button', { name: 'Complete' }).click()
      const errorMessages = page.locator('[role="alert"], [aria-live="polite"]')
      if (await errorMessages.isVisible()) {
        await expect(errorMessages).toHaveAttribute('id', /.+/)
      }
    })

    test('Video experiment interface should be accessible', async ({ page }) => {
      // Complete setup to reach video experiment
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      await helpers.fillDemographicForm()
      await page.getByRole('button', { name: 'Complete' }).click()
      
      await helpers.waitForVideoReady()
      
      // Check webcam setup accessibility
      await checkA11y(page, null, {
        detailedReport: true
      })
      
      // Verify video controls are keyboard accessible
      const readyButton = page.getByRole('button', { name: /ready/i })
      await expect(readyButton).toBeVisible()
      
      // Check for proper ARIA live regions for real-time updates
      const liveRegions = page.locator('[aria-live]')
      const liveRegionCount = await liveRegions.count()
      expect(liveRegionCount).toBeGreaterThan(0)
    })

    test('Sentiment display should announce changes to screen readers', async ({ page }) => {
      // Complete setup to reach sentiment analysis
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      await helpers.fillDemographicForm()
      await page.getByRole('button', { name: 'Complete' }).click()
      
      await helpers.waitForVideoReady()
      await page.getByRole('button', { name: /ready/i }).click()
      
      // Check for ARIA live regions for sentiment updates
      const sentimentRegion = page.locator('[aria-live="polite"], [role="status"]')
      if (await sentimentRegion.isVisible()) {
        await expect(sentimentRegion).toHaveAttribute('aria-live', /polite|assertive/)
      }
      
      // Verify descriptive text alternatives
      const emotionElements = page.locator('[data-testid*="emotion"], [class*="emotion"]')
      const firstEmotion = emotionElements.first()
      if (await firstEmotion.isVisible()) {
        const ariaLabel = await firstEmotion.getAttribute('aria-label')
        if (ariaLabel) {
          expect(ariaLabel).toMatch(/\w+:\s*\d+%/)
        }
      }
    })

    test('Color contrast should meet WCAG AA standards', async ({ page }) => {
      // Check contrast on main page
      await checkA11y(page, null, {
        runOnly: {
          type: 'tag',
          values: ['wcag2aa', 'wcag21aa']
        }
      })
      
      // Navigate to participant mode and check contrast
      await page.getByText('Participant Mode').click()
      await checkA11y(page, null, {
        runOnly: {
          type: 'tag',
          values: ['wcag2aa']
        }
      })
    })

    test('Focus management during mode transitions', async ({ page }) => {
      // Start on mode selection
      const participantButton = page.getByText('Participant Mode')
      await participantButton.focus()
      
      // Click and verify focus moves appropriately
      await participantButton.click()
      
      // Focus should move to the modal or first interactive element
      await page.waitForTimeout(500)
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement
        return {
          tag: el?.tagName,
          role: el?.getAttribute('role'),
          visible: el ? window.getComputedStyle(el).visibility !== 'hidden' : false
        }
      })
      
      expect(focusedElement.visible).toBe(true)
      expect(focusedElement.tag).not.toBe('BODY')
    })
  })

  test.describe('Visual Regression Tests', () => {
    test('Mode selection screen visual consistency', async ({ page }) => {
      // Take screenshot of landing page
      await expect(page).toHaveScreenshot('mode-selection.png', {
        fullPage: true,
        animations: 'disabled'
      })
      
      // Hover state on participant button
      await page.getByText('Participant Mode').hover()
      await expect(page.locator('button:has-text("Participant Mode")')).toHaveScreenshot('participant-button-hover.png')
      
      // Hover state on admin button
      await page.getByText('Admin Dashboard').hover()
      await expect(page.locator('button:has-text("Admin Dashboard")')).toHaveScreenshot('admin-button-hover.png')
    })

    test('Demographic form visual consistency', async ({ page }) => {
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      
      // Wait for form to be visible
      await page.waitForSelector('[role="dialog"]')
      
      // Screenshot the entire form
      await expect(page.locator('[role="dialog"]')).toHaveScreenshot('demographic-form.png')
      
      // Open a select dropdown and capture it
      await page.locator('#age').click()
      await expect(page.locator('[role="listbox"]')).toHaveScreenshot('age-dropdown.png')
    })

    test('Webcam setup interface visual consistency', async ({ page }) => {
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      await helpers.fillDemographicForm()
      await page.getByRole('button', { name: 'Complete' }).click()
      
      await helpers.waitForVideoReady()
      
      // Screenshot webcam setup interface
      await expect(page).toHaveScreenshot('webcam-setup.png', {
        fullPage: false,
        mask: [page.locator('video')] // Mask video element for consistency
      })
    })

    test('Sentiment analysis display visual consistency', async ({ page }) => {
      // Mock consistent emotion values for visual testing
      await helpers.mockFaceApi({
        neutral: 0.4,
        happy: 0.3,
        sad: 0.1,
        angry: 0.08,
        fearful: 0.06,
        disgusted: 0.04,
        surprised: 0.02
      })
      
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      await helpers.fillDemographicForm()
      await page.getByRole('button', { name: 'Complete' }).click()
      
      await helpers.waitForVideoReady()
      await page.getByRole('button', { name: /ready/i }).click()
      
      // Wait for analysis to display
      await page.waitForTimeout(2000)
      
      // Screenshot sentiment display area
      const sentimentDisplay = page.locator('[data-testid*="sentiment"], [class*="sentiment-display"]').first()
      if (await sentimentDisplay.isVisible()) {
        await expect(sentimentDisplay).toHaveScreenshot('sentiment-display.png')
      }
    })

    test('Responsive design breakpoints', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await expect(page).toHaveScreenshot('mobile-mode-selection.png')
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      await expect(page).toHaveScreenshot('tablet-mode-selection.png')
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 })
      await expect(page).toHaveScreenshot('desktop-mode-selection.png')
    })

    test('Dark mode visual consistency', async ({ page }) => {
      // Check if dark mode toggle exists
      const darkModeToggle = page.locator('[aria-label*="theme"], [aria-label*="dark"], button:has-text("Dark")')
      
      if (await darkModeToggle.isVisible()) {
        // Enable dark mode
        await darkModeToggle.click()
        
        // Take screenshots in dark mode
        await expect(page).toHaveScreenshot('dark-mode-selection.png')
        
        // Navigate to participant mode in dark theme
        await page.getByText('Participant Mode').click()
        await expect(page).toHaveScreenshot('dark-participant-form.png')
      }
    })
  })

  test.describe('Component Visual States', () => {
    test('Button states visual consistency', async ({ page }) => {
      const participantButton = page.getByText('Participant Mode')
      
      // Normal state
      await expect(participantButton).toHaveScreenshot('button-normal.png')
      
      // Hover state
      await participantButton.hover()
      await expect(participantButton).toHaveScreenshot('button-hover.png')
      
      // Focus state
      await participantButton.focus()
      await expect(participantButton).toHaveScreenshot('button-focus.png')
      
      // Active state (while clicking)
      await participantButton.click({ delay: 100 })
    })

    test('Form input states visual consistency', async ({ page }) => {
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      
      const ethnicityField = page.locator('#ethnicity')
      
      // Empty state
      await expect(ethnicityField).toHaveScreenshot('input-empty.png')
      
      // Focused state
      await ethnicityField.focus()
      await expect(ethnicityField).toHaveScreenshot('input-focused.png')
      
      // Filled state
      await ethnicityField.fill('Test Ethnicity')
      await expect(ethnicityField).toHaveScreenshot('input-filled.png')
      
      // Error state (if validation triggers)
      await ethnicityField.clear()
      await page.getByRole('button', { name: 'Complete' }).click()
      await page.waitForTimeout(500)
      
      const hasError = await ethnicityField.evaluate((el) => 
        el.getAttribute('aria-invalid') === 'true' || 
        el.classList.contains('error')
      )
      
      if (hasError) {
        await expect(ethnicityField).toHaveScreenshot('input-error.png')
      }
    })

    test('Loading states visual consistency', async ({ page }) => {
      // Mock slow API response
      await helpers.mockApiResponse('/server/demographics', { success: true }, 200)
      
      await page.getByText('Participant Mode').click()
      await helpers.acceptPrivacyModal()
      await helpers.fillDemographicForm()
      
      // Capture loading state
      const submitButton = page.getByRole('button', { name: 'Complete' })
      await submitButton.click()
      
      // Check for loading indicator
      const loadingIndicator = page.locator('[role="progressbar"], .spinner, [class*="loading"]')
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).toHaveScreenshot('loading-state.png')
      }
    })
  })

  test.describe('Cross-browser Visual Consistency', () => {
    test('Chrome rendering baseline', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chrome-specific baseline')
      
      await expect(page).toHaveScreenshot('chrome-baseline.png')
    })

    test('Firefox rendering comparison', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test')
      
      await expect(page).toHaveScreenshot('firefox-baseline.png')
    })

    test('Safari rendering comparison', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Safari-specific test')
      
      await expect(page).toHaveScreenshot('safari-baseline.png')
    })
  })
})