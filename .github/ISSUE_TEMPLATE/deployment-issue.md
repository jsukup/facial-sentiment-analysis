---
name: Deployment Issue
about: Report issues with CI/CD pipeline or production deployment
title: '[DEPLOY] Brief description of the issue'
labels: deployment, bug, ops
assignees: ''
---

## 🚨 Deployment Issue Report

### Issue Type
- [ ] CI/CD Pipeline failure
- [ ] Production deployment failure
- [ ] Rollback needed
- [ ] Performance issue
- [ ] Security concern
- [ ] Environment configuration

### Environment
- **Environment**: [Production/Staging/Preview]
- **Deployment URL**: 
- **Commit SHA**: 
- **Deployment ID**: 
- **Date/Time**: 

### Issue Description
*Clear description of what went wrong*

### Expected Behavior
*What should have happened*

### Actual Behavior
*What actually happened*

### Steps to Reproduce
1. 
2. 
3. 

### Error Messages
```
Paste error messages, logs, or stack traces here
```

### Screenshots
*If applicable, add screenshots of error messages or failed pipeline steps*

### Health Check Results
```bash
# Run this command and paste the output
curl https://your-app.vercel.app/health
```

### Pipeline Status
- [ ] Quality Gates: ✅ Pass / ❌ Fail
- [ ] Unit Tests: ✅ Pass / ❌ Fail  
- [ ] E2E Tests: ✅ Pass / ❌ Fail
- [ ] Security Scan: ✅ Pass / ❌ Fail
- [ ] Build: ✅ Pass / ❌ Fail
- [ ] Deployment: ✅ Pass / ❌ Fail

### Environment Variables
- [ ] All required variables configured
- [ ] Variables validated with `npm run validate:env`
- [ ] Secrets properly configured in GitHub/Vercel

### Recent Changes
*List any recent changes that might be related*
- 
- 
- 

### Urgency Level
- [ ] 🔴 Critical - Production down
- [ ] 🟡 High - Feature broken in production
- [ ] 🟢 Medium - Non-critical issue
- [ ] 🔵 Low - Enhancement/optimization

### Immediate Actions Taken
*What have you already tried?*
- [ ] Checked logs
- [ ] Verified environment variables
- [ ] Ran validation scripts
- [ ] Attempted rollback
- [ ] Other: _______________

### Additional Context
*Any other context, logs, or information*

---

### For Emergency Issues:
If this is a production emergency, also:
1. 📞 Contact team immediately
2. 🔄 Consider emergency rollback: `npm run deploy:emergency-rollback`
3. 📊 Check Sentry for error reports
4. 💬 Update status in team communication channel