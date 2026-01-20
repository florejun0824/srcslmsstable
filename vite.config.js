import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { VitePWA } from "vite-plugin-pwa";
import viteCompression from 'vite-plugin-compression';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import path from "path";

export default defineConfig({
  plugins: [
    // Million.js removed to prevent 'React not defined' errors
    
    // 1. React SWC: Fast Rust-based compiler (Major speed boost)
    react(),

    // 2. Node Polyfills
    nodePolyfills({
      protocolImports: true,
    }),

    // 3. PWA: Offline capabilities
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.js',
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false, 
      devOptions: {
        enabled: true
      },
      injectManifest: {
        // INCREASED LIMIT: 15MB to handle 3D models, PDFs, and audio files
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        // EXPLICIT PATTERNS: Ensure these file types are definitely cached
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2,ttf,glb,mp3}'],
      }
    }),

    // 4. Gzip Compression
    viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
    }),

    // 5. Image Optimizer
    ViteImageOptimizer({
        png: { quality: 80 },
        jpeg: { quality: 80 },
        webp: { quality: 80 },
        svg: {
            multipass: true,
            plugins: [
                {
                    name: 'preset-default',
                    params: {
                        overrides: {
                            removeViewBox: false,
                        },
                    },
                },
            ],
        },
    }),
  ],
  resolve: {
    alias: {
      buffer: "buffer",
      process: "process/browser",
      stream: "stream-browserify",
      crypto: "crypto-browserify",
      util: "util",
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/functions'],
          'vendor-ui': ['@headlessui/react', '@heroicons/react', 'framer-motion'],
          'vendor-3d': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-utils': ['pdfjs-dist', 'xlsx', 'mammoth', 'jspdf', 'html2canvas']
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      "readable-stream",
      "crypto-browserify",
      "stream-browserify",
      "buffer",
      "process/browser",
      "util",
    ],
  },
  define: {
    global: "globalThis",
  },
});