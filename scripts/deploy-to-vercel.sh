#!/bin/bash

# Vercel Deployment Script for Facial Sentiment Analysis
# This script guides through the deployment process to Vercel

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}Facial Sentiment Analysis Deployment${NC}"
echo -e "${GREEN}====================================${NC}\n"

# Step 1: Check prerequisites
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found. Please install it first:${NC}"
    echo "npm install -g vercel"
    exit 1
fi
echo -e "${GREEN}✅ Vercel CLI installed${NC}"

# Check if production build works
echo -e "\n${YELLOW}Step 2: Validating production build...${NC}"
if npm run build:production > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Production build successful${NC}"
else
    echo -e "${RED}❌ Production build failed. Please fix build errors first.${NC}"
    exit 1
fi

# Run deployment validation
echo -e "\n${YELLOW}Step 3: Running deployment validation...${NC}"
if npm run deploy:validate > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Deployment validation passed${NC}"
else
    echo -e "${RED}❌ Deployment validation failed. Please fix issues first.${NC}"
    exit 1
fi

# Check for environment variables
echo -e "\n${YELLOW}Step 4: Environment variables check...${NC}"
if [ -f .env.local ]; then
    echo -e "${GREEN}✅ Local environment variables found${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Set these in Vercel dashboard after deployment:${NC}"
    echo "   - VITE_SUPABASE_PROJECT_ID (your Supabase project ID)"
    echo "   - VITE_SUPABASE_ANON_KEY (your Supabase anonymous key)"
    echo "   - VITE_BUILD_TARGET=production"
else
    echo -e "${YELLOW}⚠️  No .env.local file found${NC}"
    echo -e "${YELLOW}   REQUIRED: Set these environment variables in Vercel dashboard:${NC}"
    echo "   - VITE_SUPABASE_PROJECT_ID"
    echo "   - VITE_SUPABASE_ANON_KEY" 
    echo "   - VITE_BUILD_TARGET=production"
fi

# Authentication check
echo -e "\n${YELLOW}Step 5: Checking Vercel authentication...${NC}"
if vercel whoami > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Already logged in to Vercel${NC}"
else
    echo -e "${YELLOW}Please log in to Vercel:${NC}"
    vercel login
fi

# Deployment options
echo -e "\n${GREEN}====================================${NC}"
echo -e "${GREEN}Ready for deployment!${NC}"
echo -e "${GREEN}====================================${NC}\n"

echo "Choose deployment option:"
echo "1) First-time deployment (set up new project)"
echo "2) Deploy to existing project"
echo "3) Production deployment (requires existing project)"
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo -e "\n${YELLOW}Setting up new Vercel project...${NC}"
        echo "Project will be created with the following settings:"
        echo "- Name: facial-sentiment-analysis"
        echo "- Framework: Vite"
        echo "- Build Command: npm run build:production"
        echo "- Output Directory: build"
        echo ""
        read -p "Continue? (y/n): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            vercel --name facial-sentiment-analysis
            echo -e "\n${GREEN}✅ Project created and deployed!${NC}"
            echo -e "${YELLOW}Next steps:${NC}"
            echo "1. Go to Vercel dashboard and add environment variables"
            echo "2. Run: vercel --prod (for production deployment)"
        fi
        ;;
    2)
        echo -e "\n${YELLOW}Deploying to existing project...${NC}"
        vercel
        echo -e "\n${GREEN}✅ Deployed to preview environment!${NC}"
        ;;
    3)
        echo -e "\n${YELLOW}Deploying to production...${NC}"
        read -p "Are you sure you want to deploy to production? (y/n): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            vercel --prod
            echo -e "\n${GREEN}✅ Deployed to production!${NC}"
        else
            echo "Deployment cancelled."
        fi
        ;;
    *)
        echo "Invalid option. Exiting."
        exit 1
        ;;
esac

echo -e "\n${GREEN}====================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}====================================${NC}\n"

echo "Post-deployment checklist:"
echo "□ CRITICAL: Set environment variables in Vercel dashboard:"
echo "  1. Go to https://vercel.com/dashboard"
echo "  2. Select your project"
echo "  3. Go to Settings → Environment Variables"
echo "  4. Add: VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_ANON_KEY, VITE_BUILD_TARGET=production"
echo "□ Redeploy after setting environment variables: vercel --prod"
echo "□ Test the production URL"
echo "□ Check application functionality (facial sentiment analysis)"
echo "□ Verify admin authentication if using Supabase"
echo "□ Monitor initial performance metrics"
echo "□ Set up custom domain (optional)"
echo ""
echo "To get your deployment URL, run: vercel ls"