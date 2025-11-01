
# Real-time Facial Sentiment Analysis

A production-ready web application for real-time facial emotion detection using AI-powered computer vision technology. The original design is available at https://www.figma.com/design/OVTcxetqJvz65JaaDaMFcu/Real-time-Facial-Sentiment-Analysis.

## Features

- 🎥 Real-time facial emotion detection
- 📊 Live sentiment visualization with charts
- 📱 Responsive design for all devices
- 🔒 Secure admin authentication
- 📹 Video recording and storage
- 📈 Performance optimized (90/100 Lighthouse score)
- ♿ Fully accessible (100/100 accessibility score)
- 🚀 Automated CI/CD with Vercel deployment

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **AI/ML**: face-api.js for facial recognition
- **UI**: Radix UI, Tailwind CSS
- **Charts**: Recharts
- **Backend**: Supabase (optional)
- **Testing**: Vitest, Playwright
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Webcam access for facial detection

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd facial_sentiment
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials (optional)
```

4. Start development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

```bash
# Development
npm run dev                    # Start development server
npm run build                  # Build for production
npm run preview                # Preview production build

# Testing
npm run test                   # Run unit tests
npm run test:e2e               # Run E2E tests
npm run test:coverage          # Generate coverage report
npm run validate:production    # Full production validation

# Deployment
npm run deploy:validate        # Validate deployment readiness
npm run deploy:vercel          # Deploy to Vercel
./scripts/deploy-to-vercel.sh  # Interactive deployment script
```

## Deployment

### Quick Deploy to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Run deployment script:
```bash
./scripts/deploy-to-vercel.sh
```

3. Follow the interactive prompts

### Manual Deployment

1. Login to Vercel:
```bash
vercel login
```

2. Deploy to preview:
```bash
vercel
```

3. Deploy to production:
```bash
vercel --prod
```

### Environment Variables

Set these in your Vercel dashboard:
- `VITE_SUPABASE_PROJECT_ID` - Your Supabase project ID
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Performance

- **Bundle Size**: 1.57MB (optimized with code splitting)
- **Lighthouse Scores**:
  - Performance: 90/100
  - Accessibility: 100/100
  - Best Practices: 100/100
  - SEO: 91/100

## Security

- Content Security Policy (CSP) configured
- XSS protection enabled
- SQL injection prevention
- Rate limiting on authentication
- Secure session management

## Testing

The project includes comprehensive testing:
- Unit tests with Vitest
- E2E tests with Playwright
- Security penetration tests
- Performance audits with Lighthouse
- Cross-browser compatibility tests

Run all tests:
```bash
npm run test:all
```

## Documentation

- [Deployment Guide](./DEPLOYMENT.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Environment Variables](./.env.example)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Run tests before committing
4. Submit a pull request
