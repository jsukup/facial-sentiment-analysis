#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates all required environment variables and configurations
 * for production deployment
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.blue}\n=== ${msg} ===${colors.reset}`)
};

// Required environment variables by context
const environmentConfig = {
  // Client-side variables (VITE_ prefix)
  client: {
    required: [
      'VITE_SUPABASE_PROJECT_ID',
      'VITE_SUPABASE_ANON_KEY'
    ],
    optional: [
      'VITE_SENTRY_DSN',
      'VITE_BUILD_TARGET'
    ]
  },
  
  // Build-time variables (Sentry)
  build: {
    required: [],
    optional: [
      'SENTRY_ORG',
      'SENTRY_PROJECT', 
      'SENTRY_AUTH_TOKEN'
    ]
  },
  
  // CI/CD variables
  cicd: {
    required: [],
    optional: [
      'VERCEL_ORG_ID',
      'VERCEL_PROJECT_ID',
      'VERCEL_TOKEN',
      'CODECOV_TOKEN',
      'SNYK_TOKEN',
      'SLACK_WEBHOOK_URL'
    ]
  }
};

// Validation rules
const validationRules = {
  'VITE_SUPABASE_PROJECT_ID': {
    pattern: /^[a-z0-9]{20}$/,
    message: 'Should be a 20-character alphanumeric string'
  },
  'VITE_SUPABASE_ANON_KEY': {
    pattern: /^eyJ[A-Za-z0-9_-]+$/,
    message: 'Should be a valid JWT token starting with "eyJ"'
  },
  'VITE_SENTRY_DSN': {
    pattern: /^https:\/\/[a-f0-9]+@[a-z0-9.]+\/[0-9]+$/,
    message: 'Should be a valid Sentry DSN URL'
  }
};

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.env = process.env;
  }

  validateVariable(name, context = 'general') {
    const value = this.env[name];
    
    if (!value) {
      return { valid: false, message: 'Missing' };
    }

    // Check validation rules
    const rule = validationRules[name];
    if (rule && !rule.pattern.test(value)) {
      return { valid: false, message: rule.message };
    }

    // Context-specific validation
    if (name.startsWith('VITE_') && context === 'production') {
      if (value.includes('test') || value.includes('mock') || value.includes('dev')) {
        return { valid: false, message: 'Contains test/mock/dev values in production' };
      }
    }

    return { valid: true, message: 'Valid' };
  }

  validateSection(sectionName, config, context = 'general') {
    log.header(`${sectionName.toUpperCase()} VARIABLES`);
    
    let sectionValid = true;

    // Check required variables
    config.required.forEach(varName => {
      const result = this.validateVariable(varName, context);
      if (result.valid) {
        log.success(`${varName}: ${result.message}`);
      } else {
        log.error(`${varName}: ${result.message}`);
        this.errors.push(`${varName}: ${result.message}`);
        sectionValid = false;
      }
    });

    // Check optional variables
    config.optional.forEach(varName => {
      const result = this.validateVariable(varName, context);
      if (this.env[varName]) {
        if (result.valid) {
          log.success(`${varName}: ${result.message}`);
        } else {
          log.warning(`${varName}: ${result.message}`);
          this.warnings.push(`${varName}: ${result.message}`);
        }
      } else {
        log.info(`${varName}: Not set (optional)`);
      }
    });

    return sectionValid;
  }

  validateFiles() {
    log.header('FILE VALIDATION');
    
    const requiredFiles = [
      'vercel.json',
      'package.json',
      '.github/workflows/ci.yml',
      'public/api/health.js'
    ];

    let filesValid = true;

    requiredFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        log.success(`${file}: Exists`);
      } else {
        log.error(`${file}: Missing`);
        this.errors.push(`Required file missing: ${file}`);
        filesValid = false;
      }
    });

    return filesValid;
  }

  validatePackageJson() {
    log.header('PACKAGE.JSON VALIDATION');
    
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Check required dependencies
      const requiredDeps = ['@sentry/react', '@jsr/supabase__supabase-js'];
      let depsValid = true;

      requiredDeps.forEach(dep => {
        if (packageJson.dependencies?.[dep]) {
          log.success(`Dependency ${dep}: ${packageJson.dependencies[dep]}`);
        } else {
          log.error(`Missing dependency: ${dep}`);
          this.errors.push(`Missing dependency: ${dep}`);
          depsValid = false;
        }
      });

      // Check required scripts
      const requiredScripts = ['build:production', 'test', 'test:e2e'];
      requiredScripts.forEach(script => {
        if (packageJson.scripts?.[script]) {
          log.success(`Script ${script}: Available`);
        } else {
          log.error(`Missing script: ${script}`);
          this.errors.push(`Missing script: ${script}`);
          depsValid = false;
        }
      });

      return depsValid;
    } catch (error) {
      log.error(`Package.json validation failed: ${error.message}`);
      this.errors.push(`Package.json validation failed: ${error.message}`);
      return false;
    }
  }

  validateVercelConfig() {
    log.header('VERCEL CONFIGURATION');
    
    try {
      const vercelPath = path.join(process.cwd(), 'vercel.json');
      const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
      
      // Check essential configuration
      const checks = [
        { key: 'buildCommand', expected: 'npm run build:production' },
        { key: 'outputDirectory', expected: 'build' },
        { key: 'framework', expected: 'vite' }
      ];

      let configValid = true;

      checks.forEach(check => {
        if (vercelConfig[check.key] === check.expected) {
          log.success(`${check.key}: ${vercelConfig[check.key]}`);
        } else {
          log.error(`${check.key}: Expected "${check.expected}", got "${vercelConfig[check.key]}"`);
          this.errors.push(`Vercel config ${check.key} mismatch`);
          configValid = false;
        }
      });

      // Check security headers
      const hasSecurityHeaders = vercelConfig.headers?.some(header => 
        header.headers?.some(h => h.key === 'Content-Security-Policy')
      );

      if (hasSecurityHeaders) {
        log.success('Security headers: Configured');
      } else {
        log.warning('Security headers: Not found');
        this.warnings.push('Security headers not properly configured');
      }

      return configValid;
    } catch (error) {
      log.error(`Vercel config validation failed: ${error.message}`);
      this.errors.push(`Vercel config validation failed: ${error.message}`);
      return false;
    }
  }

  run() {
    console.log(`${colors.bold}${colors.blue}
