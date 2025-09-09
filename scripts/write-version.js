// scripts/write-version.js
const fs = require("fs");
const path = require("path");

// Use current timestamp (or commit hash if you want)
const version = new Date().toISOString();

const filePath = path.join(__dirname, "../public/version.json");
fs.writeFileSync(filePath, JSON.stringify({ version }, null, 2));

console.log("✅ version.json updated:", version);
