import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import UnoCSS from '@unocss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    UnoCSS(),
    react(),
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
        theme_color: '#eef2ff',
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
  },
  optimizeDeps: {
    include: ['kuromoji', 'kuroshiro-analyzer-kuromoji'],
    esbuildOptions: {
      plugins: [
        {
          name: 'kuromoji-browser-loader-esbuild',
          setup(build) {
            build.onLoad({ filter: /TokenizerBuilder\.js$/ }, async (args) => {
              let contents = fs.readFileSync(args.path, 'utf8');
              contents = contents.replace(
                './loader/NodeDictionaryLoader',
                './loader/BrowserDictionaryLoader'
              );
              return { contents, loader: 'js' };
            });
          }
        }
      ]
    }
  },
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    copyPublicDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-router-dom/')) {
            return 'vendor-router';
          }

          // UI libraries
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('@radix-ui/')) {
            return 'vendor-radix';
          }
          if (id.includes('react-dropzone')) {
            return 'vendor-ui-misc';
          }

          // AI/ML libraries (heavy)
          if (id.includes('node_modules/ai/') || id.includes('@ai-sdk/')) {
            return 'vendor-ai';
          }
          if (id.includes('node_modules/openai/')) {
            return 'vendor-openai';
          }

          // Japanese text processing (lazy loaded, but keep together when needed)
          if (id.includes('kuroshiro') || id.includes('kuromoji')) {
            return 'vendor-japanese';
          }

          // Markdown rendering (lazy loaded)
          if (id.includes('marked') || id.includes('react-markdown')) {
            return 'vendor-markdown';
          }

          // Image processing (lazy loaded)
          if (id.includes('html5-qrcode') || id.includes('node_modules/qrcode/')) {
            return 'vendor-qr';
          }
          if (id.includes('@jsquash/jpeg')) {
            return 'vendor-image';
          }

          // Audio processing (lazy loaded)
          if (id.includes('@remotion/whisper-web')) {
            return 'vendor-whisper';
          }

          // Utilities
          if (id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'vendor-css-utils';
          }
          if (id.includes('node_modules/zod/')) {
            return 'vendor-zod';
          }

          // Keep other node_modules together as vendor
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
        }
      }
    }
  },
});
