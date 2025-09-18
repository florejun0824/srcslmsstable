import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      include: '**/*.{js,jsx,ts,tsx}', // Parse JSX in all JS/TS files
    }),
    nodePolyfills(),
  ],

  define: {
    QUOTE: JSON.stringify('"'),
  },

  resolve: {
    alias: {
      buffer: 'buffer/',
      '@': path.resolve(__dirname, 'src'),
    },
  },

  // --- MODIFIED SECTION ---
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
    // ✅ Explicitly include 'xmlbuilder2' to ensure Vite processes it from CommonJS to ESM
    include: ['xmlbuilder2'],
    
    // ⚡ You can keep excluding other heavy deps if needed, but the problematic one is removed.
    exclude: ['sheetjs-style'],
  },

  server: {
    port: 3000,
    open: true,
    hmr: { overlay: true },
  },

  build: {
    outDir: 'dist',
    sourcemap: false, // turn off source maps in prod (reduces memory)
    target: 'esnext',
    cssCodeSplit: true, // split CSS into smaller chunks
    rollupOptions: {
      output: {
        // ⚡ Split heavy deps into separate chunks
        manualChunks: {
          react: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
});