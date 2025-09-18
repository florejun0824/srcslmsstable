import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      protocolImports: true, // allow node:crypto etc.
      include: ["buffer", "stream", "crypto", "util"], // no process import
    }),
  ],

  define: {
    global: "globalThis",
    "process.env": { NODE_ENV: JSON.stringify(process.env.NODE_ENV || "development") },
    QUOTE: JSON.stringify('"'), // SheetJS fallback
  },

  resolve: {
    alias: {
      buffer: "buffer/",
      stream: "stream-browserify",
      crypto: "crypto-browserify",
      util: "util/",
      process: "process/browser",
      "@": path.resolve(__dirname, "src"),
    },
  },

  optimizeDeps: {
    esbuildOptions: {
      define: { global: "globalThis" },
      // Inject polyfills first
      inject: [path.resolve(__dirname, "src/polyfills.js")],
    },
    include: [
      "readable-stream",
      "stream-browserify",
      "crypto-browserify",
      "buffer",
      "util",
      "process/browser",
    ],
  },

  build: {
    target: "esnext",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
        },
      },
    },
  },

  server: {
    port: 3000,
    open: true,
    hmr: { overlay: true },
  },
});
