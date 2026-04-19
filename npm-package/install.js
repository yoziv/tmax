#!/usr/bin/env node
"use strict";

const https = require("https");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const VERSION = require("./package.json").version;
const REPO = "InbarR/tmax";
const INSTALL_DIR = path.join(__dirname, "app");

function getAssetName() {
  const platform = process.platform;
  const arch = process.arch === "arm64" ? "arm64" : "x64";

  if (platform === "win32") return `tmax-win32-${arch}-${VERSION}.zip`;
  if (platform === "darwin") return `tmax-darwin-${arch}-${VERSION}.zip`;
  if (platform === "linux") return `tmax-linux-${arch}-${VERSION}.zip`;
  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "tmax-npm" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed: HTTP ${res.statusCode} from ${url}`));
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function extractZip(zipBuffer, dest) {
  const zipPath = path.join(__dirname, "_tmp_tmax.zip");
  fs.writeFileSync(zipPath, zipBuffer);
  fs.mkdirSync(dest, { recursive: true });

  try {
    if (process.platform === "win32") {
      execSync(`powershell -NoProfile -Command "Expand-Archive -Force -Path '${zipPath}' -DestinationPath '${dest}'"`, { stdio: "pipe" });
    } else {
      execSync(`unzip -o -q "${zipPath}" -d "${dest}"`, { stdio: "pipe" });
    }
  } finally {
    try { fs.unlinkSync(zipPath); } catch {}
  }
}

async function main() {
  // Skip if already installed
  if (fs.existsSync(INSTALL_DIR) && fs.readdirSync(INSTALL_DIR).length > 0) {
    console.log("tmax already installed, skipping download.");
    return;
  }

  const asset = getAssetName();
  const url = `https://github.com/${REPO}/releases/download/v${VERSION}/${asset}`;

  console.log(`Downloading tmax v${VERSION} for ${process.platform}-${process.arch}...`);
  const data = await download(url);

  console.log("Extracting...");
  extractZip(data, INSTALL_DIR);

  // Make executable on unix
  if (process.platform !== "win32") {
    const appDir = path.join(INSTALL_DIR, fs.readdirSync(INSTALL_DIR)[0] || "");
    const bin = path.join(appDir, "tmax");
    if (fs.existsSync(bin)) {
      fs.chmodSync(bin, 0o755);
    }
  }

  console.log("tmax installed successfully!");
}

main().catch((err) => {
  console.error("Failed to install tmax:", err.message);
  process.exit(1);
});
