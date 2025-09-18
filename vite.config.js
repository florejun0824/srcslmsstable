// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      include: '**/*.{js,jsx,ts,tsx}', // ✅ ensure JSX everywhere
    }),
    nodePolyfills({
      protocolImports: true,
      include: ['buffer', 'process', 'stream'], // ✅ polyfill streams & buffer
    }),
  ],

  define: {
    global: 'globalThis', // ✅ fixes packages expecting Node `global`
    'process.env': {},    // ✅ prevents "process is not defined"
    QUOTE: JSON.stringify('"'),
  },

  resolve: {
    alias: {
      buffer: 'buffer/',
      stream: 'stream-browserify', // ✅ shim Node stream
      '@': path.resolve(__dirname, 'src'),
    },
  },

  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
    // ✅ ensure ESM conversion for CJS deps
    include: [
      'xmlbuilder2',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'stream-browserify',
      'readable-stream',
    ],
    exclude: ['sheetjs-style'],
  },

  server: {
    port: 3000,
    open: true,
    hmr: { overlay: true },
  },

  build: {
    outDir: 'dist',
    sourcemap: false, // ✅ faster prod builds
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
});
