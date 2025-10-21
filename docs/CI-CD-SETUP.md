# CI/CD Pipeline Setup Guide

Complete production-ready CI/CD infrastructure for Facial Sentiment Analysis webapp.

## 🏗️ Infrastructure Overview

### GitHub Actions Workflows
- **`ci.yml`**: Main CI/CD pipeline with quality gates, testing, and deployment
- **`security.yml`**: Security scanning with dependency audits and secret detection

### Vercel Configuration
- **Production deployment** with environment variable management
- **Preview deployments** for pull requests
- **Security headers** and performance optimizations

### Sentry Integration
- **Error tracking** with context-aware filtering
- **Performance monitoring** with transaction sampling
- **Release tracking** with source maps

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Fill in your values
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_ANON_KEY=your_anon_key  
VITE_SENTRY_DSN=your_sentry_dsn
```

### 2. GitHub Secrets Configuration

Configure these secrets in your GitHub repository settings:

#### Required Secrets
```bash
# Vercel
VERCEL_ORG_ID=team_xyz123
VERCEL_PROJECT_ID=prj_abc456
VERCEL_TOKEN=tok_def789

# Environment Variables
VITE_SUPABASE_PROJECT_ID=abcdefghijklmnopqrst
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SENTRY_DSN=https://abc123@sentry.io/456789

# Sentry (for source maps)
SENTRY_ORG=your-org
SENTRY_PROJECT=facial-sentiment
SENTRY_AUTH_TOKEN=sntrys_123abc...
```

#### Optional Secrets
```bash
# Security & Monitoring
CODECOV_TOKEN=codecov_token_here
SNYK_TOKEN=snyk_token_here
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

### 3. Vercel Project Setup

```bash
# Install Vercel CLI
npm install -g vercel

# Link project
vercel link

# Set environment variables in Vercel dashboard:
# - VITE_SUPABASE_PROJECT_ID
# - VITE_SUPABASE_ANON_KEY  
# - VITE_SENTRY_DSN
```

### 4. Validation

```bash
# Validate environment configuration
npm run validate:env

# Validate deployment readiness
npm run deploy:validate

# Run full CI pipeline locally
npm run ci:deploy-ready
```

## 📋 Pipeline Stages

### Quality Gates Job
1. **Dependency Installation** with caching
2. **Linting & Type Checking** (if configured)
3. **Unit Tests** with coverage reporting
4. **Production Build** with optimization
5. **Artifact Upload** for subsequent jobs

### E2E Tests Job
1. **Playwright Installation** with browser dependencies
2. **Build Artifact Download**
3. **End-to-End Testing** with parallel execution
4. **Test Report Upload** for debugging

### Security Audit Job
1. **Dependency Scanning** (npm audit + audit-ci)
2. **SARIF Upload** for security findings
3. **Parallel Execution** with main pipeline

### Preview Deployment (Pull Requests)
1. **Vercel Preview Deployment**
2. **PR Comment** with preview URL and status
3. **Quality Check Summary**

### Production Deployment (Main Branch)
1. **Production Build Deployment**
2. **Health Check Validation**
3. **Lighthouse Performance Audit**
4. **Sentry Release Creation**
5. **Slack Notification** (if configured)

### Performance Monitoring
1. **Lighthouse Audit** on production
2. **Performance Report Generation**
3. **Metric Tracking** for regression detection

## 🔒 Security Features

### Dependency Scanning
- **Daily automated scans** for vulnerabilities
- **Pull request scanning** for new dependencies
- **SARIF reporting** integration with GitHub Security

### Secret Detection
- **TruffleHog scanning** for exposed secrets
- **Historical commit analysis**
- **Verified secrets only** to reduce false positives

### Code Security
- **CodeQL analysis** for JavaScript security patterns
- **Security-extended queries** for comprehensive coverage
- **SARIF upload** for GitHub Security tab integration

