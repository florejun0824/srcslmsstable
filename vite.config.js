import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      buffer: "buffer",
      process: "process/browser",
      stream: "stream-browserify",
      crypto: "crypto-browserify",
      util: "util",
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
  build: {
    rollupOptions: {
      external: [
        "buffer",
        "process",
        "stream",
        "crypto",
        "util",
      ],
    },
  },
});
