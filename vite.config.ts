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
      name: 'kuromoji-dict-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
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
      registerType: 'autoUpdate',
      includeAssets: ['kuromoji/dict/*.gz'],
      pwaAssets: {
        preset: 'minimal-2023',
        image: 'public/icon.png',
        overrideManifestIcons: true,
      },
      manifest: {
        name: 'tabitomo - AI-Powered Translator',
        short_name: 'tabitomo',
        description: 'AI-powered multilingual translator with text, audio, and image input support',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
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
  },
});
