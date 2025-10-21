
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    // Sentry plugin for source maps and release tracking
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        assets: './build/**',
        ignore: ['node_modules/**'],
      },
      release: {
        name: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
        uploadLegacySourcemaps: false,
      },
      telemetry: false,
    }),
  ],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        // Only keep aliases that are actually used in the codebase
        'recharts@2.15.2': 'recharts',
        'lucide-react@0.487.0': 'lucide-react',
        'class-variance-authority@0.7.1': 'class-variance-authority',
        '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
        '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
        '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
        '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
        '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
        '@jsr/supabase__supabase-js@2.49.8': '@jsr/supabase__supabase-js',
        '@jsr/supabase__supabase-js@2': '@jsr/supabase__supabase-js',
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor libraries - large dependencies
            'vendor-face': ['face-api.js'],
            'vendor-ui': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-select',
              '@radix-ui/react-label',
              '@radix-ui/react-slot',
              '@radix-ui/react-slider'
            ],
            'vendor-charts': ['recharts'],
            'vendor-utils': [
              'class-variance-authority',
              'lucide-react',
              'clsx',
              'tailwind-merge'
            ],
            'vendor-supabase': ['@jsr/supabase__supabase-js'],
            'vendor-sentry': ['@sentry/react'],
            'vendor-hono': ['hono']
          }
        }
      }
    },
    server: {
      port: 3000,
      open: true,
    },
  });