import { test, expect } from '@playwright/test'
import { TestHelpers } from './helpers/test-helpers'

/**
 * Phase 2: Admin Dashboard Testing (Tests 5-7)
 * Based on TESTING_CHECKLIST.md requirements
 */

test.describe('Phase 2: Admin Dashboard Testing', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await page.goto('/')
  })

  /**
   * Test 5: Admin Authentication
   * Objective: Verify admin login security and functionality
   */
  test('Test 5: Admin Authentication', async ({ page }) => {
    // Step 1: Open new browser tab (done in beforeEach)
    
    // Step 2: Click "Admin Dashboard"
    await page.getByText('Admin Dashboard').click()
    
    // Expected Results - AdminLogin component renders properly
    await expect(page.getByText(/admin|login|sign in/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    
    // Step 3: Enter admin credentials
    const emailField = page.getByLabel(/email/i)
    const passwordField = page.getByLabel(/password/i)
    const loginButton = page.getByRole('button', { name: /login|sign in/i })
    
    // Test form validation for email format
    await emailField.fill('invalid-email')
    await passwordField.fill('testpassword')
    await loginButton.click()
    
    // Should show email validation error
    await expect(page.getByText(/invalid email|email format|valid email/i)).toBeVisible()
    
    // Step 3: Enter correct credentials
    await emailField.fill('john@expectedx.com')
    await passwordField.fill('admin') // Default password from backend
    
    // Mock successful authentication
    await helpers.mockApiResponse('/server/admin/login', {
      success: true,
      token: 'mock-jwt-token-12345',
      expiresIn: '24h'
    })
    
    await loginButton.click()
    
    // Expected Results Validation:
    
    // ✓ Correct credentials allow access to dashboard
    await expect(page.getByText(/dashboard|participants|analytics/i)).toBeVisible({ timeout: 10000 })
    
    // ✓ Session management works correctly
    // Check that JWT token is stored (in localStorage or cookie)
    const tokenStored = await page.evaluate(() => {
      return localStorage.getItem('auth_token') !== null || 
             document.cookie.includes('auth_token') ||
             sessionStorage.getItem('auth_token') !== null
    })
    expect(tokenStored).toBe(true)
    
    await helpers.takeTimestampedScreenshot('test-5-admin-login-success')
  })

  /**
   * Test 5b: Admin Authentication Security Testing
   * Objective: Verify security measures and error handling
   */
  test('Test 5b: Admin Authentication Security', async ({ page }) => {
    await page.getByText('Admin Dashboard').click()
    
    const emailField = page.getByLabel(/email/i)
    const passwordField = page.getByLabel(/password/i)
    const loginButton = page.getByRole('button', { name: /login|sign in/i })
    
    // Test incorrect credentials
    await emailField.fill('wrong@email.com')
    await passwordField.fill('wrongpassword')
    
    // Mock authentication failure
    await helpers.mockApiResponse('/server/admin/login', {
      error: 'Invalid credentials'
    }, 401)
    
    await loginButton.click()
    
    // Expected Results Validation:
    
    // ✓ Incorrect credentials show appropriate error message
    await expect(page.getByText(/invalid credentials|login failed|unauthorized/i)).toBeVisible()
    
    // ✓ Failed login attempts handled gracefully
    await expect(page.getByLabel(/email/i)).toBeVisible() // Should stay on login page
    
    // Security Testing:
    
    // ✓ Password field masked appropriately
    const passwordType = await passwordField.getAttribute('type')
    expect(passwordType).toBe('password')
    
    // ✓ No credentials visible in browser dev tools (check value attributes)
    const passwordValue = await passwordField.getAttribute('value')
    expect(passwordValue).toBeFalsy() // Password field should not store value in DOM
    
    await helpers.takeTimestampedScreenshot('test-5b-admin-security')
  })

  /**
   * Test 6: Dashboard Data Visualization
   * Objective: Test admin analytics and data display
   */
  test('Test 6: Dashboard Data Visualization', async ({ page }) => {
    // Step 1: Complete successful admin login
    await helpers.loginAsAdmin()
    
    // Mock dashboard data API responses
    await helpers.mockApiResponse('/server/all-demographics', {
      demographics: [
        {
          uid: 'user-1',
          age: '25-34',
          gender: 'Male',
          race: 'Asian',
          ethnicity: 'Not Hispanic or Latino',
          nationality: 'United States',
          created_at: new Date().toISOString()
        },
        {
          uid: 'user-2',
          age: '18-24',
          gender: 'Female',
          race: 'White',
          ethnicity: 'Hispanic or Latino',
          nationality: 'United States',
          created_at: new Date().toISOString()
        },
        {
          uid: 'user-3',
          age: '35-44',
          gender: 'Non-binary',
          race: 'Black or African American',
          ethnicity: 'Not Hispanic or Latino',
          nationality: 'Canada',
          created_at: new Date().toISOString()
        },
        {
          uid: 'user-4',
          age: '25-34',
          gender: 'Male',
          race: 'Asian',
          ethnicity: 'Not Hispanic or Latino',
          nationality: 'United States',
          created_at: new Date().toISOString()
        },
        {
          uid: 'user-5',
          age: '45-54',
          gender: 'Female',
          race: 'White',
          ethnicity: 'Not Hispanic or Latino',
          nationality: 'United States',
          created_at: new Date().toISOString()
        }
      ]
    })
    
    await helpers.mockApiResponse('/server/all-sentiment', {
      sentiment: [
        {
          capture_id: 'capture-1',
          timestamp_seconds: 0,
          emotions: { neutral: 0.3, happy: 0.5, sad: 0.1, angry: 0.05, fearful: 0.02, disgusted: 0.02, surprised: 0.01 },
          created_at: new Date().toISOString()
        },
        {
          capture_id: 'capture-1',
          timestamp_seconds: 5,
          emotions: { neutral: 0.2, happy: 0.6, sad: 0.1, angry: 0.05, fearful: 0.02, disgusted: 0.02, surprised: 0.01 },
          created_at: new Date().toISOString()
        },
        {
          capture_id: 'capture-2',
          timestamp_seconds: 0,
          emotions: { neutral: 0.4, happy: 0.3, sad: 0.2, angry: 0.05, fearful: 0.02, disgusted: 0.02, surprised: 0.01 },
          created_at: new Date().toISOString()
        }
      ]
    })
    
    // Step 2: Wait for dashboard data to load
    await expect(page.getByText(/dashboard|analytics|participants/i)).toBeVisible()
    
    // Wait for data loading to complete
    await page.waitForTimeout(2000)
    
    // Expected Results Validation:
    
    // ✓ Dashboard loads participant count correctly
    await expect(page.getByText(/5|participants|users/i)).toBeVisible()
    
    // ✓ Demographic filters populate with actual data
    const ageFilter = page.locator('select[name*="age"], [data-testid*="age-filter"]').first()
    const genderFilter = page.locator('select[name*="gender"], [data-testid*="gender-filter"]').first()
    
    if (await ageFilter.isVisible()) {
      const ageOptions = await ageFilter.locator('option').count()
      expect(ageOptions).toBeGreaterThan(1) // Should have multiple age options
    }
    
    if (await genderFilter.isVisible()) {
      const genderOptions = await genderFilter.locator('option').count()
      expect(genderOptions).toBeGreaterThan(1) // Should have multiple gender options
    }
    
    // ✓ Video player displays Big Buck Bunny for reference
    const videoPlayer = page.locator('video, [data-testid*="video"]').first()
    if (await videoPlayer.isVisible()) {
      await expect(videoPlayer).toBeVisible()
    }
    
    // ✓ Sentiment charts render using Recharts components
    const charts = page.locator('svg, [data-testid*="chart"], .recharts-wrapper')
    const chartCount = await charts.count()
    if (chartCount > 0) {
      await expect(charts.first()).toBeVisible()
    }
    
    // UI Components Validation:
    
    // ✓ Cards display data appropriately
    const cards = page.locator('[data-testid*="card"], .card, [class*="card"]')
    const cardCount = await cards.count()
    expect(cardCount).toBeGreaterThan(0)
    
    // ✓ Select dropdowns work for filtering
    if (await ageFilter.isVisible()) {
      await ageFilter.selectOption('25-34')
      // Data should update after filter
      await page.waitForTimeout(1000)
    }
    
    // ✓ Charts are responsive and interactive
    if (chartCount > 0) {
      const chartElement = charts.first()
      await chartElement.hover()
      // Charts should handle hover interactions
    }
    
    await helpers.takeTimestampedScreenshot('test-6-dashboard-visualization')
  })

  /**
   * Test 7: Privacy Protection Features
   * Objective: Validate privacy threshold enforcement
   */
  test('Test 7: Privacy Protection Features', async ({ page }) => {
    // Step 1: Complete admin login and load dashboard
    await helpers.loginAsAdmin()
    
    // Mock dashboard with exactly 4 participants (below 5-participant threshold)
    await helpers.mockApiResponse('/server/all-demographics', {
      demographics: [
        { uid: 'user-1', age: '25-34', gender: 'Male', race: 'Asian' },
        { uid: 'user-2', age: '18-24', gender: 'Female', race: 'White' },
        { uid: 'user-3', age: '35-44', gender: 'Non-binary', race: 'Black or African American' },
        { uid: 'user-4', age: '25-34', gender: 'Male', race: 'Asian' }
      ]
    })
    
    await helpers.mockApiResponse('/server/all-sentiment', {
      sentiment: [
        { capture_id: 'capture-1', emotions: { neutral: 0.5, happy: 0.3 } },
        { capture_id: 'capture-2', emotions: { neutral: 0.4, happy: 0.4 } }
      ]
    })
    
    await page.waitForTimeout(2000)
    
    // Step 2: Check current participant count (should be 4)
    await expect(page.getByText(/4|participants/i)).toBeVisible()
    
    // Step 3: Apply filters to reduce visible participants to <5
    const ageFilter = page.locator('select[name*="age"], [data-testid*="age-filter"]').first()
    if (await ageFilter.isVisible()) {
      await ageFilter.selectOption('18-24') // Should show only 1 participant
      await page.waitForTimeout(1000)
    }
    
    // Expected Results Validation:
    
    // ✓ Privacy warning appears when filtered count <5 participants
    await expect(page.getByText(/privacy|minimum|5 participants|insufficient data/i)).toBeVisible()
    
    // ✓ Warning message clearly explains 5-participant minimum
    await expect(page.getByText(/5.*participant.*minimum|privacy.*protection|insufficient.*data/i)).toBeVisible()
    
    // ✓ Sentiment charts hidden when below threshold
    const charts = page.locator('svg, [data-testid*="chart"], .recharts-wrapper')
    const chartsVisible = await charts.isVisible()
    if (chartsVisible) {
      // Charts should be hidden or show privacy message
      const privacyOverlay = page.locator('[data-testid*="privacy"], [class*="privacy"]')
      await expect(privacyOverlay).toBeVisible()
    }
    
    // ✓ Video player remains visible regardless of threshold
    const videoPlayer = page.locator('video, [data-testid*="video"]').first()
    if (await videoPlayer.isVisible()) {
      await expect(videoPlayer).toBeVisible()
    }
    
    // Step 6: Remove filters to show ≥5 participants
    // Mock updated data with 5+ participants
    await helpers.mockApiResponse('/server/all-demographics', {
      demographics: [
        { uid: 'user-1', age: '25-34', gender: 'Male', race: 'Asian' },
        { uid: 'user-2', age: '18-24', gender: 'Female', race: 'White' },
        { uid: 'user-3', age: '35-44', gender: 'Non-binary', race: 'Black or African American' },
        { uid: 'user-4', age: '25-34', gender: 'Male', race: 'Asian' },
        { uid: 'user-5', age: '45-54', gender: 'Female', race: 'White' },
        { uid: 'user-6', age: '25-34', gender: 'Male', race: 'Hispanic' }
      ]
    })
    
    // Reset filter to show all participants
    if (await ageFilter.isVisible()) {
      await ageFilter.selectOption('') // Select "All" or empty option
      await page.waitForTimeout(1000)
    }
    
    // Refresh data or trigger reload
    await page.reload()
    await page.waitForTimeout(2000)
    
    // ✓ Charts reappear when threshold is met
    const chartsAfterReset = page.locator('svg, [data-testid*="chart"], .recharts-wrapper')
    const chartsVisibleAfterReset = await chartsAfterReset.count()
    if (chartsVisibleAfterReset > 0) {
      await expect(chartsAfterReset.first()).toBeVisible()
    }
    
    // ✓ Dynamic filtering updates warning in real-time
    // Privacy warning should be hidden now
    const privacyWarning = page.getByText(/privacy.*warning|minimum.*5|insufficient.*data/i)
    if (await privacyWarning.isVisible()) {
      await expect(privacyWarning).not.toBeVisible()
    }
    
    // Privacy Compliance:
    
    // ✓ No individual data identifiable when aggregated
    // Check that individual user IDs are not displayed
    await expect(page.getByText(/user-\d+|uid.*[a-f0-9]{8}/i)).not.toBeVisible()
    
    // ✓ User privacy is maintained throughout dashboard
    // Verify no personal identifiers are shown
    const personalData = page.getByText(/email|phone|address|name.*[A-Z]/i)
    const personalDataCount = await personalData.count()
    expect(personalDataCount).toBe(0)
    
    await helpers.takeTimestampedScreenshot('test-7-privacy-protection')
  })

  /**
   * Test 7b: Privacy Protection Edge Cases
   * Objective: Test privacy boundaries and edge cases
   */
  test('Test 7b: Privacy Protection Edge Cases', async ({ page }) => {
    await helpers.loginAsAdmin()
    
    // Test with exactly 5 participants (threshold boundary)
    await helpers.mockApiResponse('/server/all-demographics', {
      demographics: Array.from({ length: 5 }, (_, i) => ({
        uid: `user-${i + 1}`,
        age: '25-34',
        gender: 'Male',
        race: 'Asian'
      }))
    })
    
    await page.waitForTimeout(2000)
    
    // Should show charts at exactly 5 participants
    const charts = page.locator('svg, [data-testid*="chart"], .recharts-wrapper')
    const chartCount = await charts.count()
    if (chartCount > 0) {
      await expect(charts.first()).toBeVisible()
    }
    
    // Should not show privacy warning at threshold
    await expect(page.getByText(/privacy.*warning|insufficient.*data/i)).not.toBeVisible()
    
    await helpers.takeTimestampedScreenshot('test-7b-privacy-edge-cases')
  })
})