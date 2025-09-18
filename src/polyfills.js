// src/polyfills.js
// ✅ Must be imported first in index.jsx

// Buffer
import { Buffer } from "buffer";
if (typeof globalThis.Buffer === "undefined") globalThis.Buffer = Buffer;

// process
if (typeof globalThis.process === "undefined") {
  globalThis.process = {
    env: {
      NODE_ENV: import.meta.env.MODE || "development",
    },
    // optional stubs for process methods that some libraries check
    nextTick: (cb, ...args) => Promise.resolve().then(() => cb(...args)),
    cwd: () => "/",
    version: "",
    versions: {},
  };
}

// QUOTE for SheetJS
if (typeof globalThis.QUOTE === "undefined") globalThis.QUOTE = '"';

// global fallback
if (typeof globalThis.global === "undefined") globalThis.global = globalThis;

// crypto shim (only if needed by libraries using crypto-browserify)
import crypto from "crypto-browserify";
if (typeof globalThis.crypto === "undefined") globalThis.crypto = crypto;
