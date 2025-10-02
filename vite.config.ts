import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import UnoCSS from '@unocss/vite';
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
    }
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
