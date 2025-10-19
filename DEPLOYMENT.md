# Production Deployment Guide

## Overview
This guide covers deploying the Real-time Facial Sentiment Analysis application to Vercel for production use.

## Prerequisites

### 1. Vercel Account Setup
```bash
npm install -g vercel
vercel login
```

### 2. Supabase Configuration
- Create a Supabase project at https://supabase.com
- Configure database tables for user management (if using admin features)
- Set up Row Level Security (RLS) policies
- Generate API keys (anon key and project ID)

### 3. Environment Variables
Set the following environment variables in Vercel dashboard:

**Required:**
- `VITE_SUPABASE_PROJECT_ID`: Your Supabase project ID
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

**Optional:**
- `VITE_BUILD_TARGET`: Set to "production" for production builds

## Deployment Process

### 1. Pre-deployment Validation
```bash
# Run comprehensive testing
npm run validate:production

# Check bundle size and performance
npm run audit:performance
```

### 2. Deploy to Vercel
```bash
# First deployment (connects project to Vercel)
vercel

# Subsequent deployments to production
npm run deploy:vercel
```

### 3. Custom Domain (Optional)
1. Add your domain in Vercel dashboard
2. Configure DNS records:
   - Type: CNAME
   - Name: your-subdomain (or @)
   - Value: cname.vercel-dns.com

## Production Configuration

### Security Headers
Automatically configured via `vercel.json`:
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### Performance Optimizations
- Static asset caching (1 year)
- Gzip compression
- Code splitting and lazy loading
- Service worker for offline capability

### Build Optimizations
- Production build with minification
- Tree shaking for unused code
- Optimized chunk splitting for better caching
- Bundle size monitoring (target: <1.6MB)

## Monitoring and Maintenance

### Performance Monitoring
```bash
# Run Lighthouse audit on production
npm run audit:lighthouse
```

**Target Scores:**
- Performance: ≥85
- Accessibility: ≥90
- Best Practices: ≥80
- SEO: ≥80

### Error Monitoring
Error monitoring will be configured with Sentry (see next deployment task).

### Security Monitoring
- Regular security testing with penetration test suite
- Dependency vulnerability scanning
- CSP violation monitoring

## Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build:production
```

**Environment Variable Issues:**
- Ensure all VITE_ prefixed variables are set in Vercel
- Variables must be set for production environment
- Check Vercel Functions & Variables dashboard

**Performance Issues:**
- Check bundle size with `npm run audit:performance`
- Verify asset caching headers
- Monitor Core Web Vitals in production

**Security Issues:**
- Run penetration tests: `npm run test:e2e tests/e2e/security-penetration.spec.ts`
- Verify CSP headers in browser dev tools
- Check SSL certificate configuration

### Debug Production Issues
```bash
# Run production build locally
npm run build:production
npm run preview

# Test with production environment variables
cp .env.example .env.local
# Fill in production values and test locally
```

## Rollback Procedure
1. In Vercel dashboard, go to Deployments
2. Find previous stable deployment
3. Click "Promote to Production"
4. Verify rollback was successful

## Production Checklist

### Pre-deployment:
- [ ] All tests passing (`npm run test:all`)
- [ ] Lighthouse audit passing (`npm run audit:lighthouse`)
- [ ] Environment variables configured in Vercel
- [ ] Supabase project properly configured
- [ ] Security headers tested

### Post-deployment:
- [ ] Application loads successfully
- [ ] Core functionality tested (facial sentiment analysis)
- [ ] Admin authentication working (if applicable)
- [ ] Performance metrics within targets
- [ ] Error monitoring active
- [ ] SSL certificate valid

## Support
For deployment issues:
1. Check Vercel deployment logs
2. Verify environment variable configuration
3. Test locally with production build
4. Review security headers and CSP violations
5. Contact support if infrastructure issues persist