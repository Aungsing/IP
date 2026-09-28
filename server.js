const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_RECORDS = 100;

// In-memory history (newest first). Resets whenever the server restarts.
const visitors = [];

// Render (and most hosts) put a proxy in front of the app.
// This makes req.ip use the client address from X-Forwarded-For.
app.set("trust proxy", true);
app.disable("x-powered-by");

function getClientIp(req) {
  let ip = req.ip || req.socket.remoteAddress || "unknown";
  // Turn "::ffff:203.0.113.5" into "203.0.113.5"
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip;
}

function recordVisit(entry) {
  visitors.unshift(entry);
  if (visitors.length > MAX_RECORDS) visitors.length = MAX_RECORDS;
}

// Current visitor's IP (also logs the visit)
app.get("/api/ip", (req, res) => {
  const entry = {
    ip: getClientIp(req),
    timestamp: new Date().toISOString(),
    userAgent: (req.get("user-agent") || "unknown").slice(0, 300),
  };
  recordVisit(entry);
  res.set("Cache-Control", "no-store");
  res.json(entry);
});

// Latest recorded visits (max 100)
app.get("/api/visitors", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(visitors);
});

// Frontend
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`IP Address Dashboard running on port ${PORT}`);
});
