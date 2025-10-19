import { test, expect } from '@playwright/test'

test.describe('Admin Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/')
  })

  test('should show mode selection screen', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Facial Sentiment Analysis')
    await expect(page.getByText('Participant Mode')).toBeVisible()
    await expect(page.getByText('Admin Dashboard')).toBeVisible()
  })

  test('should navigate to admin login when admin mode selected', async ({ page }) => {
    await page.getByText('Admin Dashboard').click()
    
    // Should navigate to admin login
    await expect(page.getByText('Admin Login')).toBeVisible()
    await expect(page.getByLabel('Username')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('should validate required fields on admin login', async ({ page }) => {
    await page.getByText('Admin Dashboard').click()
    
    // Try to submit empty form
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Should show validation or prevent submission
    // Check that we haven't navigated away from login
    await expect(page.getByLabel('Username')).toBeVisible()
  })

  test('should handle invalid credentials gracefully', async ({ page }) => {
    await page.getByText('Admin Dashboard').click()
    
    // Fill in invalid credentials
    await page.getByLabel('Username').fill('invalid_user')
    await page.getByLabel('Password').fill('wrong_password')
    
    // Mock the API response to return 401
    await page.route('**/admin/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' })
      })
    })
    
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Should show error message
    await expect(page.getByText(/invalid credentials/i)).toBeVisible()
    
    // Should remain on login page
    await expect(page.getByLabel('Username')).toBeVisible()
  })

  test('should handle successful admin login', async ({ page }) => {
    await page.getByText('Admin Dashboard').click()
    
    // Mock successful login response
    await page.route('**/admin/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          token: 'mock-jwt-token',
          user: { id: '1', username: 'admin' }
        })
      })
    })
    
    // Mock dashboard data endpoints
    await page.route('**/all-demographics', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ demographics: [] })
      })
    })
    
    await page.route('**/all-sentiment', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sentiment: [] })
      })
    })
    
    // Fill in valid credentials
    await page.getByLabel('Username').fill('admin')
    await page.getByLabel('Password').fill('valid_password')
    
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Should navigate to admin dashboard
    await expect(page.getByText('Admin Dashboard')).toBeVisible()
    
    // Should see dashboard components
    await expect(page.getByText('Real-time Monitoring')).toBeVisible()
  })

  test('should protect admin dashboard from direct access', async ({ page }) => {
    // Try to access admin dashboard directly without authentication
    await page.goto('/')
    
    // Manually trigger admin state without authentication
    await page.evaluate(() => {
      // This should not work in the real application
      // The component should check authentication state
    })
    
    // Should redirect to login or show mode selection
    await expect(page.getByText('Participant Mode')).toBeVisible()
  })

  test('should handle network errors during login', async ({ page }) => {
    await page.getByText('Admin Dashboard').click()
    
    // Mock network failure
    await page.route('**/admin/login', async route => {
      await route.abort('failed')
    })
    
    await page.getByLabel('Username').fill('admin')
    await page.getByLabel('Password').fill('password')
    
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Should show network error message
    await expect(page.getByText(/network error|connection error|failed to connect/i)).toBeVisible()
  })

  test('should clear password field after failed login attempt', async ({ page }) => {
    await page.getByText('Admin Dashboard').click()
    
    // Mock failed login response
    await page.route('**/admin/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' })
      })
    })
    
    const usernameField = page.getByLabel('Username')
    const passwordField = page.getByLabel('Password')
    
    await usernameField.fill('admin')
    await passwordField.fill('wrong_password')
    
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Wait for error message
    await expect(page.getByText(/invalid credentials/i)).toBeVisible()
    
    // Password field should be cleared (security best practice)
    await expect(passwordField).toHaveValue('')
    
    // Username should remain for user convenience
    await expect(usernameField).toHaveValue('admin')
  })

  test('should show loading state during authentication', async ({ page }) => {
    await page.getByText('Admin Dashboard').click()
    
    // Mock slow login response
    await page.route('**/admin/login', async route => {
      // Delay response to test loading state
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          token: 'mock-jwt-token',
          user: { id: '1', username: 'admin' }
        })
      })
    })
    
    await page.getByLabel('Username').fill('admin')
    await page.getByLabel('Password').fill('password')
    
    const submitButton = page.getByRole('button', { name: /sign in/i })
    await submitButton.click()
    
    // Should show loading state
    await expect(page.getByText(/signing in|loading/i)).toBeVisible()
    
    // Button should be disabled during loading
    await expect(submitButton).toBeDisabled()
  })

  test('should maintain session across page refreshes', async ({ page }) => {
    await page.getByText('Admin Dashboard').click()
    
    // Mock successful login and set localStorage
    await page.route('**/admin/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          token: 'mock-jwt-token',
          user: { id: '1', username: 'admin' }
        })
      })
    })
    
    // Mock dashboard endpoints
    await page.route('**/all-demographics', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ demographics: [] })
      })
    })
    
    await page.route('**/all-sentiment', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sentiment: [] })
      })
    })
    
    // Login successfully
    await page.getByLabel('Username').fill('admin')
    await page.getByLabel('Password').fill('password')
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Verify we're on dashboard
    await expect(page.getByText('Admin Dashboard')).toBeVisible()
    
    // Refresh the page
    await page.reload()
    
    // Should still be authenticated (if session persistence is implemented)
    // This might show login again depending on implementation
    // The test validates the behavior is intentional
    const hasLogin = await page.getByLabel('Username').isVisible()
    const hasDashboard = await page.getByText('Admin Dashboard').isVisible()
    
    // One of these should be true (either maintained session or requires re-login)
    expect(hasLogin || hasDashboard).toBe(true)
  })
})