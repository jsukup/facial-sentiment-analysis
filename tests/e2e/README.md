# 🧪 Comprehensive E2E Test Automation

This directory contains comprehensive End-to-End test automation for the Facial Sentiment Analysis application, implementing all test scenarios from **TESTING_CHECKLIST.md**.

## 📋 Test Coverage

### Phase 1: Participant Journey Testing (Tests 1-4)
**File**: `participant-journey.spec.ts`

- **Test 1**: Privacy and Registration Flow
- **Test 2**: Webcam Setup and Permissions
- **Test 3**: Video Experiment and Facial Detection
- **Test 4**: Data Submission and Storage
- **Test 4b**: Data Submission Error Handling

### Phase 2: Admin Dashboard Testing (Tests 5-7)
**File**: `admin-dashboard.spec.ts`

- **Test 5**: Admin Authentication
- **Test 5b**: Admin Authentication Security
- **Test 6**: Dashboard Data Visualization
- **Test 7**: Privacy Protection Features
- **Test 7b**: Privacy Protection Edge Cases

### Phase 3: Technical Performance Testing (Tests 8-10)
**File**: `performance-technical.spec.ts`

- **Test 8**: Memory and Performance Monitoring
- **Test 9**: Error Handling and Edge Cases
- **Test 10**: End-to-End Integration
- **Test 10b**: Cross-Browser Integration

## 🚀 Quick Start

### Prerequisites
- Development server running on `http://localhost:3000`
- Node.js v20+ installed
- All npm dependencies installed

### Run All Tests
```bash
# Complete comprehensive testing (recommended)
npm run test:checklist

# Or run specific phases
npm run test:e2e:participant   # Phase 1: Participant Journey
npm run test:e2e:admin         # Phase 2: Admin Dashboard  
npm run test:e2e:performance   # Phase 3: Technical Performance
```

### Debug Mode
```bash
# Run with browser UI visible
npm run test:e2e:headed

# Run in debug mode with pausing
npm run test:e2e:debug

# Run with Playwright test UI
npm run test:e2e:ui
```

## 🛠️ Test Architecture

### Test Helper System
**File**: `helpers/test-helpers.ts`

Comprehensive utilities including:
- **MockWebcamAccess**: Camera permission and stream simulation
- **MockFaceApi**: Face-api.js emotion detection simulation
- **FillDemographicForm**: Automated form completion
- **LoginAsAdmin**: Admin authentication helper
- **MockApiResponse/NetworkFailure**: API response simulation
- **MeasurePerformance**: Performance metrics collection
- **Database validation queries**: SQL queries for manual verification

### Performance Thresholds
Based on TESTING_CHECKLIST.md requirements:
- Page load time: <3 seconds
- Face detection interval: <500ms
- Bundle size: ≤1.6MB  
- Memory leak threshold: <50MB increase
- LCP target: <2.9s

### Browser Coverage
Tests run across multiple browsers automatically:
- Desktop Chrome
- Desktop Firefox
- Desktop Safari (WebKit)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

## 📊 Test Reports

### Automated Report Generation
Tests generate comprehensive reports in multiple formats:

```bash
# After running tests, reports are available at:
test-results/
├── comprehensive-test-report.json    # Detailed JSON report
├── comprehensive-test-report.md      # Markdown summary
├── results.json                      # Playwright JSON output
├── results.xml                       # JUnit XML output
└── screenshots/                      # Test screenshots
    ├── test-1-registration-complete.png
    ├── test-2-webcam-setup-complete.png
    └── ...
```

### Report Contents
- **Executive Summary**: Pass/fail rates, duration, performance metrics
- **Phase-by-Phase Results**: Detailed breakdown by test phase
- **Success Criteria Validation**: Alignment with TESTING_CHECKLIST.md requirements
- **Manual Verification Steps**: Database queries and performance observations needed
- **Next Steps**: Recommendations based on test results

## 🔧 Configuration

### Playwright Configuration
**File**: `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  baseURL: 'http://localhost:3000',  // Updated for our dev server
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### Test Environment Setup
Tests automatically mock:
- **MediaDevices API**: Camera access and video streams
- **face-api.js**: Facial detection and emotion analysis
- **MediaRecorder**: Video recording capabilities
- **Network APIs**: Supabase backend responses
- **Performance APIs**: Memory and timing measurements

## 🎯 Integration with CI/CD

### GitHub Actions Integration
Tests integrate with existing CI/CD pipeline:

```yaml
# .github/workflows/ci.yml includes:
- name: Run E2E tests
  run: npm run test:e2e

# For comprehensive testing:
- name: Run comprehensive E2E tests  
  run: npm run test:checklist
```

### Quality Gates
E2E tests serve as quality gates for:
- **Feature completeness**: All user journeys work end-to-end
- **Performance validation**: Load times and memory usage within limits
- **Error handling**: Graceful degradation under failure conditions
- **Cross-browser compatibility**: Consistent behavior across browsers
- **Security compliance**: Authentication and privacy protection

## 📝 Manual Verification Steps

While tests automate 80% of TESTING_CHECKLIST.md, some verification requires manual steps:

### Database Validation
```sql
-- Check latest demographic entry
SELECT * FROM user_demographics ORDER BY created_at DESC LIMIT 1;

-- Check sentiment data
SELECT uid, created_at, 
       jsonb_array_length(sentiment_data) as datapoint_count,
       sentiment_data->0 as first_datapoint
FROM user_sentiment ORDER BY created_at DESC LIMIT 1;

-- Check video upload
SELECT * FROM user_webcapture ORDER BY created_at DESC LIMIT 1;
```

### Performance Observations
- **Real webcam testing**: Test with actual camera hardware
- **Network conditions**: Test under various connection speeds
- **Extended sessions**: Monitor memory usage during longer experiments
- **Real user interactions**: Validate with actual user behavior patterns

## 🚨 Troubleshooting

### Common Issues

**Port conflicts**:
```bash
# Ensure dev server is running on port 3000
npm run dev
# Verify: http://localhost:3000 accessible
```

**Browser permissions**:
```bash
# Run with headed mode to see permission prompts
npm run test:e2e:headed
```

**Test timeouts**:
```bash
# Increase timeout for slow environments
PLAYWRIGHT_TIMEOUT=60000 npm run test:e2e
```

**Face-api.js loading issues**:
- Tests mock face-api.js by default
- For real testing, ensure models are accessible
- Check network requests in browser DevTools

### Debug Information
```bash
# Enable verbose logging
DEBUG=pw:api npm run test:e2e

# Generate trace files
npm run test:e2e -- --trace on

# View trace files
npx playwright show-trace test-results/trace.zip
```

## 🔄 Continuous Improvement

### Adding New Tests
1. Follow existing test structure in phase files
2. Use TestHelpers for common operations
3. Include performance validation where applicable
4. Add to test-runner.ts for comprehensive execution
5. Update this README with new test scenarios

### Performance Optimization
- Tests run in parallel by default
- Use selective test execution for faster feedback
- Mock external dependencies to reduce flakiness
- Cache browser installations in CI environments

### Quality Standards
- All tests must be deterministic (no random failures)
- Use appropriate waits (avoid fixed timeouts)
- Include meaningful assertions and error messages
- Generate visual evidence through screenshots
- Maintain compatibility with existing test infrastructure

---

**Generated**: Based on TESTING_CHECKLIST.md requirements  
**Framework**: Playwright with TypeScript  
**Coverage**: 10 comprehensive test scenarios across 3 phases  
**Integration**: GitHub Actions CI/CD pipeline ready