╔════════════════════════════════════════════════════════════╗
║                 ENVIRONMENT VALIDATION                     ║
║              Facial Sentiment Analysis App                ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

    const context = this.env.NODE_ENV === 'production' ? 'production' : 'development';
    log.info(`Validation context: ${context}`);

    // Run all validations
    const validations = [
      this.validateSection('Client', environmentConfig.client, context),
      this.validateSection('Build', environmentConfig.build, context),
      this.validateSection('CI/CD', environmentConfig.cicd, context),
      this.validateFiles(),
      this.validatePackageJson(),
      this.validateVercelConfig()
    ];

    const allValid = validations.every(v => v);

    // Summary
    log.header('VALIDATION SUMMARY');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      log.success('All validations passed! Environment is ready for deployment.');
    } else {
      if (this.errors.length > 0) {
        log.error(`${this.errors.length} error(s) found:`);
        this.errors.forEach(error => console.log(`  ${colors.red}• ${error}${colors.reset}`));
      }
      
      if (this.warnings.length > 0) {
        log.warning(`${this.warnings.length} warning(s) found:`);
        this.warnings.forEach(warning => console.log(`  ${colors.yellow}• ${warning}${colors.reset}`));
      }
    }

    // Exit with appropriate code
    const exitCode = this.errors.length > 0 ? 1 : 0;
    
    console.log(`\n${colors.bold}Validation completed with exit code: ${exitCode}${colors.reset}\n`);
    
    if (exitCode === 0) {
      log.info('Ready for deployment! 🚀');
    } else {
      log.error('Please fix the errors before deploying.');
    }
    
    return exitCode;
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new EnvironmentValidator();
  const exitCode = validator.run();
  process.exit(exitCode);
}

module.exports = EnvironmentValidator;