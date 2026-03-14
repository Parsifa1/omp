import { appendFileSync, chmodSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { createWriteStream } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { pipeline } from "stream/promises";
import { extract as tarExtract } from "tar";
import { createGunzip } from "zlib";

const DEBUG = process.env.COMMENT_CHECKER_DEBUG === "1";
const DEBUG_FILE = join(tmpdir(), "comment-checker-debug.log");

function debugLog(...args: unknown[]) {
  if (DEBUG) {
    const msg = `[${new Date().toISOString()}] [comment-checker:downloader] ${
      args.map(a => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" ")
    }\n`;
    appendFileSync(DEBUG_FILE, msg);
  }
}

const REPO = "code-yeongyu/go-claude-code-comment-checker";

interface PlatformInfo {
  os: string;
  arch: string;
  ext: "tar.gz" | "zip";
}

const PLATFORM_MAP: Record<string, PlatformInfo> = {
  "darwin-arm64": { os: "darwin", arch: "arm64", ext: "tar.gz" },
  "darwin-x64": { os: "darwin", arch: "amd64", ext: "tar.gz" },
  "linux-arm64": { os: "linux", arch: "arm64", ext: "tar.gz" },
  "linux-x64": { os: "linux", arch: "amd64", ext: "tar.gz" },
  "win32-x64": { os: "windows", arch: "amd64", ext: "zip" },
};

/**
 * Get the cache directory for oh-my-pi binaries.
 */
export function getCacheDir(): string {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || process.env.APPDATA;
    const base = localAppData || join(homedir(), "AppData", "Local");
    return join(base, "oh-my-pi", "bin");
  }

  const xdgCache = process.env.XDG_CACHE_HOME;
  const base = xdgCache || join(homedir(), ".cache");
  return join(base, "oh-my-pi", "bin");
}

/**
 * Get the binary name based on platform.
 */
export function getBinaryName(): string {
  return process.platform === "win32" ? "comment-checker.exe" : "comment-checker";
}

/**
 * Get the cached binary path if it exists.
 */
export function getCachedBinaryPath(): string | null {
  const cacheDir = getCacheDir();
  const binaryName = getBinaryName();
  const binaryPath = join(cacheDir, binaryName);
  return existsSync(binaryPath) ? binaryPath : null;
}

/**
 * Ensure cache directory exists.
 */
function ensureCacheDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Download file from URL to destination.
 */
async function downloadFile(url: string, dest: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error("Response body is null");
  }

  const fileStream = createWriteStream(dest);
  await pipeline(response.body as any, fileStream);
}

/**
 * Extract tar.gz archive.
 */
async function extractTarGz(archivePath: string, destDir: string): Promise<void> {
  await tarExtract({
    file: archivePath,
    cwd: destDir,
  });
}

/**
 * Extract zip archive (basic implementation for Windows).
 */
// @ts-ignore - adm-zip has no type definitions
async function extractZip(archivePath: string, destDir: string): Promise<void> {
  // For Windows, we need a zip extractor
  // Using a simple approach with unzipper or similar
  const AdmZip = (await import("adm-zip")).default;
  const zip = new AdmZip(archivePath);
  zip.extractAllTo(destDir, true);
}

/**
 * Set executable permission on Unix.
 */
function ensureExecutable(filePath: string): void {
  if (process.platform !== "win32") {
    try {
      chmodSync(filePath, 0o755);
    } catch (err) {
      debugLog("Failed to chmod:", err);
    }
  }
}

/**
 * Clean up archive file.
 */
function cleanupArchive(archivePath: string): void {
  try {
    unlinkSync(archivePath);
  } catch (err) {
    debugLog("Failed to cleanup archive:", err);
  }
}

/**
 * Get the version from package.json (fallback to hardcoded).
 */
function getPackageVersion(): string {
  return "0.4.1";
}

/**
 * Download the comment-checker binary from GitHub Releases.
 * Returns the path to the downloaded binary, or null on failure.
 */
export async function downloadCommentChecker(): Promise<string | null> {
  const platformKey = `${process.platform}-${process.arch}`;
  const platformInfo = PLATFORM_MAP[platformKey];

  if (!platformInfo) {
    debugLog(`Unsupported platform: ${platformKey}`);
    return null;
  }

  const cacheDir = getCacheDir();
  const binaryName = getBinaryName();
  const binaryPath = join(cacheDir, binaryName);

  // Already exists in cache
  if (existsSync(binaryPath)) {
    debugLog("Binary already cached at:", binaryPath);
    return binaryPath;
  }

  const version = getPackageVersion();
  const { os, arch, ext } = platformInfo;
  const assetName = `comment-checker_v${version}_${os}_${arch}.${ext}`;
  const downloadUrl = `https://github.com/${REPO}/releases/download/v${version}/${assetName}`;

  debugLog(`Downloading from: ${downloadUrl}`);
  console.log(`[oh-my-pi] Downloading comment-checker binary...`);

  try {
    ensureCacheDir(cacheDir);

    const archivePath = join(cacheDir, assetName);
    await downloadFile(downloadUrl, archivePath);

    debugLog(`Downloaded archive to: ${archivePath}`);

    // Extract based on file type
    if (ext === "tar.gz") {
      debugLog("Extracting tar.gz:", archivePath, "to", cacheDir);
      await extractTarGz(archivePath, cacheDir);
    } else {
      await extractZip(archivePath, cacheDir);
    }

    cleanupArchive(archivePath);
    ensureExecutable(binaryPath);

    debugLog(`Successfully downloaded binary to: ${binaryPath}`);
    debugLog(`[oh-my-pi] comment-checker binary ready.`);

    return binaryPath;
  } catch (err) {
    debugLog(`Failed to download: ${err}`);
    console.error(`[oh-my-pi] Failed to download comment-checker: ${err instanceof Error ? err.message : err}`);
    console.log(`[oh-my-pi] Comment checking disabled.`);
    return null;
  }
}

/**
 * Ensure the comment-checker binary is available.
 * First checks cache, then downloads if needed.
 * Returns the binary path or null if unavailable.
 */
export async function ensureCommentCheckerBinary(): Promise<string | null> {
  const cachedPath = getCachedBinaryPath();
  if (cachedPath) {
    debugLog("Using cached binary:", cachedPath);
    return cachedPath;
  }

  return downloadCommentChecker();
}
