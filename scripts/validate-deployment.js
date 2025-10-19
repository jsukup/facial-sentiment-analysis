#!/usr/bin/env node

/**
 * Production Deployment Validation Script
 * Validates production environment configuration and readiness
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${colors.bold}${colors.blue}=== ${title} ===${colors.reset}`);
}

function checkmark() {
  return `${colors.green}✅${colors.reset}`;
}

function cross() {
  return `${colors.red}❌${colors.reset}`;
}

function warning() {
  return `${colors.yellow}⚠️${colors.reset}`;
}

class DeploymentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.results = {
      environment: false,
      build: false,
      tests: false,
      security: false,
      performance: false,
      bundle: false
    };
  }

  validateEnvironment() {
    logSection('Environment Configuration');
    
    // Check for required files
    const requiredFiles = [
      'package.json',
      'vite.config.ts',
      'vercel.json',
      '.env.example',
      'DEPLOYMENT.md'
    ];

    let allFilesExist = true;
    requiredFiles.forEach(file => {
      if (fs.existsSync(file)) {
        log(`${checkmark()} ${file} exists`);
      } else {
        log(`${cross()} ${file} missing`);
        this.errors.push(`Missing required file: ${file}`);
        allFilesExist = false;
      }
    });

    // Check environment variables
    const envExample = fs.readFileSync('.env.example', 'utf8');
    const requiredEnvVars = envExample
      .split('\n')
      .filter(line => line.startsWith('VITE_') && !line.startsWith('#'))
      .map(line => line.split('=')[0]);

    log('\nRequired environment variables:');
    requiredEnvVars.forEach(envVar => {
      log(`${warning()} ${envVar} (must be set in Vercel)`);
    });

    // Check package.json scripts
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredScripts = [
      'build:production',
      'deploy:prepare',
      'validate:production'
    ];

    let allScriptsExist = true;
    requiredScripts.forEach(script => {
      if (packageJson.scripts[script]) {
        log(`${checkmark()} Script "${script}" configured`);
      } else {
        log(`${cross()} Missing script: ${script}`);
        this.errors.push(`Missing package.json script: ${script}`);
        allScriptsExist = false;
      }
    });

    this.results.environment = allFilesExist && allScriptsExist;
  }

  validateBuild() {
    logSection('Production Build');
    
    try {
      log('Building for production...');
      execSync('npm run build:production', { stdio: 'pipe' });
      
      if (fs.existsSync('build')) {
        log(`${checkmark()} Production build successful`);
        
        // Check build output
        const buildFiles = fs.readdirSync('build');
        const hasIndex = buildFiles.includes('index.html');
        const hasAssets = buildFiles.includes('assets');
        
        if (hasIndex && hasAssets) {
          log(`${checkmark()} Build artifacts present`);
          this.results.build = true;
        } else {
          log(`${cross()} Build artifacts incomplete`);
          this.errors.push('Build output missing essential files');
        }
      } else {
        log(`${cross()} Build directory not created`);
        this.errors.push('Build failed to create output directory');
      }
    } catch (error) {
      log(`${cross()} Build failed: ${error.message}`);
      this.errors.push(`Build error: ${error.message}`);
    }
  }

  validateTests() {
    logSection('Test Suite');
    
    try {
      log('Running unit tests...');
      execSync('npm run test -- --run', { stdio: 'pipe' });
      log(`${checkmark()} Unit tests passed`);
      
      // Check if E2E tests can be run (playwright installed)
      if (fs.existsSync('node_modules/@playwright/test')) {
        log(`${checkmark()} Playwright E2E tests configured`);
        log(`${warning()} Run 'npm run test:e2e' separately for full E2E validation`);
      } else {
        log(`${warning()} Playwright not installed for E2E tests`);
        this.warnings.push('E2E tests not available');
      }
      
      this.results.tests = true;
    } catch (error) {
      log(`${cross()} Tests failed: ${error.message}`);
      this.errors.push(`Test failures: ${error.message}`);
    }
  }

  validateSecurity() {
    logSection('Security Configuration');
    
    // Check vercel.json security headers
    if (fs.existsSync('vercel.json')) {
      const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
      
      // Check for security headers in either routes or headers format
      const routes = vercelConfig.routes || [];
      const headers = vercelConfig.headers || [];
      
      const securityRoute = routes.find(route => 
        route.headers && route.headers['Content-Security-Policy']
      );
      
      const securityHeaders = headers.find(header =>
        header.headers && header.headers.some(h => h.key === 'Content-Security-Policy')
      );
      
      if (securityRoute || securityHeaders) {
        log(`${checkmark()} Content Security Policy configured`);
        log(`${checkmark()} Security headers configured`);
        this.results.security = true;
      } else {
        log(`${cross()} Security headers not configured`);
        this.errors.push('Missing security headers in vercel.json');
      }
    } else {
      log(`${cross()} vercel.json not found`);
      this.errors.push('vercel.json configuration missing');
    }

    // Check for security test files
    const securityTestFiles = [
      'src/test/security/penetration-testing.test.ts',
      'tests/e2e/security-penetration.spec.ts'
    ];
    
    securityTestFiles.forEach(file => {
      if (fs.existsSync(file)) {
        log(`${checkmark()} Security test: ${path.basename(file)}`);
      } else {
        log(`${warning()} Security test missing: ${path.basename(file)}`);
        this.warnings.push(`Optional security test missing: ${file}`);
      }
    });
  }

  validatePerformance() {
    logSection('Performance Configuration');
    
    // Check for performance test files
    const performanceTests = [
      'src/test/performance/lighthouse-audit.test.ts',
      'src/test/performance/bundle-size.test.ts'
    ];
    
    performanceTests.forEach(file => {
      if (fs.existsSync(file)) {
        log(`${checkmark()} Performance test: ${path.basename(file)}`);
      } else {
        log(`${warning()} Performance test missing: ${path.basename(file)}`);
        this.warnings.push(`Performance test missing: ${file}`);
      }
    });

    // Check Vite config for optimization
    if (fs.existsSync('vite.config.ts')) {
      const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
      
      if (viteConfig.includes('manualChunks')) {
        log(`${checkmark()} Code splitting configured`);
      } else {
        log(`${warning()} Code splitting not optimized`);
        this.warnings.push('Consider configuring manual chunks for better caching');
      }
      
      if (viteConfig.includes('rollupOptions')) {
        log(`${checkmark()} Build optimization configured`);
        this.results.performance = true;
      } else {
        log(`${warning()} Build optimization minimal`);
      }
    }
  }

  validateBundleSize() {
    logSection('Bundle Size Analysis');
    
    if (fs.existsSync('build/assets')) {
      const assetsDir = 'build/assets';
      const assets = fs.readdirSync(assetsDir);
      
      let totalSize = 0;
      const jsFiles = assets.filter(file => file.endsWith('.js'));
      const cssFiles = assets.filter(file => file.endsWith('.css'));
      
      log('JavaScript bundles:');
      jsFiles.forEach(file => {
        const stats = fs.statSync(path.join(assetsDir, file));
        const sizeKB = (stats.size / 1024).toFixed(2);
        totalSize += stats.size;
        log(`  ${file}: ${sizeKB} KB`);
      });
      
      log('CSS bundles:');
      cssFiles.forEach(file => {
        const stats = fs.statSync(path.join(assetsDir, file));
        const sizeKB = (stats.size / 1024).toFixed(2);
        totalSize += stats.size;
        log(`  ${file}: ${sizeKB} KB`);
      });
      
      const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
      const targetMB = 1.6;
      
      log(`\nTotal bundle size: ${totalMB} MB`);
      
      if (parseFloat(totalMB) <= targetMB) {
        log(`${checkmark()} Bundle size within target (≤${targetMB}MB)`);
        this.results.bundle = true;
      } else {
        log(`${cross()} Bundle size exceeds target (${targetMB}MB)`);
        this.errors.push(`Bundle size ${totalMB}MB exceeds target ${targetMB}MB`);
      }
    } else {
      log(`${cross()} Build assets not found`);
      this.errors.push('Cannot analyze bundle size - build assets missing');
    }
  }

  generateReport() {
    logSection('Deployment Readiness Report');
    
    const passed = Object.values(this.results).filter(Boolean).length;
    const total = Object.keys(this.results).length;
    
    log(`\nValidation Results: ${passed}/${total} checks passed\n`);
    
    Object.entries(this.results).forEach(([check, passed]) => {
      const status = passed ? checkmark() : cross();
      log(`${status} ${check.charAt(0).toUpperCase() + check.slice(1)}`);
    });
    
    if (this.warnings.length > 0) {
      log(`\n${colors.yellow}Warnings:${colors.reset}`);
      this.warnings.forEach(warningMessage => {
        log(`${warning()} ${warningMessage}`);
      });
    }
    
    if (this.errors.length > 0) {
      log(`\n${colors.red}Errors:${colors.reset}`);
      this.errors.forEach(error => {
        log(`${cross()} ${error}`);
      });
    }
    
    const isReady = this.errors.length === 0 && passed >= total * 0.8;
    
    log(`\n${colors.bold}Deployment Status:${colors.reset}`);
    if (isReady) {
      log(`${checkmark()} ${colors.green}Ready for production deployment${colors.reset}`);
      log('\nNext steps:');
      log('1. Set environment variables in Vercel dashboard');
      log('2. Run: vercel --prod');
      log('3. Verify deployment with production URL');
    } else {
      log(`${cross()} ${colors.red}Not ready for deployment${colors.reset}`);
      log('\nFix the errors above before deploying to production.');
    }
    
    return isReady;
  }
}

// Main execution
async function main() {
  log(`${colors.bold}${colors.blue}Production Deployment Validation${colors.reset}\n`);
  
  const validator = new DeploymentValidator();
  
  validator.validateEnvironment();
  validator.validateBuild();
  validator.validateTests();
  validator.validateSecurity();
  validator.validatePerformance();
  validator.validateBundleSize();
  
  const isReady = validator.generateReport();
  
  process.exit(isReady ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    log(`${cross()} Validation failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = DeploymentValidator;