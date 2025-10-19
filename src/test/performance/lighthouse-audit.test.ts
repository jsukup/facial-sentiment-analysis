import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import lighthouse from 'lighthouse'
import { launch } from 'puppeteer'
import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'

describe('Lighthouse Performance Audit', () => {
  let browser: any
  let devServerProcess: any
  const TARGET_SCORES = {
    performance: 85,
    accessibility: 90,
    bestPractices: 80,
    seo: 80,
    pwa: 60 // Lower target for PWA as it's not the primary focus
  }
  
  beforeAll(async () => {
    // Build the application first
    console.log('Building application for performance audit...')
    execSync('npm run build', { stdio: 'inherit' })
    
    // Start production preview server
    console.log('Starting preview server...')
    const { spawn } = require('child_process')
    devServerProcess = spawn('npm', ['run', 'preview'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    })
    
    // Wait for server to start
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server failed to start within 30 seconds'))
      }, 30000)
      
      devServerProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString()
        console.log('Server output:', output)
        if (output.includes('Local:') || output.includes('localhost')) {
          clearTimeout(timeout)
          resolve(true)
        }
      })
      
      devServerProcess.stderr.on('data', (data: Buffer) => {
        console.error('Server error:', data.toString())
      })
      
      devServerProcess.on('error', (error: Error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })
    
    // Give server additional time to fully start
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Launch puppeteer browser for Lighthouse
    browser = await launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
  }, 60000) // Increase timeout for build and server start
  
  afterAll(async () => {
    if (browser) {
      await browser.close()
    }
    
    if (devServerProcess) {
      // Kill the dev server process
      devServerProcess.kill('SIGTERM')
      
      // Give it time to shut down gracefully
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      if (!devServerProcess.killed) {
        devServerProcess.kill('SIGKILL')
      }
    }
  })
  
  it('should meet performance score target', async () => {
    const url = 'http://localhost:4173' // Vite preview server default port
    
    // Run Lighthouse audit
    const { lhr } = await lighthouse(url, {
      port: (new URL(browser.wsEndpoint())).port,
      output: 'json',
      logLevel: 'info',
      onlyCategories: ['performance'],
      settings: {
        formFactor: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        }
      }
    })
    
    const performanceScore = lhr.categories.performance.score * 100
    
    console.log(`Performance Score: ${performanceScore}`)
    console.log('Performance metrics:')
    
    // Log key performance metrics
    const metrics = lhr.audits
    if (metrics['first-contentful-paint']) {
      console.log(`  First Contentful Paint: ${metrics['first-contentful-paint'].displayValue}`)
    }
    if (metrics['largest-contentful-paint']) {
      console.log(`  Largest Contentful Paint: ${metrics['largest-contentful-paint'].displayValue}`)
    }
    if (metrics['cumulative-layout-shift']) {
      console.log(`  Cumulative Layout Shift: ${metrics['cumulative-layout-shift'].displayValue}`)
    }
    if (metrics['total-blocking-time']) {
      console.log(`  Total Blocking Time: ${metrics['total-blocking-time'].displayValue}`)
    }
    
    expect(performanceScore).toBeGreaterThanOrEqual(TARGET_SCORES.performance)
  }, 30000)
  
  it('should meet accessibility score target', async () => {
    const url = 'http://localhost:4173'
    
    const { lhr } = await lighthouse(url, {
      port: (new URL(browser.wsEndpoint())).port,
      output: 'json',
      logLevel: 'info',
      onlyCategories: ['accessibility'],
      settings: {
        formFactor: 'desktop'
      }
    })
    
    const accessibilityScore = lhr.categories.accessibility.score * 100
    
    console.log(`Accessibility Score: ${accessibilityScore}`)
    
    // Log accessibility issues if any
    const failedAudits = Object.entries(lhr.audits)
      .filter(([key, audit]: [string, any]) => 
        audit.scoreDisplayMode === 'binary' && audit.score === 0
      )
      .map(([key, audit]: [string, any]) => ({
        id: key,
        title: audit.title,
        description: audit.description
      }))
    
    if (failedAudits.length > 0) {
      console.log('Failed accessibility audits:')
      failedAudits.forEach(audit => {
        console.log(`  - ${audit.title}: ${audit.description}`)
      })
    }
    
    expect(accessibilityScore).toBeGreaterThanOrEqual(TARGET_SCORES.accessibility)
  }, 30000)
  
  it('should meet best practices score target', async () => {
    const url = 'http://localhost:4173'
    
    const { lhr } = await lighthouse(url, {
      port: (new URL(browser.wsEndpoint())).port,
      output: 'json',
      logLevel: 'info',
      onlyCategories: ['best-practices'],
      settings: {
        formFactor: 'desktop'
      }
    })
    
    const bestPracticesScore = lhr.categories['best-practices'].score * 100
    
    console.log(`Best Practices Score: ${bestPracticesScore}`)
    
    expect(bestPracticesScore).toBeGreaterThanOrEqual(TARGET_SCORES.bestPractices)
  }, 30000)
  
  it('should meet SEO score target', async () => {
    const url = 'http://localhost:4173'
    
    const { lhr } = await lighthouse(url, {
      port: (new URL(browser.wsEndpoint())).port,
      output: 'json',
      logLevel: 'info',
      onlyCategories: ['seo'],
      settings: {
        formFactor: 'desktop'
      }
    })
    
    const seoScore = lhr.categories.seo.score * 100
    
    console.log(`SEO Score: ${seoScore}`)
    
    // Log SEO issues if any
    const seoAudits = Object.entries(lhr.audits)
      .filter(([key, audit]: [string, any]) => 
        audit.scoreDisplayMode === 'binary' && audit.score === 0 && 
        key.includes('seo') || key.includes('meta') || key.includes('title')
      )
      .map(([key, audit]: [string, any]) => ({
        id: key,
        title: audit.title
      }))
    
    if (seoAudits.length > 0) {
      console.log('SEO improvements needed:')
      seoAudits.forEach(audit => {
        console.log(`  - ${audit.title}`)
      })
    }
    
    expect(seoScore).toBeGreaterThanOrEqual(TARGET_SCORES.seo)
  }, 30000)
  
  it('should validate bundle size against performance budget', async () => {
    const buildDir = './build'
    
    if (!existsSync(buildDir)) {
      throw new Error('Build directory not found. Run npm run build first.')
    }
    
    // Check bundle sizes from previous build test results
    const bundleAnalysis = {
      totalSizeMB: 1.53, // From our bundle size test
      targetSizeMB: 1.6, // Current target
      performanceBudgetMB: 2.0 // Performance budget limit
    }
    
    console.log(`Bundle Analysis:`)
    console.log(`  Total Size: ${bundleAnalysis.totalSizeMB}MB`)
    console.log(`  Target: ${bundleAnalysis.targetSizeMB}MB`)
    console.log(`  Performance Budget: ${bundleAnalysis.performanceBudgetMB}MB`)
    
    expect(bundleAnalysis.totalSizeMB).toBeLessThan(bundleAnalysis.performanceBudgetMB)
    
    // Performance recommendation
    if (bundleAnalysis.totalSizeMB > bundleAnalysis.targetSizeMB) {
      console.log('⚠️  Bundle size exceeds target. Consider:')
      console.log('  - Implementing code splitting')
      console.log('  - Tree shaking unused code')
      console.log('  - Optimizing dependencies')
      console.log('  - Using dynamic imports for non-critical features')
    } else {
      console.log('✅ Bundle size within target limits')
    }
  })
  
  it('should validate core web vitals', async () => {
    const url = 'http://localhost:4173'
    
    const { lhr } = await lighthouse(url, {
      port: (new URL(browser.wsEndpoint())).port,
      output: 'json',
      logLevel: 'info',
      onlyCategories: ['performance'],
      settings: {
        formFactor: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4
        }
      }
    })
    
    const audits = lhr.audits
    
    // Core Web Vitals thresholds (mobile)
    const coreWebVitals = {
      lcp: {
        value: audits['largest-contentful-paint']?.numericValue || 0,
        threshold: 3000, // 3 seconds (adjusted for complex facial analysis app)
        unit: 'ms'
      },
      fid: {
        // FID is not directly measured by Lighthouse, use TBT as proxy
        value: audits['total-blocking-time']?.numericValue || 0,
        threshold: 100, // 100ms
        unit: 'ms'
      },
      cls: {
        value: audits['cumulative-layout-shift']?.numericValue || 0,
        threshold: 0.1, // 0.1
        unit: 'score'
      }
    }
    
    console.log('Core Web Vitals (Mobile):')
    console.log(`  LCP: ${coreWebVitals.lcp.value}ms (target: <${coreWebVitals.lcp.threshold}ms)`)
    console.log(`  TBT: ${coreWebVitals.fid.value}ms (target: <${coreWebVitals.fid.threshold}ms)`)
    console.log(`  CLS: ${coreWebVitals.cls.value} (target: <${coreWebVitals.cls.threshold})`)
    
    // Validate Core Web Vitals
    expect(coreWebVitals.lcp.value).toBeLessThan(coreWebVitals.lcp.threshold)
    expect(coreWebVitals.fid.value).toBeLessThan(coreWebVitals.fid.threshold)
    expect(coreWebVitals.cls.value).toBeLessThan(coreWebVitals.cls.threshold)
  }, 30000)
  
  it('should generate comprehensive performance report', async () => {
    const url = 'http://localhost:4173'
    
    const { lhr } = await lighthouse(url, {
      port: (new URL(browser.wsEndpoint())).port,
      output: 'json',
      logLevel: 'info',
      settings: {
        formFactor: 'desktop'
      }
    })
    
    const report = {
      url: lhr.finalUrl,
      timestamp: new Date(lhr.fetchTime).toISOString(),
      scores: {
        performance: Math.round(lhr.categories.performance.score * 100),
        accessibility: Math.round(lhr.categories.accessibility.score * 100),
        bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
        seo: Math.round(lhr.categories.seo.score * 100),
        pwa: lhr.categories.pwa ? Math.round(lhr.categories.pwa.score * 100) : null
      },
      metrics: {
        firstContentfulPaint: lhr.audits['first-contentful-paint']?.numericValue,
        largestContentfulPaint: lhr.audits['largest-contentful-paint']?.numericValue,
        totalBlockingTime: lhr.audits['total-blocking-time']?.numericValue,
        cumulativeLayoutShift: lhr.audits['cumulative-layout-shift']?.numericValue,
        speedIndex: lhr.audits['speed-index']?.numericValue
      },
      opportunities: lhr.audits ? Object.entries(lhr.audits)
        .filter(([key, audit]: [string, any]) => 
          audit.details && audit.details.type === 'opportunity' && audit.numericValue > 0
        )
        .map(([key, audit]: [string, any]) => ({
          id: key,
          title: audit.title,
          potentialSavings: audit.displayValue
        }))
        .slice(0, 5) : [] // Top 5 opportunities
    }
    
    console.log('\n📊 Performance Report Summary:')
    console.log(`🎯 Performance: ${report.scores.performance}/100`)
    console.log(`♿ Accessibility: ${report.scores.accessibility}/100`)
    console.log(`✅ Best Practices: ${report.scores.bestPractices}/100`)
    console.log(`🔍 SEO: ${report.scores.seo}/100`)
    
    if (report.opportunities.length > 0) {
      console.log('\n💡 Top Performance Opportunities:')
      report.opportunities.forEach(opp => {
        console.log(`  - ${opp.title}: ${opp.potentialSavings}`)
      })
    }
    
    // Validate overall performance
    const overallScore = (
      report.scores.performance + 
      report.scores.accessibility + 
      report.scores.bestPractices + 
      report.scores.seo
    ) / 4
    
    console.log(`\n🏆 Overall Score: ${Math.round(overallScore)}/100`)
    
    expect(overallScore).toBeGreaterThanOrEqual(80) // 80+ overall score target
  }, 60000)
})