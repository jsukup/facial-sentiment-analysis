# 🧪 E2E Test Guide - Facial Sentiment Analysis

## Overview

This guide provides comprehensive documentation for the End-to-End (E2E) testing suite of the Facial Sentiment Analysis application. Our test suite ensures robust functionality, accessibility, performance, and user experience across all critical user journeys.

## Test Architecture

```
tests/e2e/
├── helpers/
│   └── test-helpers.ts         # Shared test utilities and mocks
├── participant-journey.spec.ts  # Core participant workflow tests
├── admin-auth.spec.ts          # Admin authentication flow
├── admin-dashboard.spec.ts     # Admin dashboard functionality  
├── real-time-analysis.spec.ts  # Real-time sentiment analysis
├── data-integrity.spec.ts      # Data validation and edge cases
├── accessibility-visual.spec.ts # Accessibility and visual regression
├── video-upload-storage.spec.ts # Video handling and storage
├── performance-technical.spec.ts # Performance benchmarks
├── cross-browser-compatibility.spec.ts # Browser compatibility
├── security-penetration.spec.ts # Security testing
└── test-runner.ts              # Comprehensive test orchestration
```

## Test Categories

### 1. Core User Journeys

#### Participant Journey (`participant-journey.spec.ts`)
- **Privacy and Registration**: Consent acceptance, demographic collection
- **Webcam Setup**: Permission handling, video stream initialization
- **Video Experiment**: Facial detection during video playback
- **Data Submission**: Recording, uploading, and storage

#### Admin Workflows (`admin-auth.spec.ts`, `admin-dashboard.spec.ts`)
- **Authentication**: Login, session management, security
- **Dashboard Access**: Real-time monitoring, data visualization
- **Privacy Compliance**: 5-participant minimum enforcement
- **Data Export**: CSV/JSON export functionality

### 2. Feature Testing

#### Real-time Analysis (`real-time-analysis.spec.ts`)
- **Emotion Detection**: Real-time facial expression analysis
- **Face Detection Loss**: Graceful handling of detection failures
- **History Tracking**: Sentiment data over time
- **Performance Stability**: Extended session monitoring
- **Calibration**: Detection sensitivity optimization
- **Multiple Faces**: Handling multiple face scenarios

#### Data Integrity (`data-integrity.spec.ts`)
- **Input Validation**: XSS prevention, sanitization
- **Boundary Testing**: Min/max values, edge cases
- **Session Persistence**: Interruption handling
- **API Resilience**: Concurrent requests, failures
- **Network Conditions**: Slow connections, disconnections
- **Storage Limits**: Quota exceeded scenarios

### 3. Quality Assurance

#### Accessibility (`accessibility-visual.spec.ts`)
- **WCAG Compliance**: AA standards adherence
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: ARIA labels and live regions
- **Color Contrast**: Meeting contrast requirements
- **Focus Management**: Proper focus handling

#### Visual Regression (`accessibility-visual.spec.ts`)
- **Component States**: Hover, focus, active states
- **Responsive Design**: Mobile, tablet, desktop breakpoints
- **Theme Support**: Light/dark mode consistency
- **Cross-browser**: Chrome, Firefox, Safari rendering

#### Performance (`performance-technical.spec.ts`)
- **Load Times**: < 3 second page loads
- **Face Detection**: < 500ms processing intervals
- **Memory Usage**: No memory leaks
- **Bundle Size**: < 1.6MB total
- **Video Handling**: Smooth playback and recording

## Running Tests

### Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run with UI mode for debugging
npm run test:e2e:ui
```

### Specific Test Suites

```bash
# Participant journey tests
npm run test:e2e:participant

# Admin dashboard tests
npm run test:e2e:admin

# Performance tests
npm run test:e2e:performance

# Run specific test file
npx playwright test tests/e2e/real-time-analysis.spec.ts

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug mode with step-through
npm run test:e2e:debug
```

### Comprehensive Testing

```bash
# Run all tests with detailed reporting
npm run test:e2e:comprehensive

