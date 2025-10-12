import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import UnoCSS from '@unocss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    UnoCSS(),
    {
      name: 'kuromoji-browser-loader',
      transform(code, id) {
        // Replace NodeDictionaryLoader with BrowserDictionaryLoader for kuromoji
        if (id.includes('kuromoji') && id.includes('TokenizerBuilder')) {
          return {
            code: code.replace(
              './loader/NodeDictionaryLoader',
              './loader/BrowserDictionaryLoader'
            ),
            map: null
          };
        }
      }
    },
    {
      name: 'configure-response-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Add cross-origin isolation headers for Whisper.wasm (SharedArrayBuffer support)
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

          // Serve kuromoji .gz files with proper headers
          if (req.url?.includes('/kuromoji/dict/') && req.url?.endsWith('.gz')) {
            // Don't let the browser auto-decompress
            res.setHeader('Content-Type', 'application/gzip');
            res.setHeader('Content-Encoding', 'identity');
          }

          next();
        });
      }
    },
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['kuromoji/dict/*.gz'],
      pwaAssets: {
        config: true,
        overrideManifestIcons: true,
      },
      manifest: {
        name: 'tabitomo - AI-Powered Translation Companion',
        short_name: 'tabitomo',
        description: 'Your AI-powered travel companion for instant translation. Support text, voice, and image translation with OCR.',
        theme_color: 'transparent',
        background_color: '#eef2ff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,wasm}'],
        runtimeCaching: [
          {
            urlPattern: /\/kuromoji\/dict\/.*\.gz$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kuromoji-dict-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache WASM files (mozjpeg encoder from @jsquash/jpeg)
            urlPattern: /.*\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        navigateFallback: null
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Use ESM version of kuroshiro-analyzer-kuromoji
      'kuroshiro-analyzer-kuromoji': 'kuroshiro-analyzer-kuromoji/src/index.js',
      // Provide browser-compatible path module for kuromoji
      'path': 'path-browserify',
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['kuromoji', 'kuroshiro-analyzer-kuromoji', 'react', 'react-dom'],
  },
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    copyPublicDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id, { getModuleInfo }) => {
          // Check if this module imports React (including transitive dependencies)
          const hasReactImport = (id: string): boolean => {
            if (!id.includes('node_modules/')) return false;
            if (id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/scheduler/')) {
              return true;
            }

            const info = getModuleInfo(id);
            if (!info) return false;

            // Check if any imports include react
            return info.importedIds.some(importId =>
              importId.includes('/react/') ||
              importId.includes('/react-dom/') ||
              importId.includes('/scheduler/')
            );
          };

          // Bundle ALL React and React-dependent modules together
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/scheduler') ||
              id.includes('node_modules/@radix-ui/') ||
              id.includes('lucide-react') ||
              id.includes('react-router') ||
              id.includes('@remix-run') ||
              id.includes('react-dropzone') ||
              id.includes('react-markdown') ||
              id.includes('streamdown') ||
              hasReactImport(id)) {
            return 'vendor-react';
          }

          // AI/ML libraries (heavy, don't use React) - bundle together
          if (id.includes('node_modules/ai/') ||
              id.includes('@ai-sdk/') ||
              id.includes('node_modules/openai/')) {
            return 'vendor-ai';
          }

          // Utilities used throughout the app
          if (id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'vendor-css-utils';
          }
          if (id.includes('node_modules/zod/')) {
            return 'vendor-zod';
          }

          // Let Vite auto-bundle everything else, including:
          // - whisper (dynamically imported)
          // - QR libraries (dynamically imported)
          // - Japanese libs (dynamically imported)
          // - Image processing (dynamically imported)
          // - Markdown (dynamically imported)
        }
      }
    }
  },
});
