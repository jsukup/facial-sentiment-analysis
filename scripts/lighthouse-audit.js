#!/usr/bin/env node

const lighthouse = require('lighthouse')
const chromeLauncher = require('chrome-launcher')
const fs = require('fs')
const path = require('path')

async function runLighthouseAudit() {
  console.log('🚀 Starting Lighthouse Performance Audit...')
  
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-setuid-sandbox']
  })
  
  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
    settings: {
      formFactor: 'desktop',
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1
      }
    }
  }
  
  const url = process.argv[2] || 'http://localhost:4173'
  console.log(`📊 Auditing: ${url}`)
  
  try {
    const runnerResult = await lighthouse(url, options)
    
    // Extract scores
    const scores = {
      performance: Math.round(runnerResult.lhr.categories.performance.score * 100),
      accessibility: Math.round(runnerResult.lhr.categories.accessibility.score * 100),
      bestPractices: Math.round(runnerResult.lhr.categories['best-practices'].score * 100),
      seo: Math.round(runnerResult.lhr.categories.seo.score * 100)
    }
    
    console.log('\n📊 Lighthouse Scores:')
    console.log(`🎯 Performance: ${scores.performance}/100 ${scores.performance >= 85 ? '✅' : '❌'}`)
    console.log(`♿ Accessibility: ${scores.accessibility}/100 ${scores.accessibility >= 90 ? '✅' : '❌'}`)
    console.log(`✅ Best Practices: ${scores.bestPractices}/100 ${scores.bestPractices >= 80 ? '✅' : '❌'}`)
    console.log(`🔍 SEO: ${scores.seo}/100 ${scores.seo >= 80 ? '✅' : '❌'}`)
    
    const overallScore = (scores.performance + scores.accessibility + scores.bestPractices + scores.seo) / 4
    console.log(`\n🏆 Overall Score: ${Math.round(overallScore)}/100`)
    
    // Save HTML report
    const reportPath = path.join(__dirname, '..', 'lighthouse-report.html')
    fs.writeFileSync(reportPath, runnerResult.report)
    console.log(`\n📝 Report saved to: ${reportPath}`)
    
    // Performance recommendations
    const opportunities = Object.entries(runnerResult.lhr.audits)
      .filter(([key, audit]) => 
        audit.details && audit.details.type === 'opportunity' && audit.numericValue > 0
      )
      .map(([key, audit]) => ({
        title: audit.title,
        savings: audit.displayValue
      }))
      .slice(0, 3)
    
    if (opportunities.length > 0) {
      console.log('\n💡 Top Performance Opportunities:')
      opportunities.forEach(opp => {
        console.log(`  • ${opp.title}: ${opp.savings}`)
      })
    }
    
    // Check if targets are met
    const targetsMet = {
      performance: scores.performance >= 85,
      accessibility: scores.accessibility >= 90,
      bestPractices: scores.bestPractices >= 80,
      seo: scores.seo >= 80
    }
    
    const allTargetsMet = Object.values(targetsMet).every(Boolean)
    
    if (allTargetsMet) {
      console.log('\n🎉 All performance targets met!')
      process.exit(0)
    } else {
      console.log('\n⚠️  Some targets not met. Check the report for improvements.')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Lighthouse audit failed:', error.message)
    process.exit(1)
  } finally {
    await chrome.kill()
  }
}

runLighthouseAudit()