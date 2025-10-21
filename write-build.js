const fs = require("fs");
const path = require("path");

const buildFile = path.join(__dirname, "public", "build.json");

const data = {
  status: "ready", // when deployed, it's ready
  timestamp: new Date().toISOString(),
};

fs.writeFileSync(buildFile, JSON.stringify(data, null, 2));
console.log("✅ build.json written:", data);
