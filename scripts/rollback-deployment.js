#!/usr/bin/env node

/**
 * Deployment Rollback Script
 * Provides automated rollback capabilities for production deployments
 */

const { execSync } = require('child_process');
const readline = require('readline');

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

class RollbackManager {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  async getVercelDeployments() {
    try {
      log.info('Fetching deployment history...');
      const output = execSync('vercel ls --scope=team --json', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const deployments = JSON.parse(output);
      return deployments.filter(d => d.state === 'READY').slice(0, 10);
    } catch (error) {
      log.error(`Failed to fetch deployments: ${error.message}`);
      return [];
    }
  }

  formatDeploymentList(deployments) {
    console.log('\n📋 Recent Deployments:');
    console.log('─'.repeat(80));
    console.log('ID  │ URL                          │ Created         │ State');
    console.log('─'.repeat(80));
    
    deployments.forEach((deployment, index) => {
      const date = new Date(deployment.created).toLocaleString();
      const url = deployment.url || 'N/A';
      const truncatedUrl = url.length > 28 ? url.substring(0, 25) + '...' : url;
      console.log(`${String(index + 1).padStart(2)}  │ ${truncatedUrl.padEnd(28)} │ ${date.padEnd(15)} │ ${deployment.state}`);
    });
    console.log('─'.repeat(80));
  }

  async performHealthCheck(url) {
    try {
      log.info(`Performing health check on ${url}...`);
      
      // Check health endpoint
      const healthCheck = execSync(`curl -s -o /dev/null -w "%{http_code}" https://${url}/health`, {
        encoding: 'utf8',
        timeout: 10000
      });
      
      if (healthCheck.trim() === '200') {
        log.success('Health check passed');
        return true;
      } else {
        log.warning(`Health check returned: ${healthCheck}`);
        return false;
      }
    } catch (error) {
      log.error(`Health check failed: ${error.message}`);
      return false;
    }
  }

