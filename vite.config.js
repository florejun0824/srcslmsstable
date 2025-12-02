import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      protocolImports: true, // allow "node:crypto"
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
  // --- ADD THIS SECTION ---
  server: {
    port: 5173,        // Force Vite to run on 5173
    strictPort: true,  // Stop if port is busy (don't switch to 5174)
    host: "127.0.0.1", // Force IPv4 (fixes ECONNRESET on macOS)
  },
});