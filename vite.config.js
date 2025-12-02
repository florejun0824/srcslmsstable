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
      '@': path.resolve(__dirname, './src'), // <-- This is the safe line we are adding
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
});