  async performRollback(targetDeployment) {
    log.header('PERFORMING ROLLBACK');
    
    try {
      // Promote the selected deployment
      log.info(`Rolling back to deployment: ${targetDeployment.url}`);
      
      execSync(`vercel promote ${targetDeployment.url} --scope=team`, {
        stdio: 'inherit'
      });
      
      log.success('Rollback completed');
      
      // Wait a moment for DNS propagation
      log.info('Waiting for DNS propagation...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Perform health check
      const healthOk = await this.performHealthCheck(targetDeployment.url);
      
      if (healthOk) {
        log.success('Rollback verified - application is healthy');
        return true;
      } else {
        log.warning('Rollback completed but health check failed');
        return false;
      }
      
    } catch (error) {
      log.error(`Rollback failed: ${error.message}`);
      return false;
    }
  }

  async createSentryRelease(deploymentId) {
    try {
      if (!process.env.SENTRY_AUTH_TOKEN) {
        log.warning('Sentry auth token not configured - skipping release creation');
        return;
      }
      
      log.info('Creating Sentry release for rollback...');
      
      execSync(`sentry-cli releases new --finalize rollback-${deploymentId}`, {
        stdio: 'pipe',
        env: {
          ...process.env,
          SENTRY_ORG: process.env.SENTRY_ORG,
          SENTRY_PROJECT: process.env.SENTRY_PROJECT
        }
      });
      
      execSync(`sentry-cli releases set-commits rollback-${deploymentId} --auto`, {
        stdio: 'pipe',
        env: {
          ...process.env,
          SENTRY_ORG: process.env.SENTRY_ORG,
          SENTRY_PROJECT: process.env.SENTRY_PROJECT
        }
      });
      
      log.success('Sentry release created');
    } catch (error) {
      log.warning(`Sentry release creation failed: ${error.message}`);
    }
  }

  async notifySlack(deploymentInfo, success) {
    try {
      if (!process.env.SLACK_WEBHOOK_URL) {
        log.info('Slack webhook not configured - skipping notification');
        return;
      }
      
      const status = success ? '✅ SUCCESS' : '❌ FAILED';
      const color = success ? 'good' : 'danger';
      
      const payload = {
        attachments: [{
          color: color,
          title: `🔄 Deployment Rollback ${status}`,
          fields: [
            {
              title: 'Target Deployment',
              value: deploymentInfo.url,
              short: true
            },
            {
              title: 'Rollback Time',
              value: new Date().toISOString(),
              short: true
            },
            {
              title: 'Initiated By',
              value: process.env.USER || 'Unknown',
              short: true
            }
          ],
          footer: 'Facial Sentiment Analysis - Rollback System',
          ts: Math.floor(Date.now() / 1000)
        }]
      };
      
      execSync(`curl -X POST -H 'Content-type: application/json' --data '${JSON.stringify(payload)}' ${process.env.SLACK_WEBHOOK_URL}`, {
        stdio: 'pipe'
      });
      
      log.success('Slack notification sent');
    } catch (error) {
      log.warning(`Slack notification failed: ${error.message}`);
    }
  }

  async run() {
    console.log(`${colors.bold}${colors.red}
╔════════════════════════════════════════════════════════════╗
║                    DEPLOYMENT ROLLBACK                     ║
║              Facial Sentiment Analysis App                ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

    try {
      // Fetch deployment history
      const deployments = await this.getVercelDeployments();
      
      if (deployments.length === 0) {
        log.error('No deployments found');
        process.exit(1);
      }
      
      // Display deployments
      this.formatDeploymentList(deployments);
      
      // Get user selection
      const selection = await this.prompt('\n🎯 Select deployment to rollback to (1-10, or 0 to cancel): ');
      
      if (selection === '0') {
        log.info('Rollback cancelled');
        process.exit(0);
      }
      
      const index = parseInt(selection) - 1;
      if (isNaN(index) || index < 0 || index >= deployments.length) {
        log.error('Invalid selection');
        process.exit(1);
      }
      
      const targetDeployment = deployments[index];
      
      // Confirmation
      log.warning(`You are about to rollback to:`);
      log.info(`URL: ${targetDeployment.url}`);
      log.info(`Created: ${new Date(targetDeployment.created).toLocaleString()}`);
      
      const confirm = await this.prompt('\n❓ Continue with rollback? (y/N): ');
      
      if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
        log.info('Rollback cancelled');
        process.exit(0);
      }
      
      // Perform rollback
      const success = await this.performRollback(targetDeployment);
      
      // Create Sentry release
      await this.createSentryRelease(targetDeployment.uid);
      
      // Send notification
      await this.notifySlack(targetDeployment, success);
      
      // Final status
      if (success) {
        log.header('ROLLBACK COMPLETED SUCCESSFULLY');
        log.success(`Application rolled back to: ${targetDeployment.url}`);
        log.info('Monitor the application for stability');
      } else {
        log.header('ROLLBACK COMPLETED WITH WARNINGS');
        log.warning('Manual verification recommended');
      }
      
    } catch (error) {
      log.error(`Rollback process failed: ${error.message}`);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
}

// Emergency rollback function (can be called programmatically)
async function emergencyRollback() {
  log.header('EMERGENCY ROLLBACK INITIATED');
  log.warning('Auto-selecting most recent stable deployment...');
  
  try {
    const manager = new RollbackManager();
    const deployments = await manager.getVercelDeployments();
    
    if (deployments.length < 2) {
      log.error('Insufficient deployment history for emergency rollback');
      return false;
    }
    
    // Skip current (index 0) and rollback to previous (index 1)
    const targetDeployment = deployments[1];
    log.info(`Emergency rollback target: ${targetDeployment.url}`);
    
    const success = await manager.performRollback(targetDeployment);
    await manager.createSentryRelease(targetDeployment.uid);
    await manager.notifySlack(targetDeployment, success);
    
    return success;
  } catch (error) {
    log.error(`Emergency rollback failed: ${error.message}`);
    return false;
  }
}

// Run based on command line argument
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--emergency')) {
    emergencyRollback().then(success => {
      process.exit(success ? 0 : 1);
    });
  } else {
    const manager = new RollbackManager();
    manager.run();
  }
}

module.exports = { RollbackManager, emergencyRollback };