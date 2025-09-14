import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ES modules don't have a global __dirname. This creates a compatible version.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use current timestamp as version
const version = new Date().toISOString();

// Path to release notes file
const notesPath = path.join(__dirname, "../release-notes.txt");

// Read release notes if file exists
let whatsNew = "No details provided.";
if (fs.existsSync(notesPath)) {
  whatsNew = fs.readFileSync(notesPath, "utf-8").trim();
}

// Path to output version.json
const filePath = path.join(__dirname, "../public/version.json");

// Write JSON with version + release notes
fs.writeFileSync(
  filePath,
  JSON.stringify({ version, whatsNew }, null, 2),
  "utf-8"
);

console.log("✅ version.json updated:", version);
console.log("📢 What's New:");
console.log(whatsNew);
