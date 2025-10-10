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
        manualChunks: {
          // Separate vendor chunks for better caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': [
            'lucide-react',
            '@radix-ui/react-select',
            '@radix-ui/react-switch',
            '@radix-ui/react-toast',
            'react-dropzone'
          ],
          'vendor-ai': ['ai', '@ai-sdk/openai', '@ai-sdk/openai-compatible', 'openai'],
          'vendor-japanese': ['kuroshiro', 'kuroshiro-analyzer-kuromoji', 'kuromoji'],
          'vendor-markdown': ['marked', 'react-markdown'],
          'vendor-misc': ['html5-qrcode', 'qrcode', 'clsx', 'tailwind-merge', 'zod'],
        }
      }
    }
  },
});
