
"use strict";

function parseEngineOutput(raw) {
  const lines = raw.split(/\r?\n/);

  const stats = {
    totalPackets: 0,
    totalBytes: 0,
    forwarded: 0,
    dropped: 0,
  };

  const meta = {
    totalFps: 0,
  };

  const appBreakdown = [];
  const threads = [];
  const domains = [];

  function findNumber(regex) {
    const match = raw.match(regex);
    return match ? Number(match[1].replace(/,/g, "")) : 0;
  }

  // Packet and byte statistics
  stats.totalPackets = findNumber(
    /(\d[\d,]*)\s+packets/i
  );

  stats.totalBytes = findNumber(
    /(\d[\d,]*)\s+bytes/i
  );

  stats.forwarded = findNumber(
    /forwarded\s*[:=]?\s*(\d[\d,]*)/i
  );

  stats.dropped = findNumber(
    /dropped\s*[:=]?\s*(\d[\d,]*)/i
  );

  // Fast-path thread count
  const fpMatch = raw.match(
    /total\s+(\d+)\s+FPs?/i
  );

  if (fpMatch) {
    meta.totalFps = Number(fpMatch[1]);
  } else {
    const fpMatchAlt = raw.match(
      /(\d+)\s+fast[- ]path\s+threads?/i
    );

    if (fpMatchAlt) {
      meta.totalFps = Number(fpMatchAlt[1]);
    }
  }

  // Application breakdown
  // Expected examples:
  // HTTPS 39 (50.6%)
  // Unknown: 16
  const appRegex =
    /^\s*([A-Za-z][A-Za-z0-9_./ -]*?)\s*[:=]?\s+(\d[\d,]*)\s*\(\s*[\d.]+%\s*\)\s*$/;

  for (const line of lines) {
    const match = line.match(appRegex);

    if (match) {
      appBreakdown.push({
        app: match[1].trim(),
        count: Number(match[2].replace(/,/g, "")),
      });
    }
  }

  // Thread distribution
  // Supports common forms such as:
  // FP0 processed 53
  // LB0 dispatched 53
  const threadRegex =
    /^\s*(LB\d+|FP\d+)\s+(dispatched|processed)\s+(\d[\d,]*)/i;

  for (const line of lines) {
    const match = line.match(threadRegex);

    if (match) {
      threads.push({
        id: match[1],
        role: match[2].toLowerCase(),
        count: Number(match[3].replace(/,/g, "")),
      });
    }
  }

  // Domain/SNI extraction
  // Supports:
  // youtube.com -> YouTube
  // youtube.com: YouTube
  const domainRegex =
    /^\s*([A-Za-z0-9.-]+\.[A-Za-z]{2,})\s*(?:->|:)\s*([A-Za-z][A-Za-z0-9 /&._-]*)\s*$/;

  for (const line of lines) {
    const match = line.match(domainRegex);

    if (match) {
      domains.push({
        domain: match[1].trim(),
        app: match[2].trim(),
      });
    }
  }

  return {
    stats,
    meta,
    appBreakdown,
    threads,
    domains,
    raw,
  };
}

module.exports = { parseEngineOutput };