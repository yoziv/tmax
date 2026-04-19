#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const INSTALL_DIR = path.join(__dirname, "app");

function findExecutable() {
  if (!fs.existsSync(INSTALL_DIR)) {
    console.error("tmax is not installed. Run: npm rebuild tmax-terminal");
    process.exit(1);
  }

  const entries = fs.readdirSync(INSTALL_DIR);
  const platform = process.platform;

  if (platform === "win32") {
    // Look for tmax.exe in the extracted directory
    for (const entry of entries) {
      const exe = path.join(INSTALL_DIR, entry, "tmax.exe");
      if (fs.existsSync(exe)) return exe;
    }
    const flat = path.join(INSTALL_DIR, "tmax.exe");
    if (fs.existsSync(flat)) return flat;
  }

  if (platform === "darwin") {
    // Look for tmax.app/Contents/MacOS/tmax
    for (const entry of entries) {
      const app = path.join(INSTALL_DIR, entry, "tmax.app", "Contents", "MacOS", "tmax");
      if (fs.existsSync(app)) return app;
      // Also check flat structure
      const flat = path.join(INSTALL_DIR, entry, "Contents", "MacOS", "tmax");
      if (fs.existsSync(flat)) return flat;
    }
  }

  if (platform === "linux") {
    for (const entry of entries) {
      const bin = path.join(INSTALL_DIR, entry, "tmax");
      if (fs.existsSync(bin)) return bin;
    }
    const flat = path.join(INSTALL_DIR, "tmax");
    if (fs.existsSync(flat)) return flat;
  }

  console.error("Could not find tmax executable. Try reinstalling: npm rebuild tmax-terminal");
  process.exit(1);
}

const exe = findExecutable();

// Launch detached so the terminal is freed
const child = spawn(exe, process.argv.slice(2), {
  detached: true,
  stdio: "ignore",
});
child.unref();
