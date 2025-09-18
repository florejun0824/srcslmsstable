import process from "process";
import { Buffer } from "buffer";

// ✅ Node.js globals
if (typeof globalThis.global === "undefined") globalThis.global = globalThis;
if (typeof globalThis.Buffer === "undefined") globalThis.Buffer = Buffer;
if (typeof globalThis.process === "undefined") globalThis.process = process;

// ✅ Quote for SheetJS
if (typeof globalThis.QUOTE === "undefined") globalThis.QUOTE = '"';