### Container Security
- **Trivy scanning** for container vulnerabilities
- **Base image analysis** 
- **Dockerfile security validation**

## 📊 Monitoring & Observability

### Sentry Configuration
```typescript
// Automatic error tracking
import { initSentry } from './lib/sentry';
initSentry();

// Performance monitoring
import { monitorFaceDetection } from './lib/sentry';
await monitorFaceDetection(detectionOperation, context);
```

### Performance Metrics
- **Core Web Vitals** tracking
- **Bundle size monitoring** with alerts
- **Lighthouse CI** integration
- **Real User Monitoring** through Sentry

### Error Tracking
- **Contextual error capture** with user actions
- **Face detection error filtering** in development
- **Privacy-preserving data collection**
- **Release-based error attribution**

## 🔄 Deployment Procedures

### Standard Deployment
```bash
# Prepare for deployment
npm run deploy:prepare

# Validate deployment readiness  
npm run deploy:validate

# Deploy to production (or use GitHub Actions)
npm run deploy:vercel
```

### Emergency Rollback
```bash
# Interactive rollback with deployment selection
npm run deploy:rollback

# Emergency automatic rollback to previous version
npm run deploy:emergency-rollback
```

### Health Monitoring
```bash
# Check application health
curl https://your-app.vercel.app/health

# Response format:
{
  "status": "healthy",
  "timestamp": "2024-10-21T16:20:00.000Z",
  "version": "abc123",
  "environment": "production",
  "services": {
    "frontend": "operational",
    "supabase": "configured", 
    "sentry": "configured"
  }
}
```

## 🛠️ Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build logs
npm run build:production

# Validate environment
npm run validate:env

# Check dependencies
npm audit --audit-level=moderate
```

#### Test Failures
```bash
# Run tests locally
npm run test:all

# Check E2E test setup
npx playwright install
npm run test:e2e
```

#### Deployment Issues
```bash
# Validate Vercel configuration
vercel env ls

# Check deployment logs
vercel logs

# Health check after deployment
curl https://your-app.vercel.app/health
```

### Environment Debugging

#### Missing Variables
```bash
# List all required variables
npm run validate:env

# Check Vercel environment
vercel env ls --environment=production
```

#### Sentry Issues
```bash
# Test Sentry configuration
node -e "
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.VITE_SENTRY_DSN });
Sentry.captureMessage('Test message');
console.log('Sentry test sent');
"
```

## 📈 Performance Optimization

### Bundle Analysis
```bash
# Analyze bundle size after build
npm run build:production
npm run deploy:validate

# Check bundle composition
ls -la build/assets/
```

### Lighthouse Audits
```bash
# Run performance audit
npm run audit:performance

# Check specific metrics
npm run audit:lighthouse
```

### Monitoring Alerts

#### Bundle Size Thresholds
- **Target**: ≤ 1.6MB total bundle size
- **Warning**: > 1.6MB (pipeline warnings)
- **Error**: > 2.0MB (deployment blocks)

#### Performance Thresholds
- **LCP**: < 2.5s (target)
- **FID**: < 100ms (target)  
- **CLS**: < 0.1 (target)

## 🔧 Maintenance

### Weekly Tasks
- Review security scan results
- Update dependencies if needed
- Monitor performance metrics
- Check error rates in Sentry

### Monthly Tasks  
- Audit environment variables
- Review deployment frequency
- Update CI/CD pipeline as needed
- Performance optimization review

### Quarterly Tasks
- Security audit comprehensive review
- Infrastructure cost optimization
- Disaster recovery testing
- Team access audit

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Sentry Documentation](https://docs.sentry.io)
- [Lighthouse Performance](https://web.dev/lighthouse-performance/)

## 🆘 Emergency Contacts

For production issues:
1. **Check health endpoint**: `/health`
2. **Review Sentry errors**: [Your Sentry Project]
3. **Emergency rollback**: `npm run deploy:emergency-rollback`
4. **Contact team**: [Your team's communication channel]