# This runs the test-runner.ts which:
# - Executes all test suites in priority order
# - Generates HTML and JSON reports
# - Validates against success criteria
# - Provides actionable feedback
```

## Test Configuration

### Playwright Configuration (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Add firefox and webkit for cross-browser testing
  ],
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### Test Helpers (`helpers/test-helpers.ts`)

Key utilities provided:

- **mockWebcamAccess()**: Mock camera permissions and MediaStream
- **mockFaceApi()**: Mock face-api.js with configurable emotions
- **fillDemographicForm()**: Automate form filling
- **measurePerformance()**: Capture performance metrics
- **mockApiResponse()**: Mock backend responses
- **takeTimestampedScreenshot()**: Debug screenshots

## Writing Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test'
import { TestHelpers } from './helpers/test-helpers'

test.describe('Feature Name', () => {
  let helpers: TestHelpers
  
  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    // Setup common mocks and navigation
    await helpers.mockWebcamAccess(true)
    await page.goto('/')
  })
  
  test('should perform expected behavior', async ({ page }) => {
    // Arrange: Set up test conditions
    await helpers.mockFaceApi({ happy: 0.7, neutral: 0.3 })
    
    // Act: Perform user actions
    await page.getByText('Participant Mode').click()
    
    // Assert: Verify outcomes
    await expect(page.getByText('Expected Result')).toBeVisible()
  })
})
```

### Best Practices

1. **Use Page Object Model**: Encapsulate page interactions
2. **Mock External Dependencies**: Camera, APIs, face-api.js
3. **Test User Journeys**: Not just individual features
4. **Handle Async Operations**: Proper waits and timeouts
5. **Clean Test Data**: Isolate tests from each other
6. **Descriptive Names**: Clear test and assertion descriptions
7. **Screenshot on Failure**: Automatic debugging aids

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results
          path: test-results/
```

### Environment Variables

Required for testing:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## Success Criteria

### Critical Requirements ✅

- [ ] Complete participant registration flow
- [ ] Facial sentiment analysis captures emotions
- [ ] Admin dashboard displays real data
- [ ] Privacy protection (5-participant minimum)
- [ ] No console errors or crashes
- [ ] All API endpoints respond correctly

### Performance Targets 📊

- [ ] Page load time < 3 seconds
- [ ] Face detection < 500ms intervals  
- [ ] Memory usage stable
- [ ] Video uploads complete successfully
- [ ] Bundle size ≤ 1.6MB

### Quality Standards 🎯

- [ ] WCAG AA accessibility compliance
- [ ] Cross-browser compatibility
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Graceful error handling
- [ ] Data validation and sanitization

## Debugging Tests

### Using Playwright Inspector

```bash
# Run with --debug flag
npx playwright test --debug

# Or set breakpoint in test
await page.pause()
```

### Viewing Test Reports

```bash
# Open HTML report
npx playwright show-report

# View trace files
npx playwright show-trace trace.zip
```

### Common Issues

1. **Camera Permission Errors**
   - Solution: Ensure `mockWebcamAccess()` is called before navigation

2. **Timing Issues**
   - Solution: Use proper wait strategies, not fixed timeouts

3. **Flaky Tests**
   - Solution: Add retries, improve selectors, mock external dependencies

4. **Memory Leaks**
   - Solution: Clean up resources in `afterEach` hooks

## Test Reports

### Generated Reports

After running comprehensive tests:

- `test-results/report.html` - Visual HTML report
- `test-results/report.json` - Structured JSON data
- `test-results/screenshots/` - Failure screenshots
- `test-results/videos/` - Test execution videos
- `test-results/traces/` - Playwright trace files

### Report Analysis

The test runner generates detailed reports including:

- Success rate percentage
- Test duration metrics
- Failed test details with error messages
- Performance measurements
- Actionable next steps

## Maintenance

### Regular Tasks

1. **Update Test Data**: Keep demographic options current
2. **Browser Updates**: Update Playwright regularly
3. **Mock Accuracy**: Ensure mocks reflect actual behavior
4. **Performance Baselines**: Update performance thresholds
5. **Accessibility Standards**: Stay current with WCAG

### Adding New Tests

1. Create test file in `tests/e2e/`
2. Import and use `TestHelpers`
3. Follow existing patterns
4. Update `test-runner.ts` suite list
5. Document in this guide

## Resources

- [Playwright Documentation](https://playwright.dev/docs)
- [Testing Best Practices](https://testingjavascript.com/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Performance](https://web.dev/metrics/)

## Support

For test-related issues:

1. Check test output and error messages
2. Review screenshots and videos
3. Consult this guide
4. Check GitHub Issues
5. Contact development team

---

**Last Updated**: October 2024
**Version**: 1.0.0
**Maintainers**: Development Team